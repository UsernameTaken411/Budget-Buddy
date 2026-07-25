import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "./icons.jsx";

// A hand-rolled replacement for <select>/<option>, same reasoning as
// DatePicker.jsx: color-scheme: dark gets native selects into the browser's
// dark palette on desktop, but the popup list still renders white on some
// mobile browsers regardless (confirmed directly from a device screenshot).
// Building it ourselves guarantees it matches the theme everywhere.
//
// API mirrors a plain controlled input: `value` is the selected option's
// value, `onChange` is called with the new value directly (not an event).
// `options` is [{ value, label }]. `placeholder` shows when value is "".

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${selected ? "text-white" : "text-neutral-600"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 max-h-64 w-full min-w-[9rem] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0f0f] p-1.5 shadow-xl">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                o.value === value
                  ? "bg-emerald-400/10 font-semibold text-emerald-400"
                  : "text-neutral-200 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
