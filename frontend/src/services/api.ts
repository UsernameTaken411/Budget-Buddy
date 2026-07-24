const API_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8001/api`;
const ACCESS_KEY = "budget_buddy_access_token";
const REFRESH_KEY = "budget_buddy_refresh_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const session = await response.json();
  if (!session.access_token) {
    clearSession();
    return null;
  }
  localStorage.setItem(ACCESS_KEY, session.access_token);
  if (session.refresh_token) localStorage.setItem(REFRESH_KEY, session.refresh_token);
  return session.access_token;
}

async function authenticatedFetch(path: string, options: RequestInit, retry = true) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new ApiError("Sign in to access your synced financial data.", 401);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return authenticatedFetch(path, options, false);
    window.location.assign("/auth");
  }
  return response;
}

async function result<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail ?? fallback, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function upload<T>(path: string, formData: FormData): Promise<T> {
  const response = await authenticatedFetch(path, { method: "POST", body: formData });
  return result<T>(response, "The file could not be processed.");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await authenticatedFetch(path, { ...options, headers });
  return result<T>(response, "Something went wrong. Please try again.");
}
