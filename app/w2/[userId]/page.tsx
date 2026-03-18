"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";
import HelpTip from "@/app/components/HelpTip";

interface W2Data {
  configured: boolean;
  net_take_home?: number;
  pay_frequency?: string;
  next_payday?: string;
  days_to_payday?: number;
  freq_days?: number;
}

const FREQ_LABEL: Record<string, string> = {
  weekly:      "Paid weekly",
  biweekly:    "Paid every 2 weeks",
  semimonthly: "Paid twice a month",
  monthly:     "Paid monthly",
};

export default function W2Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<W2Data | null>(null);
  const [editing, setEditing] = useState(false);

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
        <Link href="/help" className="text-xs text-zinc-400 border border-zinc-200 rounded-lg px-2 py-1 hover:border-zinc-400">
          Help ?
        </Link>
      </div>

      {!editing && <NotificationBanner userId={userId} />}

      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-5">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Pay Settings</p>
            <p className="text-sm text-zinc-500">Enter your paycheck details once and we'll track your pay schedule automatically.</p>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Take-Home Pay ($)</label>
              <HelpTip explanation="The amount that actually deposits into your bank account after taxes, health insurance, and any other deductions are removed." />
            </div>
            <p className="text-xs text-zinc-400 mb-1">Your actual deposit — after all taxes and deductions.</p>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={netInput}
              onChange={(e) => setNetInput(e.target.value)} className="input" required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">How often are you paid?</label>
            <select value={freqInput} onChange={(e) => setFreqInput(e.target.value)} className="input">
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks (biweekly)</option>
              <option value="semimonthly">Twice a month (1st & 15th)</option>
              <option value="monthly">Once a month</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Next Payday</label>
            <input type="date" value={nextPayInput} onChange={(e) => setNextPayInput(e.target.value)}
              className="input" required />
          </div>

          <button type="submit" disabled={saving}
            className="bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50">
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
            <p className="text-zinc-400 text-sm mt-1">days away</p>
            <p className="text-zinc-500 text-sm mt-2">{data.next_payday}</p>
          </div>

          {/* Pay cycle progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <div className="flex items-center gap-1 mb-3">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Pay Cycle Progress</p>
              <HelpTip explanation="Shows where you are in your current pay period. The bar fills as you get closer to payday. 100% = payday arrives." />
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${cyclePct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Last payday</span>
              <span>{daysToPayday}d until next deposit</span>
            </div>
          </div>

          {/* Take-home */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Expected Deposit</p>
              <HelpTip explanation="Your take-home pay — the amount that will hit your bank account after all taxes and deductions." />
            </div>
            <p className="text-3xl font-bold text-zinc-800">${data.net_take_home?.toFixed(2)}</p>
            <p className="text-xs text-zinc-400 mt-1">{FREQ_LABEL[data.pay_frequency ?? ""] ?? data.pay_frequency}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <button onClick={() => setEditing(true)}
              className="col-span-2 border border-zinc-200 text-zinc-600 rounded-xl py-3 text-sm font-medium hover:border-zinc-400 transition-colors">
              Edit Pay Settings
            </button>
            <Link href={`/digest/${userId}`}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
              Weekly Digest ✦
            </Link>
            <Link href={`/debt/${userId}`}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-xl py-3 text-center text-sm font-medium hover:border-zinc-400 transition-colors">
              Debt Freedom
            </Link>
          </div>

          <GoalsSection userId={userId} incomeType="w2" />
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
