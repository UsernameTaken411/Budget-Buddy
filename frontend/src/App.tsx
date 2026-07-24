import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SavingsPage } from "./pages/SavingsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { ReceiptScanPage } from "./pages/ReceiptScanPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { InsightsPage } from "./pages/InsightsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AuthPage } from "./pages/AuthPage";
import { auth } from "./services/auth";

function RequireAuth() {
  return auth.isSignedIn() ? <Layout /> : <Navigate to="/auth" replace />;
}

export default function App() {
  return <Routes><Route path="/auth" element={<AuthPage />} /><Route element={<RequireAuth />}><Route index element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/transactions" element={<TransactionsPage />} /><Route path="/receipts" element={<ReceiptScanPage />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/savings" element={<SavingsPage />} /><Route path="/subscriptions" element={<SubscriptionsPage />} /><Route path="/insights" element={<InsightsPage />} /><Route path="/profile" element={<ProfilePage />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes>;
}
