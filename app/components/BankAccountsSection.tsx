"use client";

import { useEffect, useState } from "react";
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

interface Props {
  userId: number | string;
  label?: string;
}

export default function BankAccountsSection({ userId, label }: Props) {
  const [accounts, setAccounts] = useState<TellerAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxns, setShowTxns] = useState(false);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    Promise.all([
      fetch(`/api/teller/accounts/${userId}`).then((r) => r.json()),
      fetch(`/api/teller/transactions/${userId}?month=${month}`).then((r) => r.json()),
    ]).then(([acctData, txnData]) => {
      setAccounts(acctData.accounts ?? []);
      setTransactions(txnData.transactions ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">
          {label ?? "Bank Accounts"}
        </p>
        <Link
          href="/accounts"
          className="block bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-400 hover:border-zinc-400 transition-colors"
        >
          No accounts linked — tap to link →
        </Link>
      </div>
    );
  }

  const totalAvailable = accounts.reduce((s, a) => s + (a.balance_available ?? 0), 0);
  const lastSynced = accounts.map((a) => a.last_synced).filter(Boolean).sort().pop();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">
          {label ?? "Bank Accounts"}
        </p>
        <Link href="/accounts" className="text-xs text-zinc-400 hover:text-zinc-600">Manage →</Link>
      </div>

      {/* Total balance — large panel */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-3 text-center">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Total Available</p>
        <p className="text-5xl font-bold text-zinc-800 leading-none">${totalAvailable.toFixed(2)}</p>
        {lastSynced && (
          <p className="text-xs text-zinc-400 mt-2">synced {lastSynced.slice(0, 10)}</p>
        )}

        {/* Per-account breakdown */}
        {accounts.length > 1 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2">
            {accounts.map((acct) => (
              <div key={acct.account_id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  {acct.institution} •••• {acct.last_four}
                </span>
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

      {/* Transactions — collapsible */}
      <button
        onClick={() => setShowTxns((p) => !p)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600 hover:border-zinc-400 transition-colors"
      >
        <span>
          Transactions this month
          {transactions.length > 0 && (
            <span className="ml-2 text-xs text-zinc-400">({transactions.length})</span>
          )}
        </span>
        <span className="text-zinc-400">{showTxns ? "−" : "+"}</span>
      </button>

      {showTxns && (
        <div className="mt-2 flex flex-col gap-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-zinc-400 px-1 py-2">No transactions this month yet.</p>
          ) : (
            transactions.slice(0, 30).map((txn) => (
              <div
                key={txn.transaction_id}
                className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between"
              >
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
