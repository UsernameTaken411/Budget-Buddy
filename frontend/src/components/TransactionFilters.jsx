import { CATEGORIES, CATEGORY_LABELS } from "../services/categories.js";

export default function TransactionFilters({ value, onChange, onClear, active }) {
  function set(patch) {
    onChange({ ...value, ...patch, offset: 0 }); // any filter change resets paging
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          placeholder="Search description…"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900 lg:col-span-2"
        />

        <select
          value={value.category}
          onChange={(e) => set({ category: e.target.value })}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-900"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={value.start_date}
          onChange={(e) => set({ start_date: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
        />
        <input
          type="date"
          value={value.end_date}
          onChange={(e) => set({ end_date: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={`${value.sort}:${value.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(":");
            set({ sort, order });
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-slate-900"
        >
          <option value="date:desc">Newest first</option>
          <option value="date:asc">Oldest first</option>
          <option value="amount:asc">Amount: low to high</option>
          <option value="amount:desc">Amount: high to low</option>
          <option value="created_at:desc">Recently added</option>
        </select>

        {active && (
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
