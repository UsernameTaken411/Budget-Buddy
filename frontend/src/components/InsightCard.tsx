import type { Insight } from "../types";

const SEVERITY_STYLES: Record<Insight["severity"], string> = {
  warning: "border-amber-300/20 bg-amber-300/[0.06] text-amber-200",
  info: "border-sky-300/20 bg-sky-300/[0.06] text-sky-200",
  positive: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200",
};

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${SEVERITY_STYLES[insight.severity]}`}>
      {insight.message}
    </div>
  );
}
