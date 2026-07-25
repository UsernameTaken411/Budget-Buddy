import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Demo from "./pages/Demo.jsx";
import Transactions from "./pages/Transactions.jsx";
import Profile from "./pages/Profile.jsx";
import Budgets from "./pages/Budgets.jsx";
import Savings from "./pages/Savings.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import ReceiptScan from "./pages/ReceiptScan.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Chat from "./pages/Chat.jsx";

// B and C: add your routes inside the ProtectedRoute block, next to
// /transactions. The nav links live in components/Layout.jsx.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/demo" element={<Demo />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/receipts/scan" element={<ReceiptScan />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/transactions" replace />} />
      <Route path="*" element={<Navigate to="/transactions" replace />} />
    </Routes>
  );
}
