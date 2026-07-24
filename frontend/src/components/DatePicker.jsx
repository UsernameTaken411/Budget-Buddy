import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons.jsx";

// A hand-rolled replacement for <input type="date">. The native control's
// popup calendar is OS-rendered and can't be restyled to match the app's
// dark theme beyond a light/dark toggle (see color-scheme in index.css) -
// and its calendar/icon glyph is often barely visible against a dark
// background. This renders the whole thing ourselves instead, matching the
// rest of the app's hand-rolled-over-dependency pattern (icons.jsx,
// MarkdownLite in Chat.jsx).
//
// API mirrors a plain controlled input: `value` is an ISO "yyyy-mm-dd"
// string (or "" / null / undefined for empty), `onChange` is called with
// the new ISO string directly (not an event) - swap `onChange={(e) =>
// setX(e.target.value)}` for `onChange={setX}` at call sites.

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIso(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const rootRef = useRef(null);

  // Keep the visible month in sync when the value changes from outside
  // (e.g. editing an existing transaction loads a different date).
  useEffect(() => {
    if (selected) setViewDate(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, i - startWeekday + 1);
    cells.push({ date, outside: date.getMonth() !== month });
  }

  const today = new Date();

  function pick(date) {
    onChange(toIso(date));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={selected ? "text-white" : "text-neutral-600"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0b0f0f] p-3 shadow-xl">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {cells.map(({ date, outside }, i) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selected);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => pick(date)}
                  className={`rounded-lg py-1.5 transition ${
                    outside ? "text-neutral-700" : "text-neutral-200"
                  } ${
                    isSelected
                      ? "bg-emerald-400 font-semibold text-neutral-950"
                      : isToday
                        ? "border border-emerald-400/50"
                        : "hover:bg-white/10"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="font-medium text-neutral-400 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
