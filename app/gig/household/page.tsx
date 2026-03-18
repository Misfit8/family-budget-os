"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export default function GigHousehold() {
  const [momBuffer, setMomBuffer] = useState<BufferData | null>(null);
  const [dadBuffer, setDadBuffer] = useState<BufferData | null>(null);
  const [momRuns, setMomRuns] = useState<Run[]>([]);
  const [dadRuns, setDadRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [mbRes, dbRes, mrRes, drRes] = await Promise.all([
        fetch("/api/buffer/1"),
        fetch("/api/buffer/2"),
        fetch("/api/runs/1"),
        fetch("/api/runs/2"),
      ]);
      const [mb, db, mr, dr] = await Promise.all([
        mbRes.json(), dbRes.json(), mrRes.json(), drRes.json(),
      ]);
      setMomBuffer(mb);
      setDadBuffer(db);
      setMomRuns(mr.map((r: Run) => ({ ...r, user_id: 1 })));
      setDadRuns(dr.map((r: Run) => ({ ...r, user_id: 2 })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  // Combined buffer stats
  const totalBalance = (momBuffer?.balance ?? 0) + (dadBuffer?.balance ?? 0);
  const totalBurn = (momBuffer?.avgDailyBurn ?? 0) + (dadBuffer?.avgDailyBurn ?? 0);
  const combinedRunway = totalBurn > 0 ? totalBalance / totalBurn : null;

  // This week's earnings
  const cutoff = getMonday();
  const momWeek = momRuns.filter((r) => r.date >= cutoff).reduce((s, r) => s + r.net, 0);
  const dadWeek = dadRuns.filter((r) => r.date >= cutoff).reduce((s, r) => s + r.net, 0);
  const totalWeek = momWeek + dadWeek;
  const weeklyTarget = 1600; // combined household target
  const weekPct = Math.min(100, weeklyTarget > 0 ? (totalWeek / weeklyTarget) * 100 : 0);

  // Merged recent runs, sorted by date desc
  const allRuns = [...momRuns, ...dadRuns]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Mom + Dad</h1>
        <span className="text-xs text-zinc-400 uppercase">Gig</span>
      </div>

      {/* Combined Runway — Primary KPI */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Combined Runway</p>
        <p
          className={`font-bold leading-none ${runwayColor(combinedRunway)}`}
          style={{ fontSize: "72px" }}
        >
          {combinedRunway !== null ? Math.floor(combinedRunway) : "—"}
        </p>
        <p className="text-zinc-400 text-sm mt-1">days</p>
        {combinedRunway !== null && combinedRunway < 7 && (
          <p className="mt-2 text-xs text-red-500 font-medium">Top up your buffer soon.</p>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          Buffer: <span className="text-zinc-700 font-medium">${totalBalance.toFixed(2)}</span>
          {totalBurn > 0 && (
            <span> · Burn: ${totalBurn.toFixed(2)}/day</span>
          )}
        </p>
      </div>

      {/* Individual buffer split */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
          <p className="text-xs text-zinc-400 mb-1">Mom's Buffer</p>
          <p className="text-xl font-bold text-zinc-800">${(momBuffer?.balance ?? 0).toFixed(0)}</p>
          <p className={`text-xs mt-1 ${runwayColor(momBuffer?.runway ?? null)}`}>
            {momBuffer?.runway != null ? `${Math.floor(momBuffer.runway)}d runway` : "No burn data"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
          <p className="text-xs text-zinc-400 mb-1">Dad's Buffer</p>
          <p className="text-xl font-bold text-zinc-800">${(dadBuffer?.balance ?? 0).toFixed(0)}</p>
          <p className={`text-xs mt-1 ${runwayColor(dadBuffer?.runway ?? null)}`}>
            {dadBuffer?.runway != null ? `${Math.floor(dadBuffer.runway)}d runway` : "No burn data"}
          </p>
        </div>
      </div>

      {/* This week combined */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">This Week</p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl font-bold text-zinc-800">${totalWeek.toFixed(0)}</p>
            <p className="text-xs text-zinc-400">combined net</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-zinc-500">${weeklyTarget}</p>
            <p className="text-xs text-zinc-400">target</p>
          </div>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${
              weekPct >= 100 ? "bg-emerald-500" : "bg-amber-400"
            }`}
            style={{ width: `${weekPct}%` }}
          />
        </div>
        {/* Individual breakdown */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-zinc-500">
          <div className="bg-zinc-50 rounded-lg px-3 py-2">
            <p className="text-zinc-400 mb-0.5">Mom</p>
            <p className="font-semibold text-zinc-700">${momWeek.toFixed(0)}</p>
          </div>
          <div className="bg-zinc-50 rounded-lg px-3 py-2">
            <p className="text-zinc-400 mb-0.5">Dad</p>
            <p className="font-semibold text-zinc-700">${dadWeek.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Action nav */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/gig/1/log"
          className="bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          + Mom's Run
        </Link>
        <Link
          href="/gig/2/log"
          className="bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          + Dad's Run
        </Link>
        <Link
          href="/gig/1"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Mom's Dashboard
        </Link>
        <Link
          href="/gig/2"
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
        >
          Dad's Dashboard
        </Link>
      </div>

      {/* Recent runs — both */}
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Recent Runs</p>
        {allRuns.length === 0 ? (
          <p className="text-zinc-400 text-sm">No runs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {allRuns.map((r) => (
              <div
                key={`${r.user_id}-${r.id}`}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">
                      {r.user_id === 1 ? "Mom" : "Dad"}
                    </span>
                    <p className="text-sm font-medium text-zinc-800">{r.date}</p>
                  </div>
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
