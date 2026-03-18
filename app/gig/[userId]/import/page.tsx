"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";

interface PreviewRow {
  date: string;
  earnings_gross: number;
  tips: number;
  miles: number;
  platform: string;
  uber_fee: number;
}

export default function ImportCSV() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = (results.data as Record<string, string>[]).map((row) => {
          // Uber Eats CSV columns vary — try common field names
          const gross =
            parseFloat(row["Fare"] ?? row["earnings_gross"] ?? row["Gross"] ?? "0") || 0;
          const tips =
            parseFloat(row["Tip"] ?? row["tips"] ?? row["Tips"] ?? "0") || 0;
          const miles =
            parseFloat(row["Distance (miles)"] ?? row["miles"] ?? row["Miles"] ?? "0") || 0;
          const uber_fee =
            parseFloat(row["Uber fee"] ?? row["uber_fee"] ?? row["Fee"] ?? "0") || 0;
          const rawDate =
            row["Date"] ?? row["date"] ?? row["Trip Date"] ?? "";
          const date = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : "";
          const platform = row["platform"] ?? row["Platform"] ?? "Uber Eats";

          return { date, earnings_gross: gross, tips, miles, platform, uber_fee };
        });

        const valid = rows.filter((r) => r.date && r.earnings_gross > 0);
        if (valid.length === 0) {
          setError(
            "No valid rows found. Make sure your CSV has Date and earnings columns."
          );
        }
        setPreview(valid);
      },
      error() {
        setError("Failed to parse CSV.");
      },
    });
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setError("");

    const res = await fetch("/api/runs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId), rows: preview }),
    });

    setImporting(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setPreview([]);
    } else {
      setError("Import failed.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Import CSV</h1>
      </div>

      {result ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
          <p className="text-2xl font-bold text-emerald-500 mb-1">{result.inserted} imported</p>
          <p className="text-sm text-zinc-400">{result.skipped} duplicates skipped</p>
          <button
            onClick={() => router.push(`/gig/${userId}`)}
            className="mt-6 bg-zinc-800 text-white rounded-xl px-6 py-3 text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Upload File</p>
            <p className="text-sm text-zinc-500 mb-4">
              Export your trips from Uber Eats → Activity → Download CSV. Columns needed: Date, Fare/earnings, Tip, Distance.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="text-sm text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:text-white file:text-sm file:cursor-pointer"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {preview.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">
                Preview — {preview.length} rows
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {preview.slice(0, 20).map((r, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-zinc-200 px-4 py-2 flex justify-between text-sm"
                  >
                    <span className="text-zinc-600">{r.date}</span>
                    <span className="font-medium text-zinc-800">
                      ${(r.earnings_gross + r.tips - r.uber_fee).toFixed(2)} net
                    </span>
                  </div>
                ))}
                {preview.length > 20 && (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    +{preview.length - 20} more
                  </p>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className="mt-4 w-full bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${preview.length} Runs`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
