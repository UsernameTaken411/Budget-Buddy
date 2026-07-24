import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BudgetsPage } from "./pages/BudgetsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/budgets" replace />} />
        <Route path="/budgets" element={<BudgetsPage />} />
      </Route>
    </Routes>
  );
}
