import { BarChart3, FileSpreadsheet, Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, isPreviewMode } from "../services/api";

type Message = { role: "assistant" | "user"; text: string };
type Insight = { answer: string; summary: string; key_findings: string[]; recommendations: string[] };

export function InsightsPage() {
  const preview = isPreviewMode();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "I’m powered by Azure AI. Import your bank CSV, then ask about cash flow, recurring costs, categories, or budgets." }]);
  const [report, setReport] = useState<Insight | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(path: "/insights/ask" | "/insights/report", text: string) {
    setLoading(true); setError("");
    try {
      const history = messages.map(message => ({ role: message.role, content: message.text }));
      const result = await api<Insight>(path, { method: "POST", body: JSON.stringify({ question: text, history }) });
      setReport(result);
      setMessages(current => [...current, { role: "assistant", text: result.answer }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Azure AI could not create the analysis.");
    } finally { setLoading(false); }
  }
  async function ask(event: FormEvent) {
    event.preventDefault(); if (!question.trim() || loading || preview) return;
    const text = question.trim(); setQuestion("");
    setMessages(current => [...current, { role: "user", text }]);
    await run("/insights/ask", text);
  }

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Azure AI insights</p><h1 className="page-title">Financial analysis</h1><p className="page-copy">Azure analyses your saved bank transactions and budgets to produce evidence-based insights.</p></div><button className="btn-primary" disabled={preview || loading} onClick={() => run("/insights/report", "Create my detailed report")}><BarChart3 size={17} /> Generate full report</button></div>
    {preview && <div className="card border-amber-300/20 bg-amber-300/[0.04]"><p className="font-bold text-amber-200">Sign in to use Azure AI analysis</p><p className="mt-1 text-sm text-slate-400">Financial records stay scoped to your Supabase account. Import and analysis require authentication.</p><Link className="btn-primary mt-4" to="/auth">Sign in</Link></div>}
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="card flex min-h-[520px] flex-col p-5"><div className="flex-1 space-y-4 overflow-auto p-2">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-emerald-400 text-[#07100d]" : "border border-white/[0.07] bg-white/[0.035] text-slate-300"}`}>{message.role === "assistant" && <Sparkles className="mb-2 text-emerald-300" size={16} />}{message.text}</div></div>)}{loading && <p className="text-sm text-emerald-300">Azure AI is analysing your records…</p>}</div>
        {error && <p className="mb-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300">{error}</p>}
        <form onSubmit={ask} className="flex gap-3 border-t border-white/[0.06] pt-5"><input className="field flex-1" disabled={preview} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Where am I overspending?" /><button disabled={preview || loading || !question.trim()} className="btn-primary px-4" aria-label="Ask Azure AI"><Send size={18} /></button></form>
      </section>
      <section className="card p-6"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Analysis report</p><h2 className="section-title">Costs and next actions</h2></div><Link className="btn-secondary" to="/transactions"><FileSpreadsheet size={16} /> Import bank CSV</Link></div>
        {report ? <div className="mt-6 space-y-6"><p className="leading-7 text-slate-300">{report.summary}</p><ReportList title="Key findings" items={report.key_findings} /><ReportList title="Recommendations" items={report.recommendations} /></div> : <div className="mt-16 text-center"><BarChart3 className="mx-auto text-slate-700" size={42} /><p className="mt-4 font-bold">No report generated yet</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Import your bank statement on Transactions, then generate a report here.</p></div>}
      </section>
    </div>
  </div>;
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="mb-3 font-bold">{title}</h3><div className="space-y-2">{items.map((item, index) => <div key={index} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-slate-300">{item}</div>)}</div></div>;
}
