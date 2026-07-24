// Canonical category vocabulary — see SCHEMA.md §2.
// Import these. Do not retype the array in your own file; if it drifts,
// B's budget joins and C's chart groupings silently stop matching.
//
// Owner: Person A. Adding a value requires a DB migration + team announcement.

export const CATEGORIES = [
  "food",
  "transport",
  "groceries",
  "shopping",
  "bills",
  "entertainment",
  "health",
  "education",
  "travel",
  "income",
  "transfer",
  "other",
];

export const CATEGORY_LABELS = {
  food: "Food & Dining",
  transport: "Transport",
  groceries: "Groceries",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  entertainment: "Entertainment",
  health: "Health",
  education: "Education",
  travel: "Travel",
  income: "Income",
  transfer: "Transfer",
  other: "Other",
};

// Stable colours so the same category is the same colour in every chart.
export const CATEGORY_COLORS = {
  food: "#ef4444",
  transport: "#f97316",
  groceries: "#eab308",
  shopping: "#ec4899",
  bills: "#8b5cf6",
  entertainment: "#06b6d4",
  health: "#10b981",
  education: "#3b82f6",
  travel: "#14b8a6",
  income: "#22c55e",
  transfer: "#94a3b8",
  other: "#6b7280",
};

export const isValidCategory = (c) => CATEGORIES.includes(c);
export const labelFor = (c) => CATEGORY_LABELS[c] ?? "Other";

// ---- Sign convention helpers (SCHEMA.md §1) -------------------------------
// Expenses are NEGATIVE, income is POSITIVE. Use these rather than abs().

export const isExpense = (t) => t.amount < 0;
export const isIncome = (t) => t.amount > 0;

/** Positive spend magnitude, or 0 if this row is income. */
export const spend = (t) => (t.amount < 0 ? -t.amount : 0);

/** Positive income magnitude, or 0 if this row is an expense. */
export const income = (t) => (t.amount > 0 ? t.amount : 0);

/** Rows that count toward "spending" — excludes income and internal transfers. */
export const isSpendRow = (t) => t.amount < 0 && t.category !== "transfer";

/** { food: 231.40, transport: 88.00, ... } — positive magnitudes. */
export function totalsByCategory(transactions) {
  const out = {};
  for (const t of transactions) {
    if (!isSpendRow(t)) continue;
    out[t.category] = (out[t.category] ?? 0) + spend(t);
  }
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 100) / 100;
  return out;
}

/** Net cashflow — income minus spending, transfers included as written. */
export const netCashflow = (transactions) =>
  Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;

export function formatAmount(amount, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    signDisplay: "auto",
  }).format(amount);
}
