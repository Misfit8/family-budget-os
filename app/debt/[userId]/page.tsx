"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Debt {
  id: number; name: string; balance: number; original_balance: number;
  minimum_payment: number; interest_rate: number; debt_type: string; is_shared: number;
}
interface PayoffResult { months: number; freedom_date: string; total_interest: number; }
interface DebtData {
  debts: Debt[]; snowball: PayoffResult; avalanche: PayoffResult;
  totalBalance: number; totalMinimum: number;
}
interface Insight {
  recommended_strategy: string; reason: string;
  highest_risk_debt: string; one_change: string; summary: string;
}

const DEBT_TYPE_EMOJI: Record<string, string> = {
  credit_card: "💳", loan: "🏦", medical: "🏥", student: "🎓", other: "📋",
};

const NAMES: Record<string, string> = { "1": "Mom", "2": "Dad", "3": "Braddon", "4": "Bro1", "5": "Bro2" };

export default function DebtDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<DebtData | null>(null);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball");
  const [extra, setExtra] = useState(0);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/debt/${userId}?extra=${extra}&strategy=${strategy}`);
    if (res.ok) setData(await res.json());
  }, [userId, extra, strategy]);

  useEffect(() => { load(); }, [load]);

  async function getInsight() {
    setLoadingInsight(true);
    const res = await fetch("/api/debt/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: Number(userId), monthly_extra: extra }),
    });
    if (res.ok) setInsight(await res.json());
    setLoadingInsight(false);
  }

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <p className="text-zinc-400 text-sm">Loading…</p>
    </div>
  );

  const active = strategy === "snowball" ? data.snowball : data.avalanche;
  const freedomDate = active.freedom_date
    ? new Date(active.freedom_date + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">{NAMES[userId]} · Debt</h1>
        <Link href={`/debt/${userId}/add`} className="text-sm text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1 hover:border-zinc-400">
          + Add
        </Link>
      </div>

      {data.debts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500 text-sm mb-4">No debts tracked yet.</p>
          <Link href={`/debt/${userId}/add`} className="bg-zinc-800 text-white rounded-xl px-6 py-3 text-sm font-medium">
            Add Your First Debt
          </Link>
        </div>
      ) : (
        <>
          {/* Freedom Date */}
          <div className="bg-zinc-800 text-white rounded-2xl p-6 mb-4 text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Debt Freedom</p>
            <p className="text-2xl font-bold leading-tight">{freedomDate}</p>
            <p className="text-zinc-400 text-sm mt-1">{active.months} months away</p>
            <p className="text-xs text-zinc-500 mt-2">
              ${data.totalBalance.toFixed(0)} total · ${active.total_interest.toFixed(0)} interest remaining
            </p>
          </div>

          {/* Strategy toggle */}
          <div className="flex rounded-xl overflow-hidden border border-zinc-200 mb-4">
            {(["snowball", "avalanche"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                  strategy === s ? "bg-zinc-800 text-white" : "bg-white text-zinc-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Extra payment slider */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Extra / Month</p>
              <p className="text-sm font-semibold text-zinc-800">${extra}</p>
            </div>
            <input
              type="range" min="0" max="500" step="25"
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-full accent-zinc-800"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>$0</span>
              {extra > 0 && (
                <span className="text-emerald-600">
                  Saves {data.snowball.months - active.months > 0 ? `${data.snowball.months - active.months}mo` : ""}
                </span>
              )}
              <span>$500</span>
            </div>
          </div>

          {/* Debt list */}
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Debts</p>
          <div className="flex flex-col gap-3 mb-6">
            {data.debts.map((d) => {
              const paid = d.original_balance > 0
                ? Math.min(100, ((d.original_balance - d.balance) / d.original_balance) * 100)
                : 0;
              return (
                <Link key={d.id} href={`/debt/${userId}/${d.id}`}
                  className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-400 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{DEBT_TYPE_EMOJI[d.debt_type] ?? "📋"}</span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{d.name}</p>
                        <p className="text-xs text-zinc-400">
                          {d.interest_rate}% · ${d.minimum_payment}/mo min
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-zinc-800">${d.balance.toFixed(0)}</p>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paid}%` }} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{paid.toFixed(0)}% paid</p>
                </Link>
              );
            })}
          </div>

          {/* Claude insight */}
          {insight ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
              <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Claude Insight</p>
              <p className="text-sm text-zinc-700 mb-3">{insight.summary}</p>
              <div className="flex flex-col gap-2">
                <div className="bg-zinc-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-zinc-400">Recommended</p>
                  <p className="text-sm font-medium text-zinc-800 capitalize">{insight.recommended_strategy} — {insight.reason}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-600">One change</p>
                  <p className="text-sm text-zinc-700">{insight.one_change}</p>
                </div>
              </div>
              <button onClick={getInsight} disabled={loadingInsight} className="mt-3 text-xs text-zinc-400 disabled:opacity-50">
                ↻ Refresh
              </button>
            </div>
          ) : (
            <button
              onClick={getInsight}
              disabled={loadingInsight}
              className="w-full border border-zinc-200 text-zinc-600 rounded-xl py-3 text-sm font-medium hover:border-zinc-400 transition-colors disabled:opacity-50 mb-4"
            >
              {loadingInsight ? "Analyzing…" : "Get Claude Insight ✦"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
