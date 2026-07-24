import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatAmount } from "../../services/categories";

export default function SpendingByCategoryChart({ data }) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">No spending yet this period.</p>;
  }
  const labeled = data.map((d) => ({ ...d, label: CATEGORY_LABELS[d.category] ?? d.category }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={labeled} dataKey="amount" nameKey="label" outerRadius={80} label>
          {labeled.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatAmount(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
