import { api, isPreviewMode } from "./api";
import { fixtureTransactions } from "../data/fixtures";
import type { Transaction } from "../types";

// Person A owns /api/transactions; it doesn't exist yet, and api.ts's demo
// fallback doesn't know this domain. Until then, fall back to fixtures
// (matching the real transactions schema) so this vertical works standalone.
export async function getTransactions(): Promise<Transaction[]> {
  if (isPreviewMode()) return fixtureTransactions;
  try {
    return await api<Transaction[]>("/transactions");
  } catch (err) {
    console.warn("[transactionsApi] falling back to fixtures:", err);
    return fixtureTransactions;
  }
}
