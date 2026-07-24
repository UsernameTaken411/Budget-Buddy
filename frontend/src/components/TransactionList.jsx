import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  formatAmount,
} from "../services/categories.js";

// Loading / empty / error are first-class states, not afterthoughts —
// the demo clicks through this page first.

function Skeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading transactions">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-200" />
          <div className="flex-1">
            <div className="mb-2 h-3 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filtered, onClear }) {
  if (filtered) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="mb-1 text-sm font-medium text-slate-900">
          No transactions match these filters
        </p>
        <p className="mb-4 text-sm text-slate-500">
          Try widening the date range or clearing the search.
        </p>
        <button
          onClick={onClear}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-16 text-center">
      <p className="mb-1 text-sm font-medium text-slate-900">
        No transactions yet
      </p>
      <p className="text-sm text-slate-500">
        Add one above, or import a CSV to get started.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="px-4 py-16 text-center" role="alert">
      <p className="mb-1 text-sm font-medium text-red-700">
        Could not load transactions
      </p>
      <p className="mb-4 text-sm text-slate-500">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}

export default function TransactionList({
  items,
  loading,
  error,
  filtered,
  onRetry,
  onClearFilters,
  onEdit,
  onDelete,
  deletingId,
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <EmptyState filtered={filtered} onClear={onClearFilters} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[t.category] || "#6b7280" }}
                title={CATEGORY_LABELS[t.category] || t.category}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {t.description || (
                    <span className="italic text-slate-400">No description</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {t.date} · {CATEGORY_LABELS[t.category] || t.category}
                </p>
              </div>

              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  t.amount < 0 ? "text-slate-900" : "text-green-600"
                }`}
              >
                {formatAmount(t.amount)}
              </span>

              <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  onClick={() => onEdit(t)}
                  className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(t)}
                  disabled={deletingId === t.id}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === t.id ? "…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
