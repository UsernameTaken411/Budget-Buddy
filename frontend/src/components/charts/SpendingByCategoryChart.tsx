import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpend } from "../../utils/finance";

const COLORS = ["#34d399", "#38bdf8", "#fbbf24", "#f87171", "#a78bfa", "#f472b6"];

export function SpendingByCategoryChart({ data }: { data: CategorySpend[] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">No spending yet this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="category" outerRadius={80} label>
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={{ background: "#121816", border: "1px solid rgba(255,255,255,0.1)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
