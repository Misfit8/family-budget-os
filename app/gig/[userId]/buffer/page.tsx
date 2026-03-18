"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BufferEntry {
  id: number;
  date: string;
  amount: number;
  type: string;
  note: string;
}

interface BufferData {
  balance: number;
  avgDailyBurn: number;
  runway: number | null;
  history: BufferEntry[];
}

const today = new Date().toISOString().slice(0, 10);

export default function BufferPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<BufferData | null>(null);
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/buffer/${userId}`);
    setData(await res.json());
  }

  useEffect(() => { load(); }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Enter a valid amount."); return; }
    setError("");
    setSaving(true);

    const res = await fetch("/api/buffer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(userId),
        date,
        amount: Number(amount),
        type,
        note: note || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setAmount("");
      setNote("");
      load();
    } else {
      setError("Failed to save.");
    }
  }

  const balance = data?.balance ?? 0;
  const runway = data?.runway ?? null;

  function runwayColor(days: number | null) {
    if (days === null) return "text-zinc-400";
    if (days > 14) return "text-emerald-500";
    if (days >= 7) return "text-amber-500";
    return "text-red-500";
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Buffer</h1>
      </div>

      {/* Balance + runway */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Balance</p>
          <p className="text-3xl font-bold text-zinc-800">${balance.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Runway</p>
          <p className={`text-3xl font-bold ${runwayColor(runway)}`}>
            {runway !== null ? `${Math.floor(runway)}d` : "—"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4 flex flex-col gap-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">New Entry</p>

        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-200">
          <button
            type="button"
            onClick={() => setType("deposit")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              type === "deposit" ? "bg-emerald-500 text-white" : "bg-white text-zinc-500"
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setType("withdrawal")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              type === "withdrawal" ? "bg-red-400 text-white" : "bg-white text-zinc-500"
            }`}
          >
            Withdrawal
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Note (optional)</label>
          <input
            type="text"
            placeholder="e.g. Weekly salary transfer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${type === "deposit" ? "Deposit" : "Withdrawal"}`}
        </button>
      </form>

      {/* History */}
      <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">History</p>
      {!data || data.history.length === 0 ? (
        <p className="text-zinc-400 text-sm">No entries yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.history.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">{entry.date}</p>
                {entry.note && <p className="text-xs text-zinc-400">{entry.note}</p>}
              </div>
              <p className={`text-sm font-semibold ${entry.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {entry.amount >= 0 ? "+" : ""}${Math.abs(entry.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .input {
          border: 1px solid #e4e4e7;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 16px;
          background: white;
          color: #18181b;
          outline: none;
          width: 100%;
        }
        .input:focus { border-color: #a1a1aa; }
      `}</style>
    </div>
  );
}
