"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PatternsPage() {
  const { userId } = useParams<{ userId: string }>();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setRan(true);
    const res = await fetch("/api/gig/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId) }),
    });
    const data = await res.json();
    setAnalysis(data.analysis ?? data.error ?? "No response.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Patterns ✦</h1>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-sm text-zinc-500 mb-4">
          AI analysis of your last 8 weeks of runs — best days, earning floor, trend, and one action to take.
        </p>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="w-full bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50 hover:bg-zinc-700 transition-colors"
        >
          {loading ? "Analyzing…" : ran ? "Re-analyze" : "Analyze My Patterns"}
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
          <p className="text-zinc-400 text-sm">Thinking…</p>
        </div>
      )}

      {!loading && analysis && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Analysis</p>
          <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{analysis}</div>
        </div>
      )}
    </div>
  );
}
