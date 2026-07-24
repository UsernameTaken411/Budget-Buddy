export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  period: "monthly";
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  progress_percent: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  monthly_cost: number;
  billing_cycle: "weekly" | "monthly" | "quarterly" | "yearly";
  next_billing_date: string;
  category: string;
  reminder_days_before: number;
  is_active: boolean;
}

export interface ReceiptExtraction {
  merchant: string;
  amount: number;
  transaction_date: string | null;
  category: "Food" | "Transport" | "Shopping" | "Groceries" | "Entertainment" | "Health" | "Housing" | "Utilities" | "Travel" | "Education" | "Other";
  currency: string;
  confidence: number;
  notes: string;
  recommended_budget_category?: string | null;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  transaction_date: string | null;
  category: string;
  transaction_type: "income" | "expense";
  currency: string;
  notes?: string;
  source?: string;
}

export interface Profile {
  id?: string;
  full_name: string;
  email: string;
  currency: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
}
