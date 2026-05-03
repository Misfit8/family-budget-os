"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TellerConnect from "@/app/components/TellerConnect";

interface User {
  id: number;
  name: string;
  income_type: string;
}

interface TellerAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  last_four: string;
  institution: string;
  balance_available: number | null;
  balance_ledger: number | null;
  last_synced: string | null;
}

interface TellerEnrollment {
  enrollment_id: string;
  institution: string;
  created_at: string;
}

interface Transaction {
  transaction_id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  account_id: string;
}

interface TxnData {
  transactions: Transaction[];
  totalIn: number;
  totalOut: number;
  byCategory: Record<string, number>;
  month: string;
}

function offsetMonth(base: string, delta: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function AccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accountData, setAccountData] = useState<Record<number, { accounts: TellerAccount[]; enrollments: TellerEnrollment[] }>>({});
  const [txnData, setTxnData] = useState<Record<number, TxnData>>({});
  const [syncing, setSyncing] = useState<Record<number, boolean>>({});
  const [activeUser, setActiveUser] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((data: User[]) => {
      setUsers(data);
      if (data.length > 0) setActiveUser(data[0].id);
    });
  }, []);

  const loadAccounts = useCallback(async (userList: User[]) => {
    if (userList.length === 0) return;
    const results = await Promise.all(
      userList.map(async (u) => {
        const res = await fetch(`/api/teller/accounts/${u.id}`);
        return { id: u.id, data: await res.json() };
      })
    );
    const map: typeof accountData = {};
    for (const r of results) map[r.id] = r.data;
    setAccountData(map);
  }, []);

  const loadTransactions = useCallback(async (userList: User[], month: string) => {
    if (userList.length === 0) return;
    const results = await Promise.all(
      userList.map(async (u) => {
        const res = await fetch(`/api/teller/transactions/${u.id}?month=${month}`);
        return { id: u.id, data: await res.json() };
      })
    );
    const map: typeof txnData = {};
    for (const r of results) map[r.id] = r.data;
    setTxnData(map);
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      loadAccounts(users);
      loadTransactions(users, selectedMonth);
    }
  }, [users, selectedMonth, loadAccounts, loadTransactions]);

  async function sync(userId: number) {
    setSyncing((p) => ({ ...p, [userId]: true }));
    await fetch(`/api/teller/sync/${userId}`, { method: "POST" });
    setSyncing((p) => ({ ...p, [userId]: false }));
    await Promise.all([loadAccounts(users), loadTransactions(users, selectedMonth)]);
  }

  async function unlink(userId: number, enrollmentId: string) {
    await fetch(`/api/teller/accounts/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId }),
    });
    loadAccounts(users);
  }

  const combinedTotalIn = users.reduce((s, u) => s + (txnData[u.id]?.totalIn ?? 0), 0);
  const combinedTotalOut = users.reduce((s, u) => s + (txnData[u.id]?.totalOut ?? 0), 0);
  const net = combinedTotalIn - combinedTotalOut;

  const allCategories: Record<string, number> = {};
  for (const u of users) {
    for (const [cat, amt] of Object.entries(txnData[u.id]?.byCategory ?? {})) {
      allCategories[cat] = (allCategories[cat] ?? 0) + amt;
    }
  }
  const topCategories = Object.entries(allCategories).sort(([, a], [, b]) => b - a).slice(0, 6);

  const activeData = activeUser ? txnData[activeUser] : null;
  const activeAccounts = activeUser ? accountData[activeUser] : null;
  const activeUserObj = users.find((u) => u.id === activeUser);

  if (users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Accounts</h1>
        <div className="w-10" />
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-2 mb-6">
        <button onClick={() => setSelectedMonth((p) => offsetMonth(p, -1))} className="text-zinc-400 hover:text-zinc-700 text-xl px-4 py-3">‹</button>
        <p className="text-sm font-semibold text-zinc-800">{formatMonthLabel(selectedMonth)}</p>
        <button onClick={() => setSelectedMonth((p) => offsetMonth(p, 1))} className="text-zinc-400 hover:text-zinc-700 text-xl px-4 py-3">›</button>
      </div>

      {/* Household cash flow */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Household Cash Flow</p>
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Money In</p>
            <p className="text-lg font-bold text-emerald-600">${combinedTotalIn.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Money Out</p>
            <p className="text-lg font-bold text-red-500">${combinedTotalOut.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Net</p>
            <p className={`text-lg font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {net >= 0 ? "+" : ""}${net.toFixed(0)}
            </p>
          </div>
        </div>
        {topCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 mb-2">Top spending categories</p>
            <div className="flex flex-col gap-1.5">
              {topCategories.map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 capitalize">{cat.replace(/_/g, " ")}</span>
                  <span className="text-xs font-medium text-zinc-700">${amt.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Member tabs — scrollable for 5 users */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setActiveUser(u.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeUser === u.id
                ? "bg-zinc-800 text-white border-zinc-800"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Linked accounts for active user */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Linked Accounts</p>
          {(activeAccounts?.accounts?.length ?? 0) > 0 && (
            <button
              onClick={() => activeUser && sync(activeUser)}
              disabled={!!activeUser && syncing[activeUser]}
              className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1.5 hover:border-zinc-400 disabled:opacity-50"
            >
              {activeUser && syncing[activeUser] ? "Syncing…" : "Sync Now"}
            </button>
          )}
        </div>

        {(activeAccounts?.accounts?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-3">
            <p className="text-sm text-zinc-500 mb-1">No accounts linked yet.</p>
            <p className="text-xs text-zinc-400">Link a bank account to see real transactions.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-3">
            {activeAccounts!.accounts.map((acct) => (
              <div key={acct.account_id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{acct.institution}</p>
                  <p className="text-xs text-zinc-400">
                    {acct.account_name} •••• {acct.last_four} · {acct.account_subtype}
                  </p>
                  {acct.last_synced && (
                    <p className="text-xs text-zinc-300 mt-0.5">synced {acct.last_synced.slice(0, 10)}</p>
                  )}
                </div>
                <div className="text-right">
                  {acct.balance_available != null && (
                    <p className="text-sm font-semibold text-zinc-800">${acct.balance_available.toFixed(2)}</p>
                  )}
                  {acct.balance_ledger != null && acct.balance_ledger !== acct.balance_available && (
                    <p className="text-xs text-zinc-400">ledger ${acct.balance_ledger.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
            {activeAccounts!.enrollments.map((enr) => (
              <button
                key={enr.enrollment_id}
                onClick={() => activeUser && unlink(activeUser, enr.enrollment_id)}
                className="text-xs text-red-400 hover:text-red-600 text-left px-1 py-1"
              >
                Unlink {enr.institution ?? enr.enrollment_id}
              </button>
            ))}
          </div>
        )}

        {activeUser && (
          <TellerConnect
            userId={activeUser}
            label={`Link ${activeUserObj?.name ?? ""} Bank Account`}
            onConnected={() => { loadAccounts(users); activeUser && sync(activeUser); }}
          />
        )}
      </div>

      {/* Transactions for active user */}
      {(activeData?.transactions?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">
            Transactions — {activeUserObj?.name}
          </p>
          <div className="flex flex-col gap-2">
            {activeData!.transactions.slice(0, 30).map((txn) => (
              <div key={txn.transaction_id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-sm font-medium text-zinc-800 truncate">{txn.description}</p>
                  <p className="text-xs text-zinc-400">
                    {txn.date}{txn.category ? ` · ${txn.category.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${txn.amount > 0 ? "text-emerald-600" : "text-zinc-700"}`}>
                  {txn.amount > 0 ? "+" : ""}${txn.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
