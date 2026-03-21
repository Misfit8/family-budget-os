"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NotificationBanner from "@/app/components/NotificationBanner";
import GoalsSection from "@/app/components/GoalsSection";
import HelpTip from "@/app/components/HelpTip";

interface Paycheck {
  id: number; date: string; amount: number; hours: number | null; note: string | null;
}

interface W2Data {
  configured: boolean;
  net_take_home?: number;
  pay_frequency?: string;
  next_payday?: string;
  days_to_payday?: number;
  freq_days?: number;
  paychecks?: Paycheck[];
  last_paycheck?: Paycheck | null;
  rolling_avg?: number | null;
}

const FREQ_LABEL: Record<string, string> = {
  weekly:      "Paid weekly",
  biweekly:    "Paid every 2 weeks",
  semimonthly: "Paid twice a month",
  monthly:     "Paid monthly",
};

const today = new Date().toISOString().slice(0, 10);

export default function W2Dashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<W2Data | null>(null);
  const [userName, setUserName] = useState("");
  const [editing, setEditing] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  // Settings form
  const [netInput, setNetInput] = useState("");
  const [freqInput, setFreqInput] = useState("biweekly");
  const [nextPayInput, setNextPayInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Paycheck log form
  const [pcAmount, setPcAmount] = useState("");
  const [pcDate, setPcDate] = useState(today);
  const [pcHours, setPcHours] = useState("");
  const [pcNote, setPcNote] = useState("");
  const [loggingPc, setLoggingPc] = useState(false);

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

  useEffect(() => {
    load();
    fetch(`/api/users/${userId}`).then(r => r.json()).then(u => setUserName(u.name ?? ""));
  }, [userId]);

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

  async function handleLogPaycheck(e: React.FormEvent) {
    e.preventDefault();
    if (!pcAmount || !pcDate) return;
    setLoggingPc(true);
    await fetch(`/api/w2/${userId}/paychecks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(pcAmount),
        date: pcDate,
        hours: pcHours ? Number(pcHours) : null,
        note: pcNote || null,
      }),
    });
    setLoggingPc(false);
    setPcAmount(""); setPcHours(""); setPcNote(""); setPcDate(today);
    setShowLogForm(false);
    load();
  }

  async function deletePaycheck(id: number) {
    await fetch(`/api/w2/${userId}/paychecks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
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

  const hasPaychecks = (data.paychecks?.length ?? 0) > 0;
  const displayAmount = data.rolling_avg ?? data.net_take_home;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">{userName || "…"}</h1>
        <Link href="/help" className="text-xs text-zinc-400 border border-zinc-200 rounded-lg px-2 py-1 hover:border-zinc-400">
          Help ?
        </Link>
      </div>

      {!editing && <NotificationBanner userId={userId} />}

      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-5">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Pay Settings</p>
            <p className="text-sm text-zinc-500">
              Set your pay schedule. If your paycheck varies by hours, set a typical amount here — you can log each actual paycheck separately.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Typical Take-Home ($)</label>
              <HelpTip explanation="A rough baseline for what you typically take home. Used as a fallback when no paychecks have been logged yet. Log actual paychecks to replace this with real numbers." />
            </div>
            <p className="text-xs text-zinc-400 mb-1">Your usual deposit — can be approximate if it varies.</p>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={netInput}
              onChange={(e) => setNetInput(e.target.value)} className="input" required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">How often are you paid?</label>
            <select value={freqInput} onChange={(e) => setFreqInput(e.target.value)} className="input">
              <option value="weekly">Every week</option>
              <option value="biweekly">Every 2 weeks (biweekly)</option>
              <option value="semimonthly">Twice a month (1st &amp; 15th)</option>
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
          {data.configured && (
            <button type="button" onClick={() => setEditing(false)}
              className="text-sm text-zinc-400 text-center">
              Cancel
            </button>
          )}
        </form>
      ) : (
        <>
          {/* Next payday countdown */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Next Payday</p>
            <p className="font-bold text-zinc-800 leading-none" style={{ fontSize: "72px" }}>
              {daysToPayday}
            </p>
            <p className="text-zinc-400 text-sm mt-1">days away · {data.next_payday}</p>
          </div>

          {/* Pay cycle progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <div className="flex items-center gap-1 mb-3">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Pay Cycle Progress</p>
              <HelpTip explanation="Shows where you are in your current pay period. The bar fills as you get closer to payday." />
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${cyclePct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Last payday</span>
              <span>{daysToPayday}d until next deposit</span>
            </div>
          </div>

          {/* Income card — shows actuals if logged, falls back to setting */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <p className="text-xs text-zinc-400 uppercase tracking-widest">
                  {hasPaychecks ? "Recent Income" : "Expected Deposit"}
                </p>
                <HelpTip explanation={hasPaychecks
                  ? "Based on your last 3 logged paychecks. Log each paycheck after it lands to keep this accurate."
                  : "Your typical take-home from settings. Log actual paychecks below to track real income."} />
              </div>
              {!hasPaychecks && (
                <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-2 py-0.5">estimated</span>
              )}
            </div>

            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-zinc-800">
                  ${displayAmount?.toFixed(2) ?? "—"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {hasPaychecks ? "3-check rolling avg" : FREQ_LABEL[data.pay_frequency ?? ""] ?? data.pay_frequency}
                </p>
              </div>
              {hasPaychecks && data.last_paycheck && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-600">${data.last_paycheck.amount.toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">last paycheck · {data.last_paycheck.date}</p>
                  {data.last_paycheck.hours && (
                    <p className="text-xs text-zinc-400">{data.last_paycheck.hours}h</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Log paycheck form */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Paychecks</p>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1 hover:border-zinc-400"
            >
              {showLogForm ? "Cancel" : "+ Log Paycheck"}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            Log each paycheck after it lands to track actual income when hours vary.
          </p>

          {showLogForm && (
            <form onSubmit={handleLogPaycheck} className="bg-white rounded-2xl border border-zinc-200 p-4 mb-3 flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Amount deposited ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={pcAmount}
                    onChange={(e) => setPcAmount(e.target.value)} className="input" required />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Pay date</label>
                  <input type="date" value={pcDate}
                    onChange={(e) => setPcDate(e.target.value)} className="input" required />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Hours worked (optional)</label>
                  <input type="number" step="0.5" min="0" placeholder="e.g. 38" value={pcHours}
                    onChange={(e) => setPcHours(e.target.value)} className="input" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Note (optional)</label>
                  <input type="text" placeholder="e.g. light week" value={pcNote}
                    onChange={(e) => setPcNote(e.target.value)} className="input" />
                </div>
              </div>
              <button type="submit" disabled={loggingPc}
                className="bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                {loggingPc ? "Saving…" : "Log Paycheck"}
              </button>
            </form>
          )}

          {/* Paycheck history */}
          {hasPaychecks ? (
            <div className="flex flex-col gap-2 mb-6">
              {data.paychecks?.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">${p.amount.toFixed(2)}</p>
                    <p className="text-xs text-zinc-400">
                      {p.date}{p.hours ? ` · ${p.hours}h` : ""}{p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <button onClick={() => deletePaycheck(p.id)}
                    title="Remove" className="text-zinc-300 hover:text-red-400 p-1">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center mb-6">
              <p className="text-zinc-500 text-sm mb-1">No paychecks logged yet.</p>
              <p className="text-xs text-zinc-400">Tap "+ Log Paycheck" above each time a deposit lands.</p>
            </div>
          )}

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
