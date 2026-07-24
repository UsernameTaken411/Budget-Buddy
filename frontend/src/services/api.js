// The only way to talk to the FastAPI backend.
// Attaches the access token, prefixes /api, parses JSON, throws ApiError.
//
// Owner: Person A. B and C: never build fetch headers yourself — if the token
// handling changes, it changes here once and you get it for free.
//
//   import { apiFetch, ApiError } from "../services/api";
//
//   const page = await apiFetch("/transactions?start_date=2026-03-01&limit=500");
//   await apiFetch("/budgets", { method: "POST", body: { category: "food", amount: 400 } });
//
// Note `body` takes a plain object and is JSON-stringified for you.
// Pass a FormData instance instead for file uploads and it is sent as-is.
//
// Token source: localStorage, via authStorage.js — not the Supabase SDK.
// See auth.jsx for why (the frontend calls our backend for signin/signup,
// not Supabase directly). On a 401 this tries one silent refresh with the
// stored refresh token before giving up, so a merely-expired access token
// doesn't bounce the user to /login mid-session.

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./authStorage";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.access_token) return null;

    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function buildRequest(body, headers) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return {
    isFormData,
    headers: {
      ...(isFormData ? {} : body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  };
}

export async function apiFetch(path, options = {}) {
  const { body, headers = {}, ...rest } = options;

  let token = getAccessToken();
  if (!token) {
    throw new ApiError(401, "Not signed in.");
  }

  const req = buildRequest(body, headers);

  let res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${token}`, ...req.headers },
    body: req.body,
  });

  if (res.status === 401) {
    token = await tryRefresh();
    if (token) {
      res = await fetch(`${BASE}${path}`, {
        ...rest,
        headers: { Authorization: `Bearer ${token}`, ...req.headers },
        body: req.body,
      });
    }
  }

  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401) clearTokens(); // stale/expired past the retry above — log out
    throw new ApiError(res.status, payload?.detail ?? res.statusText);
  }

  return payload;
}

// Convenience: page through a filtered range until you have everything.
// C's monthly aggregation and B's budget-vs-actual both want this.
export async function fetchAllTransactions(query = "") {
  const sep = query ? "&" : "";
  const items = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await apiFetch(
      `/transactions?${query}${sep}limit=500&offset=${offset}`
    );
    items.push(...page.items);
    total = page.total;
    if (page.items.length === 0) break;
    offset += page.items.length;
  }

  return items;
}
