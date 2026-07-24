import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthTrend } from "../../utils/finance";

export function IncomeExpenseChart({ data }: { data: MonthTrend[] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">Not enough history yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} />
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={{ background: "#121816", border: "1px solid rgba(255,255,255,0.1)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" fill="#34d399" />
        <Bar dataKey="expenses" fill="#f87171" />
      </BarChart>
    </ResponsiveContainer>
  );
}
