const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {}

const demoSeed = {
  budgets: [
    { id: "demo-budget-1", category: "Dining", amount: 450, spent: 318.4, remaining: 131.6, period: "monthly" },
    { id: "demo-budget-2", category: "Transport", amount: 220, spent: 96.8, remaining: 123.2, period: "monthly" },
    { id: "demo-budget-3", category: "Shopping", amount: 300, spent: 327.2, remaining: 0, period: "monthly" },
  ],
  savings: [
    { id: "demo-goal-1", name: "Emergency fund", target_amount: 10000, current_amount: 6400, target_date: "2026-12-31", progress_percent: 64 },
    { id: "demo-goal-2", name: "Japan trip", target_amount: 3500, current_amount: 1120, target_date: "2027-03-15", progress_percent: 32 },
  ],
  subscriptions: [
    { id: "demo-sub-1", name: "Spotify", amount: 11.98, monthly_cost: 11.98, billing_cycle: "monthly", next_billing_date: nextDate(2), category: "Music", reminder_days_before: 3, is_active: true },
    { id: "demo-sub-2", name: "Netflix", amount: 25.98, monthly_cost: 25.98, billing_cycle: "monthly", next_billing_date: nextDate(9), category: "Entertainment", reminder_days_before: 3, is_active: true },
  ],
};

function nextDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function demoData<T>(path: string, options: RequestInit): T {
  if (path === "/receipts/confirm") {
    const payload = options.body ? JSON.parse(String(options.body)) : {};
    const storageKey = "budget_buddy_demo_transactions";
    const records = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const transaction = { ...payload, id: crypto.randomUUID(), source: "receipt" };
    records.unshift(transaction);
    localStorage.setItem(storageKey, JSON.stringify(records));
    return transaction as T;
  }
  const domain = path.startsWith("/budgets")
    ? "budgets"
    : path.startsWith("/savings-goals")
      ? "savings"
      : "subscriptions";
  const storageKey = `budget_buddy_demo_${domain}`;
  const records = JSON.parse(localStorage.getItem(storageKey) ?? JSON.stringify(demoSeed[domain]));
  const method = options.method ?? "GET";
  const id = path.split("/")[2];
  const payload = options.body ? JSON.parse(String(options.body)) : {};

  if (method === "GET") return records as T;
  if (method === "DELETE") {
    localStorage.setItem(storageKey, JSON.stringify(records.filter((item: { id: string }) => item.id !== id)));
    return undefined as T;
  }
  if (method === "POST" && path.endsWith("/contributions")) {
    const goal = records.find((item: { id: string }) => item.id === id);
    goal.current_amount = Number(goal.current_amount) + Number(payload.amount);
    goal.progress_percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
    localStorage.setItem(storageKey, JSON.stringify(records));
    return goal as T;
  }
  if (method === "POST") {
    const item = {
      ...payload,
      id: crypto.randomUUID(),
      ...(domain === "budgets" ? { spent: 0, remaining: payload.amount, period: "monthly" } : {}),
      ...(domain === "savings" ? { current_amount: payload.current_amount ?? 0, progress_percent: ((payload.current_amount ?? 0) / payload.target_amount) * 100 } : {}),
      ...(domain === "subscriptions" ? { monthly_cost: monthlyCost(payload.amount, payload.billing_cycle), is_active: true } : {}),
    };
    records.unshift(item);
    localStorage.setItem(storageKey, JSON.stringify(records));
    return item as T;
  }
  if (method === "PATCH") {
    const index = records.findIndex((item: { id: string }) => item.id === id);
    records[index] = { ...records[index], ...payload };
    localStorage.setItem(storageKey, JSON.stringify(records));
    return records[index] as T;
  }
  return undefined as T;
}

function monthlyCost(amount: number, cycle: string) {
  if (cycle === "weekly") return amount * 52 / 12;
  if (cycle === "quarterly") return amount / 3;
  if (cycle === "yearly") return amount / 12;
  return amount;
}

export const isPreviewMode = () => !localStorage.getItem("budget_buddy_access_token");

export async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem("budget_buddy_access_token");
  if (!token) {
    await new Promise(resolve => window.setTimeout(resolve, 1200));
    return {
      merchant: "The Daily Table",
      amount: 24.8,
      transaction_date: new Date().toISOString().slice(0, 10),
      category: "Food",
      currency: "SGD",
      confidence: 0.92,
      notes: "Local preview extraction — review before saving.",
    } as T;
  }
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail ?? "The receipt could not be scanned.");
  }
  return response.json();
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("budget_buddy_access_token");
  if (!token) {
    return demoData<T>(path, options);
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail ?? "Something went wrong. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
