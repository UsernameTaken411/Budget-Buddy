// Single Supabase client for the whole app.
// Do NOT call createClient() anywhere else — multiple clients means multiple
// competing session listeners and you will get random logouts on refresh.
//
// Owner: Person A. Import this, don't fork it.
//
// NOT currently used by auth.jsx or api.js — the frontend goes through the
// backend for signin/signup/API calls now (see auth.jsx, authStorage.js).
// Kept here for the day someone needs a direct Supabase feature (e.g.
// Storage, Realtime) from the browser. If you do reach for it, you'll need
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY back in .env.example — they were
// removed since nothing reads them right now.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
