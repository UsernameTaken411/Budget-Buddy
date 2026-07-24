import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Transactions from "./pages/Transactions.jsx";
import Profile from "./pages/Profile.jsx";

// B and C: add your routes inside the ProtectedRoute block, next to
// /transactions. The nav links live in components/Layout.jsx.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/budgets" element={<Budgets />} />   B */}
          {/* <Route path="/dashboard" element={<Dashboard />} /> C */}
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/transactions" replace />} />
      <Route path="*" element={<Navigate to="/transactions" replace />} />
    </Routes>
  );
}
