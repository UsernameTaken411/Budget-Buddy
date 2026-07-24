import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SavingsPage } from "./pages/SavingsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";

export default function App() {
  return <Routes><Route element={<Layout />}><Route index element={<Navigate to="/budgets" replace />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/savings" element={<SavingsPage />} /><Route path="/subscriptions" element={<SubscriptionsPage />} /></Route></Routes>;
}
