"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DigestCard from "@/app/components/DigestCard";

interface W2Data {
  configured: boolean;
  net_take_home?: number;
  pay_frequency?: string;
  next_payday?: string;
  days_to_payday?: number;
  freq_days?: number;
}

const FREQ_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semimonthly: "Twice a month",
  monthly: "Monthly",
};

export default function W2Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<W2Data | null>(null);
  const [editing, setEditing] = useState(false);

  // Form state
  const [netInput, setNetInput] = useState("");
  const [freqInput, setFreqInput] = useState("biweekly");
  const [nextPayInput, setNextPayInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/w2/${userId}`);
    const d = await res.json();
    setData(d);
    if (!d.configured) setEditing(true);
    else {
      setNetInput(String(d.net_take_home));
      setFreqInput(d.pay_frequency);
      setNextPayInput(d.next_payday);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/w2/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        net_take_home: Number(netInput),
        pay_frequency: freqInput,
        next_payday: nextPayInput,
      }),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  // Payday progress bar: how far through the pay cycle are we?
  const freqDays = data.freq_days ?? 14;
  const daysToPayday = data.days_to_payday ?? 0;
  const daysElapsed = freqDays - daysToPayday;
  const cyclePct = Math.max(0, Math.min(100, (daysElapsed / freqDays) * 100));

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Bro1</h1>
        <span className="text-xs text-zinc-400 uppercase">W-2</span>
      </div>

      {!editing && <DigestCard userId={userId} />}

      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-5">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Pay Settings</p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Net Take-Home ($)</label>
            <p className="text-xs text-zinc-400 mb-1">Your actual deposit after taxes and deductions.</p>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={netInput}
              onChange={(e) => setNetInput(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Pay Frequency</label>
            <select
              value={freqInput}
              onChange={(e) => setFreqInput(e.target.value)}
              className="input"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks (biweekly)</option>
              <option value="semimonthly">Twice a month (1st & 15th)</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Next Payday</label>
            <input
              type="date"
              value={nextPayInput}
              onChange={(e) => setNextPayInput(e.target.value)}
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
      ) : (
        <>
          {/* Next payday countdown */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Next Payday</p>
            <p className="font-bold text-zinc-800 leading-none" style={{ fontSize: "72px" }}>
              {daysToPayday}
            </p>
            <p className="text-zinc-400 text-sm mt-1">days</p>
            <p className="text-zinc-500 text-sm mt-2">{data.next_payday}</p>
          </div>

          {/* Pay cycle progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Pay Cycle</p>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${cyclePct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Last payday</span>
              <span>{daysToPayday}d left</span>
            </div>
          </div>

          {/* Take-home */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Expected Deposit</p>
            <p className="text-3xl font-bold text-zinc-800">${data.net_take_home?.toFixed(2)}</p>
            <p className="text-xs text-zinc-400 mt-1">{FREQ_LABEL[data.pay_frequency ?? ""] ?? data.pay_frequency}</p>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="w-full border border-zinc-200 text-zinc-600 rounded-xl py-3 text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            Edit Pay Settings
          </button>
        </>
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
