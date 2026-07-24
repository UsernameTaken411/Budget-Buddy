import { useRef, useState } from "react";
import { apiFetch } from "../services/api.js";

// Posts the file to /transactions/import. Format detection (generic vs
// DBS/POSB) happens server-side — the user just drops the file in.

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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Import CSV</h2>
      <p className="mb-3 text-xs text-slate-500">
        Generic CSV or a DBS/POSB statement export — the format is detected
        automatically.
      </p>

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
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-md border-2 border-dashed px-4 py-8 text-center transition ${
          dragging
            ? "border-slate-900 bg-slate-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <p className="text-sm text-slate-600">
          {busy ? "Importing…" : "Drop a CSV here, or click to choose"}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <p className="font-medium text-slate-900">
            Imported {result.imported}
            {result.skipped > 0 && (
              <span className="font-normal text-slate-500">
                {" "}
                · {result.skipped} duplicate
                {result.skipped === 1 ? "" : "s"} skipped
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            Detected format:{" "}
            {result.detected_format === "dbs_posb" ? "DBS/POSB" : "generic"}
          </p>

          {result.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-amber-700">
                {result.errors.length} row
                {result.errors.length === 1 ? "" : "s"} skipped due to errors
              </summary>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
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
  );
}
