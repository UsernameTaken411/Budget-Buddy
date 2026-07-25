// Shared by Login.jsx's "Continue as a guest" button and Demo.jsx (the
// /demo QR-code landing page) — both create a brand-new, throwaway account
// per use rather than sharing one fixed demo login, so simultaneous guests
// never collide on the same data.
//
// Requires "Confirm email" to be OFF in Supabase: a made-up guest address
// can never receive or click a real confirmation link.
export function randomGuest() {
  const id = (
    crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  ).replace(/[^a-z0-9]/gi, "");
  return {
    email: `guest-${id}@budgetbuddy.demo`,
    password: `Guest-${id}-${Date.now()}`,
  };
}
