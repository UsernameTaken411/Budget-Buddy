import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { askBudgetAi } from "../services/insightsApi";
import { BarChartIcon, SendIcon, SparkleIcon, UploadIcon } from "../components/icons.jsx";

// Backend answers arrive whole (no token streaming), so we simulate the
// ChatGPT-style progressive reveal client-side. Runs once per distinct
// `text` value — re-renders of the parent (e.g. `pending` toggling) don't
// restart it, since the effect only re-fires when the text itself changes.
function useTypewriter(text) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return undefined;

    // Fixed number of ticks regardless of length, so short replies still
    // feel animated and long reports don't take forever to finish.
    const totalTicks = 50;
    const chunk = Math.max(1, Math.ceil(text.length / totalTicks));
    let i = 0;
    const id = setInterval(() => {
      i += chunk;
      setShown(text.slice(0, Math.min(i, text.length)));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text]);

  return shown;
}

// Bold-only inline formatting: splits a line on **bold** spans.
function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${idx}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${idx}`}>{part}</span>
    )
  );
}

// Small, deliberately limited markdown renderer — the system prompt only
// ever asks the model for "## Heading", "-" bullets, "1." numbered lists,
// and "**bold**", so that's all this needs to understand.
function MarkdownLite({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s+/.test(line)) {
      const content = line.replace(/^#{1,3}\s+/, "");
      blocks.push(
        <p key={key} className="mb-1 mt-3 text-sm font-semibold text-white first:mt-0">
          {renderInline(content, key)}
        </p>
      );
      key += 1;
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={key} className="my-1.5 list-disc space-y-1 pl-5 marker:text-emerald-400">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `${key}-${idx}`)}</li>
          ))}
        </ul>
      );
      key += 1;
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={key} className="my-1.5 list-decimal space-y-1 pl-5 marker:text-emerald-400">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `${key}-${idx}`)}</li>
          ))}
        </ol>
      );
      key += 1;
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    blocks.push(
      <p key={key} className="my-1 leading-relaxed">
        {renderInline(line, key)}
      </p>
    );
    key += 1;
    i += 1;
  }

  return <>{blocks}</>;
}

function AnimatedAnswer({ text }) {
  const shown = useTypewriter(text);
  const done = shown.length >= text.length;
  return (
    <>
      <MarkdownLite text={shown} />
      {!done && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-current align-middle" />
      )}
    </>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "I'm powered by Azure AI. Import your bank CSV, then ask about cash flow, recurring costs, categories, or budgets.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [reportPending, setReportPending] = useState(false);

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

  async function generateReport() {
    setReportPending(true);
    setReportError(null);
    try {
      const answer = await askBudgetAi(
        "Generate a full spending report: summarize income, expenses, category breakdown, budget status, and recommended next actions based on my synced transactions and budgets."
      );
      setReport(answer);
    } catch (err) {
      setReportError(err.detail || err.message || "Could not generate a report.");
    } finally {
      setReportPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-neutral-400">Azure AI insights</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Financial analysis
          </h1>
          <p className="mt-1 max-w-lg text-sm text-neutral-400">
            Azure analyses your Supabase-synced transactions and budgets to produce
            evidence-based insights.
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={reportPending}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
        >
          <BarChartIcon className="h-4 w-4" />
          {reportPending ? "Generating…" : "Generate full report"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-[420px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <span className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                    <SparkleIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-emerald-400 text-neutral-950"
                      : m.error
                        ? "bg-rose-500/10 text-rose-300"
                        : "bg-white/5 text-neutral-200"
                  }`}
                >
                  {m.role === "assistant" && !m.error ? (
                    <AnimatedAnswer text={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {pending && <div className="text-xs text-neutral-500">Budget Buddy is thinking…</div>}
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
              placeholder="Where am I overspending?"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-400/50"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
              aria-label="Send"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Analysis report</p>
              <p className="text-xs text-neutral-500">Costs and next actions</p>
            </div>
            <Link
              to="/transactions"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/5"
            >
              <UploadIcon className="h-3.5 w-3.5" />
              Import bank CSV
            </Link>
          </div>

          {reportError && (
            <p className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {reportError}
            </p>
          )}

          {report ? (
            <div className="overflow-y-auto text-sm leading-relaxed text-neutral-300">
              <AnimatedAnswer text={report} />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <BarChartIcon className="h-8 w-8 text-neutral-700" />
              <p className="mt-3 text-sm font-semibold text-white">No report generated yet</p>
              <p className="mt-1 max-w-xs text-xs text-neutral-500">
                Import your bank statement on Transactions, then generate a report here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
