"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BestDay {
  day: string;
  avg_hourly: number;
  hit_rate: number;
  note: string;
}
interface Window {
  label: string;
  avg_hourly: number;
  consistency: "high" | "medium" | "low";
}
interface AvoidSlot {
  label: string;
  avg_hourly: number;
  note: string;
}
interface Analysis {
  best_days: BestDay[];
  best_windows: Window[];
  avoid: AvoidSlot[];
  weekly_floor: number;
  weekly_target_plan: string;
  mileage_insight: string;
  trend: "improving" | "stable" | "declining";
  trend_note: string;
}

const CONSISTENCY_COLOR = {
  high:   "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-zinc-100 text-zinc-500",
};

const TREND_COLOR = {
  improving: "text-emerald-500",
  stable:    "text-zinc-500",
  declining: "text-amber-500",
};

export default function PatternsPage() {
  const { userId } = useParams<{ userId: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [runCount, setRunCount] = useState<number | null>(null);
  const [insufficient, setInsufficient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setInsufficient(false);

    const res = await fetch("/api/gig/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId) }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.insufficient) {
      setInsufficient(true);
      setRunCount(data.run_count);
    } else if (data.analysis) {
      setAnalysis(data.analysis);
      setRunCount(data.run_count);
    } else {
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Shift Optimizer ✦</h1>
      </div>

      {!analysis && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
          <p className="text-sm text-zinc-500 mb-1">
            Analyzes your full run history to find best windows, avoid periods, earnings floor, and trend.
          </p>
          <p className="text-xs text-zinc-400 mb-4">Requires 20+ logged runs to unlock.</p>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50 hover:bg-zinc-700 transition-colors"
          >
            {loading ? "Analyzing…" : "Analyze My Patterns"}
          </button>
        </div>
      )}

      {insufficient && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
          <p className="text-zinc-500 text-sm mb-2">Not enough data yet.</p>
          <p className="text-2xl font-bold text-zinc-800 mb-1">{runCount} / 20</p>
          <p className="text-xs text-zinc-400">runs logged</p>
          <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${((runCount ?? 0) / 20) * 100}%` }} />
          </div>
          <p className="text-xs text-zinc-400 mt-2">Keep logging — optimizer unlocks after {20 - (runCount ?? 0)} more runs.</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
          <p className="text-zinc-400 text-sm">Reading your run history…</p>
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-4">
          {/* Trend */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Trend</p>
            <p className={`text-lg font-bold capitalize ${TREND_COLOR[analysis.trend]}`}>{analysis.trend}</p>
            <p className="text-sm text-zinc-500 mt-1">{analysis.trend_note}</p>
            <p className="text-xs text-zinc-400 mt-2">Weekly floor: <span className="font-medium text-zinc-700">${analysis.weekly_floor}/wk</span></p>
          </div>

          {/* Best days */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Best Days</p>
            <div className="flex flex-col gap-2">
              {analysis.best_days.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{d.day}</p>
                    {d.note && <p className="text-xs text-zinc-400">{d.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-700">${d.avg_hourly.toFixed(2)}/hr</p>
                    <p className="text-xs text-zinc-400">{Math.round(d.hit_rate * 100)}% consistency</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best windows */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Best Windows</p>
            <div className="flex flex-col gap-2">
              {analysis.best_windows.map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-sm text-zinc-700">{w.label}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CONSISTENCY_COLOR[w.consistency]}`}>
                      {w.consistency}
                    </span>
                    <span className="text-sm font-semibold text-zinc-700">${w.avg_hourly.toFixed(2)}/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avoid */}
          {analysis.avoid.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5">
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Avoid</p>
              <div className="flex flex-col gap-2">
                {analysis.avoid.map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-700">{a.label}</p>
                      {a.note && <p className="text-xs text-zinc-400">{a.note}</p>}
                    </div>
                    <span className="text-sm text-zinc-400">${a.avg_hourly.toFixed(2)}/hr</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target plan + mileage */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">This Week's Plan</p>
            <p className="text-sm text-zinc-700">{analysis.weekly_target_plan}</p>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Mileage Efficiency</p>
            <p className="text-sm text-zinc-700">{analysis.mileage_insight}</p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-xs text-zinc-400 text-center disabled:opacity-50"
          >
            {loading ? "Refreshing…" : `↻ Re-analyze · ${runCount} runs`}
          </button>
        </div>
      )}
    </div>
  );
}
