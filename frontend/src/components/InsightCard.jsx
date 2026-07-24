const SEVERITY_STYLES = {
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
  positive: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export default function InsightCard({ insight }) {
  const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
  return <div className={`rounded-lg border px-4 py-3 text-sm ${style}`}>{insight.message}</div>;
}
