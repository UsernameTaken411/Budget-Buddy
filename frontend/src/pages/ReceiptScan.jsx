import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../services/api";
import { CATEGORIES, CATEGORY_LABELS, formatAmount } from "../services/categories";
import { CameraIcon, ScanFrameIcon, ShieldCheckIcon } from "../components/icons.jsx";
import DatePicker from "../components/DatePicker.jsx";
import Select from "../components/Select.jsx";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RECEIPT_CATEGORIES = CATEGORIES.filter((c) => c !== "income" && c !== "transfer");
const RECEIPT_CATEGORY_OPTIONS = RECEIPT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

const inputClass =
  "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-400/50";

export default function ReceiptScan() {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | scanning | review | saving | saved
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  // Always release the webcam if the user navigates away mid-capture.
  useEffect(() => stopCamera, []);

  function applyImage(fileOrBlob) {
    setFile(fileOrBlob);
    setResult(null);
    setStatus("idle");
    setError("");
    setPreview(fileOrBlob ? URL.createObjectURL(fileOrBlob) : "");
  }

  function selectImage(e) {
    applyImage(e.target.files?.[0] ?? null);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // videoRef isn't mounted until cameraOpen renders it — attach next tick.
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 0);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera permission for this site and try again."
          : "Couldn't access a camera on this device."
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        applyImage(captured);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  async function scan() {
    if (!file) return;
    setStatus("scanning");
    setError("");
    const form = new FormData();
    form.append("image", file);
    try {
      const extracted = await apiFetch("/receipts/scan", { method: "POST", body: form });
      setResult(extracted);
      setStatus("review");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Unable to scan this receipt.");
      setStatus("idle");
    }
  }

  async function confirm(e) {
    e.preventDefault();
    if (!result) return;
    setStatus("saving");
    setError("");
    try {
      await apiFetch("/receipts/confirm", {
        method: "POST",
        body: {
          amount: -Math.abs(Number(result.amount)),
          date: result.date || new Date().toISOString().slice(0, 10),
          category: result.category,
          description: result.notes ? `${result.merchant} — ${result.notes}` : result.merchant,
        },
      });
      setStatus("saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Unable to save this expense.");
      setStatus("review");
    }
  }

  function reset() {
    stopCamera();
    applyImage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          AI receipt capture
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Snap it. Check it. Done.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Take a receipt photo and Budget Buddy will find the merchant, date, total and expense
          category. You stay in control before anything is saved.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {status === "saved" ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-sm font-medium text-emerald-400">Expense added</p>
          <p className="mt-1 text-sm text-neutral-400">
            {result.merchant} · {formatAmount(-Math.abs(Number(result.amount)))}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
          >
            Scan another
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Receipt image</p>
                  <p className="text-xs text-neutral-500">JPEG, PNG or WebP · max 10 MB</p>
                </div>
                <ScanFrameIcon className="h-5 w-5 text-neutral-600" />
              </div>

              {cameraOpen ? (
                <div className="flex flex-col gap-3">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full rounded-xl border border-white/10 bg-black"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
                    >
                      Capture photo
                    </button>
                  </div>
                </div>
              ) : preview ? (
                <div className="flex flex-col gap-3">
                  <img
                    src={preview}
                    alt="Selected receipt"
                    className="max-h-72 w-full rounded-xl border border-white/10 object-contain"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
                    >
                      Choose another
                    </button>
                    {status !== "scanning" && (
                      <button
                        onClick={scan}
                        className="flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300"
                      >
                        Read receipt
                      </button>
                    )}
                  </div>
                  {status === "scanning" && (
                    <p className="text-sm text-neutral-400">Reading your receipt…</p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-10 text-center transition hover:border-emerald-400/40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                    <CameraIcon className="h-6 w-6 text-neutral-300" />
                  </span>
                  <span className="text-sm font-medium text-neutral-200">
                    Take a photo or choose an image
                  </span>
                  <span className="text-xs text-neutral-500">
                    Keep the whole receipt visible and avoid shadows.
                  </span>
                </button>
              )}

              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                capture="environment"
                onChange={selectImage}
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraOpen && !preview && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Or use your camera →
                </button>
              )}
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <ShieldCheckIcon className="h-6 w-6 text-neutral-400" />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">
                Nothing is saved automatically
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                After Azure scans the receipt, review the details before saving them to your
                synced Supabase account.
              </p>
            </div>
          </div>

          {result && (
            <form
              onSubmit={confirm}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-white">Check the details</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                  {Math.round(result.confidence * 100)}% confidence
                </span>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-400">Merchant</span>
                <input
                  value={result.merchant}
                  onChange={(e) => setResult({ ...result, merchant: e.target.value })}
                  className={inputClass}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-400">Amount</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={result.amount}
                    onChange={(e) => setResult({ ...result, amount: e.target.value })}
                    className={inputClass}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-400">Date</span>
                  <DatePicker
                    value={result.date ?? ""}
                    onChange={(v) => setResult({ ...result, date: v || null })}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-400">Category</span>
                <Select
                  value={result.category}
                  onChange={(v) => setResult({ ...result, category: v })}
                  options={RECEIPT_CATEGORY_OPTIONS}
                  className={`${inputClass} bg-[#0b0f0f]`}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-400">Note (optional)</span>
                <textarea
                  value={result.notes}
                  onChange={(e) => setResult({ ...result, notes: e.target.value })}
                  className={`min-h-16 resize-none ${inputClass}`}
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
                >
                  Start over
                </button>
                <button
                  type="submit"
                  disabled={status === "saving"}
                  className="flex-1 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  {status === "saving" ? "Saving…" : "Add expense"}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-semibold text-white">Recent receipt expenses</p>
        <p className="mt-1 text-xs text-neutral-500">
          Confirmed receipts stay here and are included in your budget spending.
        </p>
        <p className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-neutral-500">
          No confirmed receipts yet.
        </p>
      </div>
    </div>
  );
}
