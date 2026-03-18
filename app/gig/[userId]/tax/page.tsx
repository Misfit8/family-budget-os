"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface TaxData {
  year: number;
  ytdGross: number;
  ytdMiles: number;
  mileageDeduction: number;
  netTaxable: number;
  seEstimate: number;
  setAside: number;
  remaining: number;
  nextDue: { label: string; date: string; daysAway: number };
}

export default function TaxPage() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<TaxData | null>(null);
  const [setAsideInput, setSetAsideInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch(`/api/tax/${userId}`);
    const d = await res.json();
    setData(d);
    setSetAsideInput(String(d.setAside));
  }

  useEffect(() => { load(); }, [userId]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tax/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set_aside: Number(setAsideInput) }),
    });
    setSaving(false);
    setSaved(true);
    load();
    setTimeout(() => setSaved(false), 2000);
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  const pct = data.seEstimate > 0 ? Math.min(100, (data.setAside / data.seEstimate) * 100) : 100;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/gig/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Tax Tracker {data.year}</h1>
      </div>

      {/* Next deadline */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Next Quarterly Due</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold text-zinc-800">{data.nextDue.label} — {data.nextDue.date}</p>
            <p className="text-sm text-zinc-400">{data.nextDue.daysAway} days away</p>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-lg ${
              data.nextDue.daysAway <= 14
                ? "bg-red-100 text-red-600"
                : data.nextDue.daysAway <= 30
                ? "bg-amber-100 text-amber-600"
                : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {data.nextDue.daysAway <= 14 ? "Soon" : data.nextDue.daysAway <= 30 ? "Coming up" : "On track"}
          </span>
        </div>
      </div>

      {/* YTD breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">YTD Breakdown</p>
        <div className="flex flex-col gap-2">
          <Row label="Gross Earnings" value={`$${data.ytdGross.toFixed(2)}`} />
          <Row label={`Miles (${data.ytdMiles.toFixed(1)} mi × $0.67)`} value={`-$${data.mileageDeduction.toFixed(2)}`} sub />
          <div className="border-t border-zinc-100 pt-2">
            <Row label="Net Taxable" value={`$${data.netTaxable.toFixed(2)}`} bold />
            <Row label="SE Tax Estimate (15%)" value={`$${data.seEstimate.toFixed(2)}`} highlight />
          </div>
        </div>
      </div>

      {/* Set aside tracker */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Set Aside</p>

        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          ${data.setAside.toFixed(2)} saved · ${data.remaining.toFixed(2)} still needed
        </p>

        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={setAsideInput}
            onChange={(e) => setSetAsideInput(e.target.value)}
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="0.00"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-zinc-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saved ? "Saved!" : saving ? "…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  sub?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-sm ${sub ? "text-zinc-400" : "text-zinc-600"}`}>{label}</span>
      <span
        className={`text-sm ${
          highlight
            ? "text-amber-600 font-semibold"
            : bold
            ? "text-zinc-800 font-semibold"
            : sub
            ? "text-zinc-400"
            : "text-zinc-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
