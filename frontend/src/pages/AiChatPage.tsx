import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { askBudgetAi } from "../services/aiService";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const STARTER_PROMPTS = [
  "Can I afford a $1,500 vacation next month?",
  "Which category am I overspending in?",
  "How does this month compare to last month?",
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I'm Budget Buddy. Ask me anything about your spending, budgets, or whether you can afford something.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setPending(true);

    try {
      const answer = await askBudgetAi(text);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: message, error: true }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="display text-2xl font-extrabold">Ask AI</h1>
        <p className="mt-1 text-sm text-slate-500">Grounded in your real transactions and budgets.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-400/10"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="card flex min-h-[320px] flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-emerald-400 text-[#07100d]"
                : m.error
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-white/[0.05] text-slate-200"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={13} className="animate-pulse" /> Budget Buddy is thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <input
          className="field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your spending…"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
