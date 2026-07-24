// Route guard. Wrap anything that needs a session.
// Owner: Person A.
//
//   <Route element={<ProtectedRoute />}>
//     <Route path="/transactions" element={<TransactionsPage />} />
//     <Route path="/budgets" element={<BudgetsPage />} />
//   </Route>
//
// Renders a spinner while the initial session restore is in flight, so an
// already-authenticated user never sees a flash of the login page on refresh.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../services/auth";

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
