import { useState } from "react";
import { askBudgetAi } from "../services/insightsApi";

const STARTER_PROMPTS = [
  "Can I afford a $1,500 vacation next month?",
  "Which category am I overspending in?",
  "How does this month compare to last month?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm Budget Buddy. Ask me anything about your spending, budgets, or whether you can afford something.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send(question) {
    const text = question.trim();
    if (!text || pending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setPending(true);

    try {
      const answer = await askBudgetAi(text);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err.detail || err.message || "Something went wrong.", error: true },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex min-h-[320px] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-slate-900 text-white"
                : m.error
                  ? "bg-red-50 text-red-800"
                  : "bg-slate-100 text-slate-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && <div className="text-xs text-slate-400">Budget Buddy is thinking…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
