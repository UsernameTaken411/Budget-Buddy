import { CATEGORIES, CATEGORY_LABELS } from "../services/categories.js";
import DatePicker from "./DatePicker.jsx";
import Select from "./Select.jsx";

const fieldClass =
  "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-400/50";

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
];

const SORT_OPTIONS = [
  { value: "date:desc", label: "Newest first" },
  { value: "date:asc", label: "Oldest first" },
  { value: "amount:asc", label: "Amount: low to high" },
  { value: "amount:desc", label: "Amount: high to low" },
  { value: "created_at:desc", label: "Recently added" },
];

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

        <Select
          value={value.category}
          onChange={(v) => set({ category: v })}
          options={CATEGORY_OPTIONS}
          className={`${fieldClass} bg-[#0b0f0f]`}
        />

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
        <Select
          value={`${value.sort}:${value.order}`}
          onChange={(v) => {
            const [sort, order] = v.split(":");
            set({ sort, order });
          }}
          options={SORT_OPTIONS}
          className="w-auto min-w-[9.5rem] rounded-xl border border-white/10 bg-[#0b0f0f] px-2 py-1 text-xs text-neutral-300 outline-none focus:border-emerald-400/50"
        />

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
