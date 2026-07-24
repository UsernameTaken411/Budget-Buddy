import { useRef, useState } from "react";
import { apiFetch } from "../services/api.js";
import { UploadIcon } from "./icons.jsx";

// Posts the file to /transactions/import. Format detection (generic vs
// DBS/POSB) happens server-side — the user just drops the file in.
// The hidden <input id="csv-file-input"> is also triggered by the
// "Import CSV" shortcut button in the Transactions page header.

export default function CsvImport({ onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch("/transactions/import", {
        method: "POST",
        body: form,
      });
      setResult(res);
      if (res.imported > 0) onImported?.();
    } catch (err) {
      setError(err.detail || err.message || "Import failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files?.[0]);
      }}
      className={`flex flex-col gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:justify-between ${
        dragging ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
          <UploadIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Import bank transaction history
          </h2>
          <p className="mt-1 max-w-md text-xs text-neutral-500">
            Upload CSV exports from your bank. Date, description, debit/credit,
            withdrawal/deposit, amount and currency columns are detected automatically. Azure AI
            categorizes every valid row.
          </p>

          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-rose-400">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-2 text-xs text-neutral-400">
              <p className="font-medium text-neutral-200">
                Imported {result.imported}
                {result.skipped > 0 && (
                  <span className="font-normal text-neutral-500">
                    {" "}
                    · {result.skipped} duplicate
                    {result.skipped === 1 ? "" : "s"} skipped
                  </span>
                )}
              </p>
              <p>
                Detected format:{" "}
                {result.detected_format === "dbs_posb" ? "DBS/POSB" : "generic"}
              </p>

              {result.errors?.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-medium text-amber-400">
                    {result.errors.length} row
                    {result.errors.length === 1 ? "" : "s"} skipped due to errors
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        id="csv-file-input"
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
      >
        {busy ? "Importing…" : "Choose bank CSV"}
      </button>
    </div>
  );
}
