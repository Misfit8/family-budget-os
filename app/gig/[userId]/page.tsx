"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DigestCard from "@/app/components/DigestCard";

interface BufferData {
  balance: number;
  avgDailyBurn: number;
  runway: number | null;
}

interface Run {
  id: number;
  date: string;
  earnings_gross: number;
  tips: number;
  net: number;
  miles: number;
  hours: number;
}

const NAMES: Record<string, string> = { "1": "Mom", "2": "Dad" };

function runwayColor(days: number | null) {
  if (days === null) return "text-zinc-400";
  if (days > 14) return "text-emerald-500";
  if (days >= 7) return "text-amber-500";
  return "text-red-500";
}

export default function GigDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [buffer, setBuffer] = useState<BufferData | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState(800);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [bufRes, runsRes] = await Promise.all([
        fetch(`/api/buffer/${userId}`),
        fetch(`/api/runs/${userId}`),
      ]);
      const bufData = await bufRes.json();
      const runsData = await runsRes.json();
      setBuffer(bufData);
      setRuns(runsData);
      setLoading(false);
    }
    load();
  }, [userId]);

  // Weekly earnings: current week (Mon–Sun)
  function getWeekEarnings() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const cutoff = monday.toISOString().slice(0, 10);
    return runs
      .filter((r) => r.date >= cutoff)
      .reduce((sum, r) => sum + r.net, 0);
  }

  // Trailing 7-day average daily net
  function getTrailingAvg() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const recent = runs.filter((r) => r.date >= cutoffStr);
    if (recent.length === 0) return 0;
    const total = recent.reduce((sum, r) => sum + r.net, 0);
    return total / 7;
  }

  const weekEarnings = getWeekEarnings();
  const trailingAvg = getTrailingAvg();
  const runway = buffer?.runway ?? null;
  const balance = buffer?.balance ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">{NAMES[userId] ?? "Gig Worker"}</h1>
        <span className="text-xs text-zinc-400 uppercase">Gig</span>
      </div>

      {/* Weekly Digest */}
      <DigestCard userId={userId} />

      {/* Runway — Primary KPI */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Runway</p>
        <p className={`font-bold leading-none ${runwayColor(runway)}`} style={{ fontSize: "72px" }}>
          {runway !== null ? Math.floor(runway) : "—"}
        </p>
        <p className="text-zinc-400 text-sm mt-1">days</p>
        {runway !== null && runway < 7 && (
          <p className="mt-2 text-xs text-red-500 font-medium">Top up your buffer soon.</p>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          Buffer: <span className="text-zinc-700 font-medium">${balance.toFixed(2)}</span>
          {buffer?.avgDailyBurn ? (
            <span> · Burn: ${buffer.avgDailyBurn.toFixed(2)}/day</span>
          ) : null}
        </p>
      </div>

      {/* This week */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">This Week</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-zinc-800">${weekEarnings.toFixed(0)}</p>
            <p className="text-xs text-zinc-400">earned net</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-zinc-500">${weeklyTarget}</p>
            <p className="text-xs text-zinc-400">target</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              weekEarnings >= weeklyTarget ? "bg-emerald-500" : "bg-amber-400"
            }`}
            style={{ width: `${Math.min(100, (weekEarnings / weeklyTarget) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-zinc-400">
            {weekEarnings >= weeklyTarget
              ? "Target hit!"
              : `$${(weeklyTarget - weekEarnings).toFixed(0)} to go`}
          </span>
          <span className="text-xs text-zinc-400">
            {weeklyTarget > 0 ? Math.round((weekEarnings / weeklyTarget) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Trailing avg */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">7-Day Daily Avg</p>
        <p className="text-2xl font-bold text-zinc-800">${trailingAvg.toFixed(2)}</p>
        <p className="text-xs text-zinc-400">net per day</p>
      </div>

      {/* Nav */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href={`/gig/${userId}/log`}
          className="bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          + Log Run
        </Link>
        <Link
          href={`/gig/${userId}/buffer`}
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Buffer
        </Link>
        <Link
          href={`/gig/${userId}/import`}
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Import PDF
        </Link>
        <Link
          href={`/gig/${userId}/tax`}
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Tax Tracker
        </Link>
        <Link
          href={`/gig/${userId}/patterns`}
          className="col-span-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Patterns ✦
        </Link>
      </div>

      {/* Recent runs */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Recent Runs</p>
        {runs.length === 0 ? (
          <p className="text-zinc-400 text-sm">No runs yet. Log your first run.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.slice(0, 10).map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">{r.date}</p>
                  <p className="text-xs text-zinc-400">
                    {r.miles > 0 ? `${r.miles} mi · ` : ""}
                    {r.hours ? `${r.hours}h` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-800">${r.net.toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">gross ${r.earnings_gross.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
