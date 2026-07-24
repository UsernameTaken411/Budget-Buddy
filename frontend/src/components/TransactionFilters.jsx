import { CATEGORIES, CATEGORY_LABELS } from "../services/categories.js";
import DatePicker from "./DatePicker.jsx";

const fieldClass =
  "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-400/50";

export default function TransactionFilters({ value, onChange, onClear, active }) {
  function set(patch) {
    onChange({ ...value, ...patch, offset: 0 }); // any filter change resets paging
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          placeholder="Search description…"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          className={`${fieldClass} lg:col-span-2`}
        />

        <select
          value={value.category}
          onChange={(e) => set({ category: e.target.value })}
          className={`${fieldClass} bg-[#0b0f0f]`}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <DatePicker
          value={value.start_date}
          onChange={(v) => set({ start_date: v })}
          placeholder="Start date"
          className={fieldClass}
        />
        <DatePicker
          value={value.end_date}
          onChange={(v) => set({ end_date: v })}
          placeholder="End date"
          className={fieldClass}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={`${value.sort}:${value.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(":");
            set({ sort, order });
          }}
          className="rounded-xl border border-white/10 bg-[#0b0f0f] px-2 py-1 text-xs text-neutral-300 outline-none focus:border-emerald-400/50"
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
            className="rounded-xl px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
