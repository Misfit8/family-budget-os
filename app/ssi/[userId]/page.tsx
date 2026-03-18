"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DigestCard from "@/app/components/DigestCard";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";

interface SSIData {
  countable_assets: number;
  able_account: number;
  limit: number;
  remaining: number;
  status: "green" | "amber" | "red" | "crisis";
  updated_at: string | null;
}

const STATUS_CONFIG = {
  green:  { color: "text-emerald-500", bg: "bg-emerald-50",  border: "border-emerald-200", label: "On track",   bar: "bg-emerald-500" },
  amber:  { color: "text-amber-500",   bg: "bg-amber-50",    border: "border-amber-200",   label: "Approaching limit", bar: "bg-amber-400" },
  red:    { color: "text-red-500",     bg: "bg-red-50",      border: "border-red-200",     label: "Near limit", bar: "bg-red-500" },
  crisis: { color: "text-red-600",     bg: "bg-red-50",      border: "border-red-300",     label: "At limit",   bar: "bg-red-600" },
};

const STATUS_MSG = {
  green:  null,
  amber:  "Your countable assets are approaching the SSI limit. Avoid adding to countable savings right now.",
  red:    "Your countable assets are close to the SSI limit. Consider an ABLE account for new savings. This is not legal advice.",
  crisis: "Your countable assets have reached or exceeded the SSI limit. Contact SSA immediately. This is not legal advice.",
};

export default function SSIDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<SSIData | null>(null);

  async function load() {
    const res = await fetch(`/api/ssi/${userId}`);
    setData(await res.json());
  }

  useEffect(() => { load(); }, [userId]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[data.status];
  const pct = Math.min(100, (data.countable_assets / data.limit) * 100);
  const msg = STATUS_MSG[data.status];

  // Next SSI payment — SSI pays on the 1st (or prior business day)
  const today = new Date();
  const thisFirst = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const payDate = today <= thisFirst ? thisFirst : nextFirst;
  const daysToPayment = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const payDateStr = payDate.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Braddon</h1>
        <span className="text-xs text-zinc-400 uppercase">SSI</span>
      </div>

      {/* Notifications */}
      <NotificationBanner userId={userId} />

      {/* Weekly Digest */}
      <DigestCard userId={userId} />

      {/* Asset limit guard — always rendered */}
      <div className={`rounded-2xl border p-5 mb-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-zinc-400">Countable Assets</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg bg-white ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-end justify-between mb-3">
          <p className={`text-4xl font-bold ${cfg.color}`}>
            ${data.countable_assets.toFixed(2)}
          </p>
          <p className="text-sm text-zinc-400">/ $2,000 limit</p>
        </div>

        <div className="h-3 bg-white rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-zinc-400">
          <span>${data.remaining.toFixed(2)} remaining</span>
          <span>{pct.toFixed(0)}% of limit</span>
        </div>
      </div>

      {/* Alert message */}
      {msg && (
        <div className={`rounded-xl border px-4 py-3 mb-4 text-sm ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          {msg}
        </div>
      )}

      {/* ABLE account */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">ABLE Account</p>
        <p className="text-2xl font-bold text-zinc-800">${data.able_account.toFixed(2)}</p>
        <p className="text-xs text-zinc-400 mt-1">Not counted toward SSI limit</p>
      </div>

      {/* Next payment */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Next SSI Payment</p>
        <p className="text-2xl font-bold text-zinc-800">{payDateStr}</p>
        <p className="text-xs text-zinc-400 mt-1">
          {daysToPayment === 0 ? "Today" : `${daysToPayment} day${daysToPayment === 1 ? "" : "s"} away`}
        </p>
      </div>

      {/* Nav */}
      <Link
        href={`/ssi/${userId}/assets`}
        className="block w-full bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        Update Assets
      </Link>

      <Link
        href={`/debt/${userId}`}
        className="block w-full mt-3 border border-zinc-200 text-zinc-600 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors"
      >
        Debt Freedom
      </Link>

      <GoalsSection userId={userId} incomeType="ssi" />
    </div>
  );
}
