// Owner: Person C. Uses apiFetch (services/api.js) like every other vertical
// - never builds Authorization headers by hand.

import { apiFetch } from "./api";

export async function askBudgetAi(question) {
  const data = await apiFetch("/insights/ask", {
    method: "POST",
    body: { question },
  });
  return data.answer;
}
