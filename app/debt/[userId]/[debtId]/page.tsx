"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Debt {
  id: number; name: string; balance: number; original_balance: number;
  minimum_payment: number; interest_rate: number; debt_type: string;
}
interface Payment {
  id: number; amount: number; date: string; payment_type: string; note: string;
}

const PAYMENT_TYPE_LABELS: Record<string, { label: string; hint: string }> = {
  minimum:  { label: "Minimum payment",  hint: "The required monthly minimum to stay current" },
  extra:    { label: "Extra payment",    hint: "Paying more than the minimum to pay down faster" },
  lump_sum: { label: "Lump sum",         hint: "A one-time larger payment (bonus, tax refund, etc.)" },
};

const today = new Date().toISOString().slice(0, 10);

export default function DebtDetail() {
  const { userId, debtId } = useParams<{ userId: string; debtId: string }>();
  const router = useRouter();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [mode, setMode] = useState<"payment" | "balance_update">("payment");
  const [amount, setAmount] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [date, setDate] = useState(today);
  const [payType, setPayType] = useState("minimum");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/debt/${userId}/${debtId}`);
    const d = await res.json();
    setDebt(d.debt);
    setPayments(d.payments);
    if (d.debt) setNewBalance(String(d.debt.balance.toFixed(2)));
  }

  useEffect(() => { load(); }, [debtId]);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (mode === "balance_update") {
      await fetch(`/api/debt/${userId}/${debtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_balance: Number(newBalance), date, note }),
      });
    } else {
      await fetch(`/api/debt/${userId}/${debtId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), date, payment_type: payType, note }),
      });
    }

    setSaving(false);
    setAmount(""); setNote("");
    await load();
  }

  async function handleDelete() {
    await fetch(`/api/debt/${userId}/${debtId}`, { method: "DELETE" });
    router.push(`/debt/${userId}`);
  }

  if (!debt) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <p className="text-zinc-400 text-sm">Loading…</p>
    </div>
  );

  const paid = debt.original_balance > 0
    ? Math.min(100, ((debt.original_balance - debt.balance) / debt.original_balance) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/debt/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800 truncate mx-2">{debt.name}</h1>
        <button onClick={handleDelete} className="text-zinc-300 hover:text-red-400 text-sm py-1 px-2">Delete</button>
      </div>

      {/* Balance card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Balance Remaining</p>
            <p className="text-3xl font-bold text-zinc-800">${debt.balance.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Started at</p>
            <p className="text-sm text-zinc-500">${debt.original_balance.toFixed(2)}</p>
            {debt.interest_rate > 0 && (
              <p className="text-xs text-zinc-400 mt-1">{debt.interest_rate}% APR</p>
            )}
          </div>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paid}%` }} />
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-zinc-400">{paid.toFixed(0)}% paid off</p>
          <p className="text-xs text-zinc-400">Min: ${debt.minimum_payment.toFixed(2)}/mo</p>
        </div>
      </div>

      {/* Log form */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-200 mb-2">
          <button onClick={() => setMode("payment")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "payment" ? "bg-zinc-800 text-white" : "bg-white text-zinc-500"}`}>
            I Made a Payment
          </button>
          <button onClick={() => setMode("balance_update")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "balance_update" ? "bg-zinc-800 text-white" : "bg-white text-zinc-500"}`}>
            Correct the Balance
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          {mode === "payment"
            ? "Use this when you've actually paid money toward this debt — it reduces the balance by the amount you paid."
            : "Use this when your statement shows a different number (e.g. interest was added, or you want to sync with your actual account balance)."}
        </p>

        <form onSubmit={handlePayment} className="flex flex-col gap-3">
          {mode === "payment" ? (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-400">Amount paid ($)</label>
                  {debt.minimum_payment > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(debt.minimum_payment.toFixed(2)))}
                      className="text-xs text-zinc-500 border border-zinc-200 rounded px-2 py-0.5 hover:border-zinc-400"
                    >
                      Fill minimum (${debt.minimum_payment.toFixed(2)})
                    </button>
                  )}
                </div>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={amount}
                  onChange={(e) => setAmount(e.target.value)} className="input" required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Payment type</label>
                <select value={payType} onChange={(e) => setPayType(e.target.value)} className="input">
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400">{PAYMENT_TYPE_LABELS[payType]?.hint}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">New balance ($) — enter what your statement shows</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)} className="input" required />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>

          <input type="text" placeholder="Note (optional — e.g. 'paid from tax refund')" value={note}
            onChange={(e) => setNote(e.target.value)} className="input" />

          <button type="submit" disabled={saving}
            className="bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? "Saving…" : mode === "payment" ? "Record Payment" : "Update Balance"}
          </button>
        </form>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Payment History</p>
          <div className="flex flex-col gap-2">
            {payments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm text-zinc-700">{p.date}</p>
                  <p className="text-xs text-zinc-400">
                    {PAYMENT_TYPE_LABELS[p.payment_type]?.label ?? p.payment_type.replace("_", " ")}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-600">-${p.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .input { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 12px;
          font-size: 16px; background: white; color: #18181b; outline: none; width: 100%; }
        .input:focus { border-color: #a1a1aa; }
      `}</style>
    </div>
  );
}
