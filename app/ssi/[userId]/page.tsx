"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";
import HelpTip from "@/app/components/HelpTip";

interface SSIData {
  countable_assets: number;
  able_account: number;
  limit: number;
  remaining: number;
  status: "green" | "amber" | "red" | "crisis";
  updated_at: string | null;
}

const STATUS_CONFIG = {
  green:  { color: "text-emerald-500", bg: "bg-emerald-50",  border: "border-emerald-200", label: "On track",          bar: "bg-emerald-500" },
  amber:  { color: "text-amber-500",   bg: "bg-amber-50",    border: "border-amber-200",   label: "Approaching limit", bar: "bg-amber-400" },
  red:    { color: "text-red-500",     bg: "bg-red-50",      border: "border-red-200",     label: "Near limit",        bar: "bg-red-500" },
  crisis: { color: "text-red-600",     bg: "bg-red-50",      border: "border-red-300",     label: "At limit",          bar: "bg-red-600" },
};

const STATUS_MSG = {
  green:  null,
  amber:  "Your savings are approaching the SSI limit. Avoid adding to regular savings right now.",
  red:    "Your savings are close to the SSI limit. Consider using an ABLE account for new savings. This is not legal advice.",
  crisis: "Your savings have reached or exceeded the SSI limit. Contact SSA immediately. This is not legal advice.",
};

export default function SSIDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<SSIData | null>(null);
  const [userName, setUserName] = useState("");

  async function load() {
    const res = await fetch(`/api/ssi/${userId}`);
    setData(await res.json());
  }

  useEffect(() => {
    load();
    fetch(`/api/users/${userId}`).then(r => r.json()).then(u => setUserName(u.name ?? ""));
  }, [userId]);

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

  const today = new Date();
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + (today.getDate() === 1 ? 0 : 1), 1);
  const daysToPayment = today.getDate() === 1 ? 0 : Math.ceil((nextFirst.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const payDateStr = nextFirst.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">{userName || "…"}</h1>
        <Link href="/help" className="text-xs text-zinc-400 border border-zinc-200 rounded-lg px-2 py-1 hover:border-zinc-400">
          Help ?
        </Link>
      </div>

      <NotificationBanner userId={userId} />

      {/* Asset limit guard */}
      <div className={`rounded-2xl border p-5 mb-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <p className="text-xs uppercase tracking-widest text-zinc-400">Savings Balance</p>
            <HelpTip explanation="The total of your cash and bank accounts that SSA counts toward your $2,000 limit. If this exceeds $2,000, you may lose SSI benefits. This is not legal advice." />
          </div>
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
          <span>${data.remaining.toFixed(2)} remaining before limit</span>
          <span>{pct.toFixed(0)}% used</span>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 mb-4 text-sm ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          {msg}
        </div>
      )}

      {/* ABLE account */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <div className="flex items-center gap-1 mb-1">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">ABLE Account</p>
          <HelpTip explanation="A special savings account for people with disabilities. Money here does NOT count toward your $2,000 SSI limit. You can save up to $100,000 in an ABLE account. This is not legal advice." />
        </div>
        <p className="text-2xl font-bold text-zinc-800">${data.able_account.toFixed(2)}</p>
        <p className="text-xs text-zinc-400 mt-1">Doesn't count toward your SSI limit</p>
      </div>

      {/* Next payment */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Next SSI Payment</p>
        <p className="text-2xl font-bold text-zinc-800">{payDateStr}</p>
        <p className="text-xs text-zinc-400 mt-1">
          {daysToPayment === 0 ? "Today" : `${daysToPayment} day${daysToPayment === 1 ? "" : "s"} away`}
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Link href={`/ssi/${userId}/assets`}
          className="col-span-2 bg-zinc-800 text-white rounded-xl py-3 text-center text-sm font-medium hover:bg-zinc-700 transition-colors">
          Update My Savings
        </Link>
        <Link href={`/digest/${userId}`}
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Weekly Digest ✦
        </Link>
        <Link href={`/debt/${userId}`}
          className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
          Debt Freedom
        </Link>
      </div>

      <GoalsSection userId={userId} incomeType="ssi" />
    </div>
  );
}
