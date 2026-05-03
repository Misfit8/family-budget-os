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

interface Props {
  userId: number | string;
}

export default function BankAccountsSection({ userId }: Props) {
  const [accounts, setAccounts] = useState<TellerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teller/accounts/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return null;

  if (accounts.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Bank Accounts</p>
        <Link
          href="/accounts"
          className="block bg-white rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-400 hover:border-zinc-400 transition-colors"
        >
          No accounts linked — tap to link a bank account →
        </Link>
      </div>
    );
  }

  const totalAvailable = accounts.reduce((s, a) => s + (a.balance_available ?? 0), 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">Bank Accounts</p>
        <Link href="/accounts" className="text-xs text-zinc-400 hover:text-zinc-600">Manage →</Link>
      </div>

      {accounts.length > 1 && (
        <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 mb-2 flex items-center justify-between">
          <p className="text-xs text-zinc-400">Total available</p>
          <p className="text-sm font-bold text-zinc-800">${totalAvailable.toFixed(2)}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {accounts.map((acct) => (
          <div key={acct.account_id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">{acct.institution}</p>
              <p className="text-xs text-zinc-400">
                {acct.account_name} •••• {acct.last_four} · {acct.account_subtype}
              </p>
            </div>
            <div className="text-right">
              {acct.balance_available != null ? (
                <p className="text-sm font-semibold text-zinc-800">${acct.balance_available.toFixed(2)}</p>
              ) : (
                <p className="text-xs text-zinc-400">Sync for balance</p>
              )}
              {acct.balance_ledger != null && acct.balance_ledger !== acct.balance_available && (
                <p className="text-xs text-zinc-400">ledger ${acct.balance_ledger.toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
