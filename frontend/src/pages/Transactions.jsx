import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../services/api.js";
import { formatAmount } from "../services/categories.js";
import CsvImport from "../components/CsvImport.jsx";
import TransactionFilters from "../components/TransactionFilters.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TransactionList from "../components/TransactionList.jsx";

const PAGE_SIZE = 25;

const EMPTY_FILTERS = {
  q: "",
  category: "",
  start_date: "",
  end_date: "",
  sort: "date",
  order: "desc",
  offset: 0,
};

function buildQuery(f) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  if (f.start_date) p.set("start_date", f.start_date);
  if (f.end_date) p.set("end_date", f.end_date);
  p.set("sort", f.sort);
  p.set("order", f.order);
  p.set("limit", String(PAGE_SIZE));
  p.set("offset", String(f.offset));
  return p.toString();
}

const isFiltered = (f) =>
  Boolean(f.q || f.category || f.start_date || f.end_date);

export default function Transactions() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/transactions?${buildQuery(filters)}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.detail || err.message || "Something went wrong.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  async function handleCreate(payload) {
    setSaving(true);
    try {
      await apiFetch("/transactions", { method: "POST", body: payload });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(payload) {
    setSaving(true);
    try {
      await apiFetch(`/transactions/${editing.id}`, {
        method: "PATCH",
        body: payload,
      });
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete "${t.description || "this transaction"}"?`)) return;
    setDeletingId(t.id);
    try {
      await apiFetch(`/transactions/${t.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.detail || err.message || "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  }

  const pageStart = total === 0 ? 0 : filters.offset + 1;
  const pageEnd = Math.min(filters.offset + PAGE_SIZE, total);
  const pageNet = items.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Transactions
        </h1>
        {!loading && !error && total > 0 && (
          <p className="text-sm text-slate-500">
            Showing {pageStart}–{pageEnd} of {total} · net on this page{" "}
            <span
              className={
                pageNet < 0 ? "font-medium text-slate-900" : "font-medium text-green-600"
              }
            >
              {formatAmount(pageNet)}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {editing ? (
          <TransactionForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            busy={saving}
          />
        ) : (
          <TransactionForm onSubmit={handleCreate} busy={saving} />
        )}
        <CsvImport onImported={load} />
      </div>

      <TransactionFilters
        value={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        active={isFiltered(filters)}
      />

      <TransactionList
        items={items}
        loading={loading}
        error={error}
        filtered={isFiltered(filters)}
        onRetry={load}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
        onEdit={setEditing}
        onDelete={handleDelete}
        deletingId={deletingId}
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            disabled={filters.offset === 0}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                offset: Math.max(0, f.offset - PAGE_SIZE),
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {Math.floor(filters.offset / PAGE_SIZE) + 1} of{" "}
            {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            disabled={filters.offset + PAGE_SIZE >= total}
            onClick={() =>
              setFilters((f) => ({ ...f, offset: f.offset + PAGE_SIZE }))
            }
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
