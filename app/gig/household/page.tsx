"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";
import HelpTip from "@/app/components/HelpTip";

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

function runwayLabel(days: number | null) {
  if (days === null) return null;
  if (days < 0) return "Buffer is overdrawn — deposit to restore runway";
  if (days > 14) return "You're in good shape";
  if (days >= 7) return "Start building your buffer";
  return "Top up your buffer soon";
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

  const totalBalance = (buf1?.balance ?? 0) + (buf2?.balance ?? 0);
  const totalBurn = (buf1?.avgDailyBurn ?? 0) + (buf2?.avgDailyBurn ?? 0);
  const runway = totalBurn > 0 ? totalBalance / totalBurn : null;

  const cutoff = getMonday();
  const weekEarnings = runs.filter((r) => r.date >= cutoff).reduce((s, r) => s + r.net, 0);
  const weekPct = Math.min(100, WEEKLY_TARGET > 0 ? (weekEarnings / WEEKLY_TARGET) * 100 : 0);

  const trailCutoff = new Date();
  trailCutoff.setDate(trailCutoff.getDate() - 7);
  const trailStr = trailCutoff.toISOString().slice(0, 10);
  const recentRuns = runs.filter((r) => r.date >= trailStr);
  const trailingAvg = recentRuns.length > 0
    ? recentRuns.reduce((s, r) => s + r.net, 0) / 7
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Parents</h1>
        <Link href="/help" className="text-xs text-zinc-400 border border-zinc-200 rounded-lg px-2 py-1 hover:border-zinc-400">
          Help ?
        </Link>
      </div>

      <NotificationBanner userId="1" />

      {/* Runway — Primary KPI */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-2">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Runway</p>
          <HelpTip explanation="How many days your buffer savings can cover household expenses. Green = 14+ days. Yellow = 7–14 days. Red = under 7 days." />
        </div>
        <p className={`font-bold leading-none ${runwayColor(runway)}`} style={{ fontSize: runway !== null && runway < 0 ? "48px" : "72px" }}>
          {runway !== null ? (runway < 0 ? "Overdrawn" : Math.floor(runway)) : "—"}
        </p>
        <p className="text-zinc-400 text-sm mt-1">
          {runway !== null && runway < 0 ? "buffer balance is negative" : "days of expenses covered"}
        </p>
        {runway !== null && (
          <p className={`mt-2 text-xs font-medium ${runwayColor(runway)}`}>
            {runwayLabel(runway)}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-center gap-4 text-xs text-zinc-400">
          <span>
            Savings: <span className={`font-medium ${totalBalance < 0 ? "text-red-500" : "text-zinc-700"}`}>
              {totalBalance < 0 ? "-$" : "$"}{Math.abs(totalBalance).toFixed(2)}
            </span>
            <HelpTip explanation="Your shared buffer — money set aside to cover expenses during slow weeks." />
          </span>
          {totalBurn > 0 && (
            <span>Spend: <span className="text-zinc-700 font-medium">${totalBurn.toFixed(2)}/day</span></span>
          )}
        </div>
      </div>

      {/* This week */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">This Week</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-zinc-800">${weekEarnings.toFixed(0)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">earned after fees</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-zinc-500">${WEEKLY_TARGET}</p>
            <p className="text-xs text-zinc-400">weekly goal</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${weekPct >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
            style={{ width: `${weekPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-zinc-400">
            {weekEarnings >= WEEKLY_TARGET
              ? "🎉 Goal reached this week"
              : `$${(WEEKLY_TARGET - weekEarnings).toFixed(0)} left to reach your goal`}
          </span>
          <span className="text-xs text-zinc-400">{Math.round(weekPct)}%</span>
        </div>
      </div>

      {/* 7-day avg */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <div className="flex items-center gap-1 mb-1">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Daily Average</p>
          <HelpTip explanation="Your average net earnings per day over the last 7 days. Useful for spotting whether your income is trending up or down." />
        </div>
        <p className="text-2xl font-bold text-zinc-800">${trailingAvg.toFixed(2)}</p>
        <p className="text-xs text-zinc-400">per day, last 7 days</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/gig/household/log"
          className="bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors">
          + Log Run
        </Link>
        <Link href="/gig/household/buffer"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Buffer
        </Link>
        <Link href="/gig/household/tax"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Tax Tracker
        </Link>
        <Link href="/digest/1"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Weekly Digest ✦
        </Link>
        <Link href="/gig/1/import"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Import PDF
        </Link>
        <Link href="/gig/1/patterns"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Patterns ✦
        </Link>
        <Link href="/debt/1"
          className="col-span-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Debt Freedom
        </Link>
      </div>

      <GoalsSection userId="1" incomeType="gig" />

      {/* Recent runs */}
      <div className="mt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Recent Runs</p>
        {runs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
            <p className="text-zinc-500 text-sm mb-1">No runs logged yet.</p>
            <p className="text-xs text-zinc-400 mb-4">
              Tap "+ Log Run" above to record your first delivery shift.
            </p>
            <Link href="/gig/household/log"
              className="text-sm font-medium text-zinc-700 underline">
              Log your first run →
            </Link>
          </div>
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
