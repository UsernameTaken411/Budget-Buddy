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
  transaction_date: string;
  category: "Food" | "Transport" | "Shopping" | "Groceries" | "Entertainment" | "Health" | "Utilities" | "Travel" | "Education" | "Other";
  currency: string;
  confidence: number;
  notes: string;
}
