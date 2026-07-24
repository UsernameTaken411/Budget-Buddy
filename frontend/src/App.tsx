import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SavingsPage } from "./pages/SavingsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { ReceiptScanPage } from "./pages/ReceiptScanPage";

export default function App() {
  return <Routes><Route element={<Layout />}><Route index element={<Navigate to="/receipts" replace />} /><Route path="/receipts" element={<ReceiptScanPage />} /><Route path="/budgets" element={<BudgetsPage />} /><Route path="/savings" element={<SavingsPage />} /><Route path="/subscriptions" element={<SubscriptionsPage />} /></Route></Routes>;
}
