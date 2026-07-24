import type { AuthSession } from "../types";
import { ApiError } from "./api";

const API_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8001/api`;
const ACCESS_KEY = "budget_buddy_access_token";
const REFRESH_KEY = "budget_buddy_refresh_token";

async function request(path: string, body: object): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.detail ?? "Authentication failed.");
  if (!data.access_token) {
    throw new ApiError("Account created. Confirm the email from Supabase, then sign in.");
  }
  localStorage.setItem(ACCESS_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  return data;
}

export const auth = {
  login: (email: string, password: string) => request("/login", { email, password }),
  signup: (email: string, password: string, full_name: string) =>
    request("/signup", { email, password, display_name: full_name }),
  logout: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isSignedIn: () => Boolean(localStorage.getItem(ACCESS_KEY)),
};
