"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface TellerAccount {
  account_id: string;
  account_name: string;
  account_subtype: string;
  last_four: string;
  institution: string;
  balance_available: number | null;
  balance_ledger: number | null;
  last_synced: string | null;
}

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
}

interface MonthSummary {
  month: string;
  totalIn: number;
  totalOut: number;
  byCategory: Record<string, number>;
}

interface Props {
  userId: number | string;
  label?: string;
}

function offsetMonth(base: string, delta: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function BankAccountsSection({ userId, label }: Props) {
  const today = new Date().toISOString().slice(0, 7);
  const [accounts, setAccounts] = useState<TellerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Transactions panel
  const [showTxns, setShowTxns] = useState(false);
  const [txnMonth, setTxnMonth] = useState(today);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  // Trends panel
  const [showTrends, setShowTrends] = useState(false);
  const [trends, setTrends] = useState<MonthSummary[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsLoaded, setTrendsLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/teller/accounts/${userId}`)
      .then((r) => r.json())
      .then((data) => { setAccounts(data.accounts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const loadTransactions = useCallback(async (month: string) => {
    setTxnLoading(true);
    try {
      const res = await fetch(`/api/teller/transactions/${userId}?month=${month}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
    } catch (e) {
      console.error("Transactions load failed:", e);
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (showTxns) loadTransactions(txnMonth);
  }, [showTxns, txnMonth, loadTransactions]);

  async function loadTrends() {
    if (trendsLoaded) return;
    setTrendsLoading(true);
    try {
      const months = Array.from({ length: 6 }, (_, i) => offsetMonth(today, -i)).reverse();
      const results = await Promise.all(
        months.map((m) =>
          fetch(`/api/teller/transactions/${userId}?month=${m}`)
            .then((r) => r.json())
            .then((d) => ({ month: m, totalIn: d.totalIn ?? 0, totalOut: d.totalOut ?? 0, byCategory: d.byCategory ?? {} } as MonthSummary))
            .catch(() => ({ month: m, totalIn: 0, totalOut: 0, byCategory: {} } as MonthSummary))
        )
      );
      setTrends(results);
    } catch (e) {
      console.error("Trends load failed:", e);
    } finally {
      setTrendsLoading(false);
      setTrendsLoaded(true);
    }
  }

  function toggleTrends() {
    setShowTrends((p) => !p);
    if (!trendsLoaded) loadTrends();
  }

  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">{label ?? "Bank Accounts"}</p>
        <Link href="/accounts" className="block bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-400 hover:border-zinc-400 transition-colors">
          No accounts linked — tap to link →
        </Link>
      </div>
    );
  }

  const totalAvailable = accounts.reduce((s, a) => s + (a.balance_available ?? 0), 0);
  const lastSynced = accounts.map((a) => a.last_synced).filter(Boolean).sort().pop();

  // Trends calcs
  const maxOut = Math.max(...trends.map((t) => t.totalOut), 1);
  const maxIn = Math.max(...trends.map((t) => t.totalIn), 1);
  const avgIn = trends.length ? trends.reduce((s, t) => s + t.totalIn, 0) / trends.length : 0;
  const avgOut = trends.length ? trends.reduce((s, t) => s + t.totalOut, 0) / trends.length : 0;
  const allCats: Record<string, number[]> = {};
  for (const t of trends) {
    for (const [cat, amt] of Object.entries(t.byCategory)) {
      if (!allCats[cat]) allCats[cat] = [];
      allCats[cat].push(amt);
    }
  }
  const topCats = Object.entries(allCats)
    .map(([cat, vals]) => ({ cat, avg: vals.reduce((s, v) => s + v, 0) / trends.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">{label ?? "Bank Accounts"}</p>
        <Link href="/accounts" className="text-xs text-zinc-400 hover:text-zinc-600">Manage →</Link>
      </div>

      {/* Total balance — large panel */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-3 text-center">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Available</p>
        <p className="text-5xl font-bold text-zinc-800 leading-none">${totalAvailable.toFixed(2)}</p>
        {lastSynced && <p className="text-xs text-zinc-400 mt-2">synced {lastSynced.slice(0, 10)}</p>}
        {accounts.length > 1 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2">
            {accounts.map((acct) => (
              <div key={acct.account_id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{acct.institution} •••• {acct.last_four}</span>
                <span className="font-medium text-zinc-700">
                  {acct.balance_available != null ? `$${acct.balance_available.toFixed(2)}` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
        {accounts.length === 1 && (
          <p className="text-xs text-zinc-400 mt-1">
            {accounts[0].institution} · {accounts[0].account_name} •••• {accounts[0].last_four}
          </p>
        )}
      </div>

      {/* Trends panel */}
      <button
        onClick={toggleTrends}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600 hover:border-zinc-400 transition-colors mb-2"
      >
        <span>Spending & Saving Trends</span>
        <span className="text-zinc-400">{showTrends ? "−" : "+"}</span>
      </button>

      {showTrends && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-2">
          {trendsLoading ? (
            <p className="text-xs text-zinc-400 text-center py-2">Loading…</p>
          ) : (
            <>
              {/* Averages */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Avg monthly in</p>
                  <p className="text-lg font-bold text-emerald-600">${avgIn.toFixed(0)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-zinc-400 mb-1">Avg monthly out</p>
                  <p className="text-lg font-bold text-red-500">${avgOut.toFixed(0)}</p>
                </div>
              </div>

              {/* Month-by-month bars */}
              <p className="text-xs text-zinc-400 mb-3">Last 6 months</p>
              <div className="flex flex-col gap-3">
                {trends.map((t) => {
                  const net = t.totalIn - t.totalOut;
                  return (
                    <div key={t.month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-500">{formatMonthLabel(t.month)}</span>
                        <span className={`text-xs font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {net >= 0 ? "+" : ""}${net.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 w-4">↑</span>
                          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(t.totalIn / maxIn) * 100}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-14 text-right">${t.totalIn.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 w-4">↓</span>
                          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${(t.totalOut / maxOut) * 100}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-14 text-right">${t.totalOut.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top categories */}
              {topCats.length > 0 && (
                <div className="mt-5 pt-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-3">Avg monthly spend by category</p>
                  <div className="flex flex-col gap-2">
                    {topCats.map(({ cat, avg }) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600 capitalize">{cat.replace(/_/g, " ")}</span>
                        <span className="text-xs font-medium text-zinc-700">${avg.toFixed(0)}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Transactions panel */}
      <button
        onClick={() => setShowTxns((p) => !p)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600 hover:border-zinc-400 transition-colors"
      >
        <span>Transactions</span>
        <span className="text-zinc-400">{showTxns ? "−" : "+"}</span>
      </button>

      {showTxns && (
        <div className="mt-2">
          {/* Month navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-3 py-2 mb-2">
            <button
              onClick={() => setTxnMonth((p) => offsetMonth(p, -1))}
              className="text-zinc-400 hover:text-zinc-700 px-3 py-2 text-lg"
            >‹</button>
            <span className="text-sm font-medium text-zinc-700">{formatMonthLabel(txnMonth)}</span>
            <button
              onClick={() => setTxnMonth((p) => offsetMonth(p, 1))}
              disabled={txnMonth >= today}
              className="text-zinc-400 hover:text-zinc-700 px-3 py-2 text-lg disabled:opacity-30"
            >›</button>
          </div>

          {txnLoading ? (
            <p className="text-xs text-zinc-400 text-center py-3">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-zinc-400 px-1 py-2">No transactions for {formatMonthLabel(txnMonth)}.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.slice(0, 50).map((txn) => (
                <div key={txn.transaction_id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-zinc-800 truncate">{txn.description}</p>
                    <p className="text-xs text-zinc-400">
                      {txn.date}{txn.category ? ` · ${txn.category.replace(/_/g, " ")}` : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${txn.type === "credit" ? "text-emerald-600" : "text-zinc-700"}`}>
                    {txn.type === "credit" ? "+" : "-"}${txn.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
