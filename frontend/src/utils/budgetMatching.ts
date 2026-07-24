import type { Budget, ReceiptExtraction } from "../types";

const CATEGORY_TERMS: Record<ReceiptExtraction["category"], string[]> = {
  Food: ["food", "dining", "dine out", "eat out", "eating out", "restaurant", "restaurants", "meal", "meals", "cafe", "coffee", "takeaway", "fast food", "lunch", "dinner"],
  Groceries: ["grocery", "groceries", "supermarket", "food", "market", "household", "essentials"],
  Transport: ["transport", "transportation", "transit", "commute", "commuting", "taxi", "grab", "fuel", "petrol", "bus", "train", "mrt", "car"],
  Shopping: ["shopping", "retail", "clothes", "clothing", "personal", "fashion", "electronics"],
  Entertainment: ["entertainment", "movies", "cinema", "games", "gaming", "leisure", "fun", "hobbies"],
  Health: ["health", "medical", "doctor", "pharmacy", "medicine", "wellness", "dental", "clinic"],
  Housing: ["housing", "rent", "mortgage", "home", "lease", "property", "accommodation"],
  Utilities: ["utilities", "utility", "bills", "electricity", "water", "internet", "phone", "mobile", "telco"],
  Travel: ["travel", "holiday", "hotel", "flight", "vacation", "trip", "tourism"],
  Education: ["education", "school", "tuition", "books", "course", "learning", "study"],
  Other: ["other", "misc", "miscellaneous"],
};

const MERCHANT_TERMS: Array<[RegExp, string[]]> = [
  [/\bkfc\b|\bmcdonald'?s?\b|\bburger\s+king\b|\bsubway\b|\bdomino'?s\b|\bpizza\s+hut\b|\bstarbucks\b|\bcoffee\s+bean\b|\brestaurant\b|\bcafe\b/i, ["eat out", "dining", "restaurant", "fast food", "food"]],
  [/\bfair\s*price\b|\bfairprice\b|\bsheng\s+siong\b|\bcold\s+storage\b|\bgiant\b/i, ["grocery", "groceries", "supermarket", "food"]],
  [/\bcheers\b|\b7[\s-]*eleven\b/i, ["grocery", "groceries", "convenience", "food"]],
  [/\bgrab\b|\bgojek\b|\bcomfortdelgro\b/i, ["transport", "transportation", "taxi", "commute"]],
  [/\bsp\s+services\b|\bsingtel\b|\bstarhub\b|\bm1\b/i, ["utilities", "bills", "phone", "internet"]],
  [/\bguardian\b|\bwatsons?\b|\bunity\b|\bclinic\b|\bhospital\b|\bdental\b/i, ["health", "medical", "pharmacy", "wellness"]],
  [/\buniqlo\b|\bh&m\b|\bzara\b|\bcourts\b|\bharvey\s+norman\b|\bbest\s+denki\b/i, ["shopping", "retail", "clothing", "electronics"]],
];

export interface BudgetMatch {
  category: string;
  score: number;
}

export function findBestBudgetMatch(
  receipt: ReceiptExtraction,
  budgets: Budget[],
): BudgetMatch | null {
  const detectedTerms = new Set(CATEGORY_TERMS[receipt.category]);
  for (const [pattern, terms] of MERCHANT_TERMS) {
    if (pattern.test(receipt.merchant)) terms.forEach(term => detectedTerms.add(term));
  }

  let best: BudgetMatch | null = null;
  for (const budget of budgets) {
    const normalized = normalize(budget.category);
    const budgetWords = normalized.split(" ").filter(Boolean);
    let score = 0;

    for (const term of detectedTerms) {
      const normalizedTerm = normalize(term);
      if (normalized === normalizedTerm) score = Math.max(score, 100);
      else if (normalized.includes(normalizedTerm) || normalizedTerm.includes(normalized)) {
        score = Math.max(score, 82);
      } else if (budgetWords.some(word => word === normalizedTerm)) {
        score = Math.max(score, 72);
      }
    }

    if (!best || score > best.score) best = { category: budget.category, score };
  }
  return best && best.score >= 70 ? best : null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
