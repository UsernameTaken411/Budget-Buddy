// Single source of truth for where the Supabase access/refresh tokens live
// in the browser. Don't read/write localStorage directly anywhere else —
// import these, so the key names only exist in one place.
//
// Owner: Person A.

const TOKEN_KEY = "budget_buddy_access_token";
const REFRESH_KEY = "budget_buddy_refresh_token";

// api.js needs auth.jsx to notice when a token is set/cleared outside of
// signIn/signUp/signOut (e.g. a background refresh, or another tab signing
// out) without a direct import cycle between the two. A DOM event does that
// cheaply — auth.jsx listens for it and re-derives `session` from storage.
export const AUTH_CHANGED_EVENT = "budgetbuddy:auth-changed";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
