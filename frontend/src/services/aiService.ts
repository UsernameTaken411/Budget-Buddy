import { api, ApiError, isPreviewMode } from "./api";

// api.ts's demo-mode fallback only knows the budgets/savings/subscriptions
// domains, so we guard preview mode ourselves rather than let it silently
// route /insights/ask into the wrong fake data.
export async function askBudgetAi(question: string): Promise<string> {
  if (isPreviewMode()) {
    throw new ApiError("You need to be signed in to ask Budget Buddy a question.");
  }
  const data = await api<{ answer: string }>("/insights/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  return data.answer;
}
