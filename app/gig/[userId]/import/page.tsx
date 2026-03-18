"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ParsedStatement {
  date_range: string;
  deliveries: number;
  hours: number;
  earnings_gross: number;
  uber_fee: number;
  tips: number;
  net: number;
  miles: number;
}

export default function ImportPDF() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ParsedStatement | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(null);
    setResult(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }

    setParsing(true);

    // Read as base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1]); // strip "data:application/pdf;base64,"
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/runs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId), pdf_base64: base64 }),
    });

    setParsing(false);

    if (res.ok) {
      const data = await res.json();
      setPreview(data.preview);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to parse PDF.");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setImporting(true);

    const res = await fetch("/api/runs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId), rows: [preview] }),
    });

    setImporting(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setPreview(null);
    } else {
      setError("Import failed.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Import Weekly Statement</h1>
      </div>

      {result ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
          <p className="text-2xl font-bold text-emerald-500 mb-1">
            {result.inserted === 1 ? "Imported!" : `${result.inserted} imported`}
          </p>
          {result.skipped > 0 && (
            <p className="text-sm text-zinc-400">{result.skipped} duplicate skipped</p>
          )}
          <button
            onClick={() => router.push(`/gig/${userId}`)}
            className="mt-6 bg-zinc-800 text-white rounded-xl px-6 py-3 text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Upload */}
          {!preview && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Upload PDF</p>
              <p className="text-sm text-zinc-500 mb-4">
                Download your weekly statement from the Uber Driver app or your Uber earnings email, then upload here.
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFile}
                disabled={parsing}
                className="text-sm text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-white file:text-sm file:cursor-pointer disabled:opacity-50"
              />
              {parsing && (
                <p className="mt-3 text-sm text-zinc-400">Reading statement…</p>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Preview */}
          {preview && (
            <div className="mb-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-3">
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Parsed Statement</p>
                <div className="flex flex-col gap-2">
                  <Row label="Date Range" value={preview.date_range} />
                  <Row label="Deliveries" value={String(preview.deliveries)} />
                  <Row label="Hours" value={`${preview.hours}h`} />
                  <Row label="Gross Earnings" value={`$${preview.earnings_gross.toFixed(2)}`} />
                  <Row label="Uber Fee" value={`-$${preview.uber_fee.toFixed(2)}`} sub />
                  <Row label="Tips" value={`+$${preview.tips.toFixed(2)}`} />
                  <div className="border-t border-zinc-100 pt-2">
                    <Row label="Net" value={`$${preview.net.toFixed(2)}`} bold />
                  </div>
                  <Row label="Miles" value={`${preview.miles} mi`} />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 border border-zinc-200 text-zinc-600 rounded-xl py-3 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={importing}
                  className="flex-1 bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Confirm Import"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-sm ${sub ? "text-zinc-400" : "text-zinc-500"}`}>{label}</span>
      <span className={`text-sm ${bold ? "text-zinc-800 font-semibold" : sub ? "text-zinc-400" : "text-zinc-700"}`}>
        {value}
      </span>
    </div>
  );
}
