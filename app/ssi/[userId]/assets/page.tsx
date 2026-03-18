"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AssetsPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [countable, setCountable] = useState("");
  const [able, setAble] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/ssi/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setCountable(String(d.countable_assets));
        setAble(String(d.able_account));
      });
  }, [userId]);

  // Live status as user types
  const liveCountable = Number(countable) || 0;
  const pct = Math.min(100, (liveCountable / 2000) * 100);
  const status =
    liveCountable >= 2000 ? "crisis" :
    liveCountable >= 1800 ? "red" :
    liveCountable >= 1500 ? "amber" : "green";

  const barColor =
    status === "green" ? "bg-emerald-500" :
    status === "amber" ? "bg-amber-400" :
    "bg-red-500";

  const labelColor =
    status === "green" ? "text-emerald-600" :
    status === "amber" ? "text-amber-600" :
    "text-red-600";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (liveCountable < 0 || Number(able) < 0) {
      setError("Amounts must be 0 or more.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/ssi/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countable_assets: liveCountable,
        able_account: Number(able) || 0,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/ssi/${userId}`);
    } else {
      setError("Failed to save.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/ssi/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Update Assets</h1>
      </div>

      {/* Live limit bar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">SSI Asset Limit</p>
          <span className={`text-xs font-semibold ${labelColor}`}>
            ${liveCountable.toFixed(2)} / $2,000
          </span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-zinc-400">
          <span>${(2000 - liveCountable).toFixed(2)} remaining</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Countable Assets ($)
          </label>
          <p className="text-xs text-zinc-400 mb-1">
            Checking, savings, cash, investments. Does NOT include your home, one car, household items.
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            value={countable}
            onChange={(e) => setCountable(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            ABLE Account Balance ($)
          </label>
          <p className="text-xs text-zinc-400 mb-1">
            ABLE accounts are excluded from the SSI $2,000 countable asset limit (up to $100,000).
          </p>
          <input
            type="number"
            step="0.01"
            min="0"
            value={able}
            onChange={(e) => setAble(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </div>

        {status !== "green" && (
          <div className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
            status === "amber" ? "bg-amber-50 text-amber-700 border border-amber-200" :
            "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {status === "amber" && "You're approaching the SSI limit. Avoid adding to countable savings. This is not legal advice."}
            {status === "red" && "You're close to the SSI limit. New savings should go into an ABLE account. This is not legal advice."}
            {status === "crisis" && "You are at or over the SSI limit. Contact SSA immediately. This is not legal advice."}
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Assets"}
        </button>
      </form>

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
