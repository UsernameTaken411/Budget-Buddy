import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../services/auth.jsx";

// Shared chrome for every signed-in page. B and C: add your nav links to the
// LINKS array below rather than building your own header.
const LINKS = [
  { to: "/transactions", label: "Transactions" },
  // { to: "/budgets", label: "Budgets" },      B
  { to: "/dashboard", label: "Dashboard" },
  { to: "/chat", label: "Ask AI" },
  { to: "/profile", label: "Profile" },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Finance
          </span>

          <nav className="flex gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
