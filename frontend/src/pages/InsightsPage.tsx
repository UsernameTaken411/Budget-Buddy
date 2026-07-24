import { Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../services/api";

type Message = { role: "assistant" | "user"; text: string };

export function InsightsPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Ask me about your balance, biggest spending category, or budget health." }]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  async function ask(event: FormEvent) {
    event.preventDefault(); if (!question.trim() || loading) return;
    const text = question.trim(); setQuestion(""); setMessages(current => [...current, { role: "user", text }]); setLoading(true);
    try {
      const result = await api<{ answer: string }>("/insights/ask", { method: "POST", body: JSON.stringify({ question: text }) });
      setMessages(current => [...current, { role: "assistant", text: result.answer }]);
    } catch (error) {
      setMessages(current => [...current, { role: "assistant", text: error instanceof Error ? error.message : "I could not read your data." }]);
    } finally { setLoading(false); }
  }
  return <div className="mx-auto max-w-3xl space-y-7"><div><p className="eyebrow">Private insights</p><h1 className="page-title">Ask Budget Buddy</h1><p className="page-copy">Answers are calculated from your saved totals without sending your transaction history to a third-party AI.</p></div>
    <div className="card flex min-h-[560px] flex-col p-5"><div className="flex-1 space-y-4 overflow-auto p-2">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-emerald-400 text-[#07100d]" : "border border-white/[0.07] bg-white/[0.035] text-slate-300"}`}>{message.role === "assistant" && <Sparkles className="mb-2 text-emerald-300" size={16} />}{message.text}</div></div>)}{loading && <p className="text-sm text-slate-500">Checking your records…</p>}</div>
      <form onSubmit={ask} className="mt-5 flex gap-3 border-t border-white/[0.06] pt-5"><input className="field flex-1" value={question} onChange={e => setQuestion(e.target.value)} placeholder="How much have I spent?" /><button className="btn-primary px-4" aria-label="Ask"><Send size={18} /></button></form>
    </div></div>;
}
