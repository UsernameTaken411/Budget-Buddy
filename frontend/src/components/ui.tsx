import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";

export function Progress({ value, danger = false }: { value: number; danger?: boolean }) {
  const width = Math.min(Math.max(value, 0), 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={`h-full rounded-full transition-all ${danger ? "bg-rose-500" : "bg-emerald-500"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function StateMessage({ error, empty, children }: { error?: string; empty?: boolean; children?: ReactNode }) {
  if (error) return <div className="card flex items-center gap-3 text-rose-300"><AlertCircle />{error}</div>;
  if (empty) return <div className="card flex flex-col items-center gap-2 py-12 text-center text-slate-500"><Inbox size={32} /><p>{children}</p></div>;
  return null;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121816] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display text-xl font-bold">{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </section>
    </div>
  );
}
