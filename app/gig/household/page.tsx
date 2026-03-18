"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DigestCard from "@/app/components/DigestCard";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";

interface BufferData {
  balance: number;
  avgDailyBurn: number;
  runway: number | null;
}

interface Run {
  id: number;
  user_id: number;
  date: string;
  earnings_gross: number;
  tips: number;
  net: number;
  miles: number;
  hours: number;
}

function runwayColor(days: number | null) {
  if (days === null) return "text-zinc-400";
  if (days > 14) return "text-emerald-500";
  if (days >= 7) return "text-amber-500";
  return "text-red-500";
}

function getMonday(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

const WEEKLY_TARGET = 1600;

export default function ParentsDashboard() {
  const [buf1, setBuf1] = useState<BufferData | null>(null);
  const [buf2, setBuf2] = useState<BufferData | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b1Res, b2Res, r1Res, r2Res] = await Promise.all([
      fetch("/api/buffer/1"),
      fetch("/api/buffer/2"),
      fetch("/api/runs/1"),
      fetch("/api/runs/2"),
    ]);
    const [b1, b2, r1, r2] = await Promise.all([
      b1Res.json(), b2Res.json(), r1Res.json(), r2Res.json(),
    ]);
    setBuf1(b1);
    setBuf2(b2);
    // Merge runs, label user_id, sort by date desc
    const merged: Run[] = [
      ...r1.map((r: Run) => ({ ...r, user_id: 1 })),
      ...r2.map((r: Run) => ({ ...r, user_id: 2 })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    setRuns(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  // Combined stats
  const totalBalance = (buf1?.balance ?? 0) + (buf2?.balance ?? 0);
  const totalBurn = (buf1?.avgDailyBurn ?? 0) + (buf2?.avgDailyBurn ?? 0);
  const runway = totalBurn > 0 ? totalBalance / totalBurn : null;

  // This week
  const cutoff = getMonday();
  const weekEarnings = runs.filter((r) => r.date >= cutoff).reduce((s, r) => s + r.net, 0);
  const weekPct = Math.min(100, WEEKLY_TARGET > 0 ? (weekEarnings / WEEKLY_TARGET) * 100 : 0);

  // Trailing 7-day avg
  const trailCutoff = new Date();
  trailCutoff.setDate(trailCutoff.getDate() - 7);
  const trailStr = trailCutoff.toISOString().slice(0, 10);
  const trailingAvg = (() => {
    const recent = runs.filter((r) => r.date >= trailStr);
    if (recent.length === 0) return 0;
    return recent.reduce((s, r) => s + r.net, 0) / 7;
  })();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Parents</h1>
        <span className="text-xs text-zinc-400 uppercase">Gig</span>
      </div>

      <NotificationBanner userId="1" />
      <DigestCard userId="1" />

      {/* Runway */}
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
          Buffer: <span className="text-zinc-700 font-medium">${totalBalance.toFixed(2)}</span>
          {totalBurn > 0 && <span> · Burn: ${totalBurn.toFixed(2)}/day</span>}
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
            <p className="text-lg font-semibold text-zinc-500">${WEEKLY_TARGET}</p>
            <p className="text-xs text-zinc-400">target</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${weekPct >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
            style={{ width: `${weekPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-zinc-400">
            {weekEarnings >= WEEKLY_TARGET ? "Target hit!" : `$${(WEEKLY_TARGET - weekEarnings).toFixed(0)} to go`}
          </span>
          <span className="text-xs text-zinc-400">{Math.round(weekPct)}%</span>
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
        <Link href="/gig/household/log"
          className="bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors">
          + Log Run
        </Link>
        <Link href="/gig/household/buffer"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Buffer
        </Link>
        <Link href="/gig/1/import"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Import PDF
        </Link>
        <Link href="/gig/household/tax"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Tax Tracker
        </Link>
        <Link href="/gig/1/patterns"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Patterns ✦
        </Link>
        <Link href="/debt/1"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Debt Freedom
        </Link>
      </div>

      <GoalsSection userId="1" incomeType="gig" />

      {/* Recent runs */}
      <div className="mt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Recent Runs</p>
        {runs.length === 0 ? (
          <p className="text-zinc-400 text-sm">No runs yet. Log your first run.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.slice(0, 10).map((r) => (
              <div key={`${r.user_id}-${r.id}`}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex justify-between items-center">
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
