// Session context. Wrap <App/> in <AuthProvider> once, in main.jsx.
// Everyone else just calls useAuth().
//
// Owner: Person A.
//
//   const { session, user, loading, signIn, signUp, signOut } = useAuth();
//
// `loading` is true only during the initial session restore on page load.
// Render a spinner on it — if you render your page before it resolves you will
// flash the login screen at an already-authenticated user on every refresh.
//
// Team decision: the frontend does not call Supabase directly for auth
// anymore. signIn/signUp call our own backend (/api/auth/*), which calls
// Supabase and hands back tokens. Those tokens live in localStorage (see
// authStorage.js) — `session`/`user` here are just a read of that storage,
// kept in the same shape as before so ProtectedRoute/Layout/Profile don't
// need to change.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./authStorage";

const AuthContext = createContext(null);

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// Builds the same shape the old supabase-js session had (access_token,
// refresh_token, user: { id, email }) purely so existing consumers
// (ProtectedRoute checks truthiness, Layout/Profile read user.email) keep
// working unchanged. The claims come from decoding the JWT locally — that's
// display-only; the backend still verifies the signature on every request.
function sessionFromStorage() {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  const claims = decodeJwt(accessToken);
  if (!claims) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;

  return {
    access_token: accessToken,
    refresh_token: getRefreshToken(),
    expires_at: claims.exp,
    user: { id: claims.sub, email: claims.email },
  };
}

async function postAuth(path, body) {
  const res = await fetch(`${BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const error = new Error(data?.detail || "Request failed.");
    error.status = res.status;
    throw error;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function sync() {
      setSession(sessionFromStorage());
    }

    sync();
    setLoading(false);

    // Picks up refreshes triggered from api.js, plus sign-out in another tab.
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,

      async signUp(email, password, displayName = "") {
        const data = await postAuth("signup", {
          email,
          password,
          display_name: displayName,
        });

        if (!data.access_token) {
          // "Confirm email" is ON in Supabase — account exists, no session yet.
          return { session: null, user: data.user };
        }

        setTokens(data.access_token, data.refresh_token);
        return { session: sessionFromStorage(), user: data.user };
      },

      async signIn(email, password) {
        const data = await postAuth("login", { email, password });
        setTokens(data.access_token, data.refresh_token);
        return { session: sessionFromStorage(), user: data.user };
      },

      async signOut() {
        clearTokens();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>. Check main.jsx.");
  }
  return ctx;
}
