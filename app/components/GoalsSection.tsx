"use client";

import { useCallback, useEffect, useState } from "react";

interface Goal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  is_family_goal: number;
  is_able: number;
  deadline: string | null;
  status: string;
}

interface SSIData {
  countable_assets: number;
  limit: number;
}

export default function GoalsSection({
  userId,
  incomeType,
}: {
  userId: string;
  incomeType: "gig" | "ssi" | "w2";
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ssiData, setSsiData] = useState<SSIData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [contributing, setContributing] = useState<number | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(new Date().toISOString().slice(0, 10));

  // New goal form
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isFamilyGoal, setIsFamilyGoal] = useState(false);
  const [isAble, setIsAble] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/goals?user_id=${userId}`);
    if (res.ok) setGoals(await res.json());
    if (incomeType === "ssi") {
      const sr = await fetch(`/api/ssi/${userId}`);
      if (sr.ok) setSsiData(await sr.json());
    }
  }, [userId, incomeType]);

  useEffect(() => { load(); }, [load]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(userId),
        name,
        target_amount: Number(target),
        monthly_contribution: Number(monthly) || 0,
        deadline: deadline || null,
        is_family_goal: isFamilyGoal,
        is_able: isAble,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setName(""); setTarget(""); setMonthly(""); setDeadline("");
    setIsFamilyGoal(false); setIsAble(false);
    load();
  }

  async function handleContribute(goalId: number) {
    if (!contribAmount || Number(contribAmount) <= 0) return;
    await fetch(`/api/goals/${goalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(userId),
        amount: Number(contribAmount),
        date: contribDate,
      }),
    });
    setContributing(null);
    setContribAmount("");
    load();
  }

  async function handleDelete(goalId: number) {
    await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
    load();
  }

  // SSI guard: warn if adding a non-ABLE goal would push countable assets toward limit
  function ssiWarning(targetAmt: number): string | null {
    if (incomeType !== "ssi" || isAble || !ssiData) return null;
    const projected = ssiData.countable_assets + targetAmt;
    if (projected >= 1800) return "This goal may push your countable assets near the SSI limit. Consider using an ABLE account instead. This is not legal advice.";
    if (projected >= 1500) return "Combined with your current assets, this goal approaches the SSI limit. This is not legal advice.";
    return null;
  }

  const liveWarning = ssiWarning(Number(target) || 0);

  // Projected completion
  function projectedDate(goal: Goal): string | null {
    if (goal.monthly_contribution <= 0) return null;
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return null;
    const months = Math.ceil(remaining / goal.monthly_contribution);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 7);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 uppercase tracking-widest">Savings Goals</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1 hover:border-zinc-400"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddGoal} className="bg-white rounded-2xl border border-zinc-200 p-5 mb-3 flex flex-col gap-3">
          <input type="text" placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />

          <div className="flex gap-2">
            <input type="number" step="0.01" min="1" placeholder="Target ($)" value={target} onChange={(e) => setTarget(e.target.value)} className="input" required />
            <input type="number" step="0.01" min="0" placeholder="$/month" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="input" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Target Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="checkbox" checked={isFamilyGoal} onChange={(e) => setIsFamilyGoal(e.target.checked)} />
              Family goal
            </label>
            {incomeType === "ssi" && (
              <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={isAble} onChange={(e) => setIsAble(e.target.checked)} />
                ABLE account
              </label>
            )}
          </div>

          {liveWarning && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {liveWarning}
            </p>
          )}

          <button type="submit" disabled={saving} className="bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? "Saving…" : "Add Goal"}
          </button>
        </form>
      )}

      {goals.length === 0 && !showForm && (
        <p className="text-zinc-400 text-sm">No goals yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
          const projected = projectedDate(g);
          const isContributing = contributing === g.id;

          return (
            <div key={g.id} className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-800">{g.name}</p>
                    {g.is_family_goal === 1 && (
                      <span className="text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">family</span>
                    )}
                    {g.is_able === 1 && (
                      <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">ABLE</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    ${g.current_amount.toFixed(0)} / ${g.target_amount.toFixed(0)}
                    {projected ? ` · ${projected}` : ""}
                  </p>
                </div>
                <button onClick={() => handleDelete(g.id)} className="text-zinc-300 hover:text-red-400 text-xs">✕</button>
              </div>

              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-zinc-700"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isContributing ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Amount"
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    className="input flex-1 text-sm py-2"
                    autoFocus
                  />
                  <input
                    type="date"
                    value={contribDate}
                    onChange={(e) => setContribDate(e.target.value)}
                    className="input text-sm py-2"
                  />
                  <button onClick={() => handleContribute(g.id)} className="bg-zinc-800 text-white rounded-lg px-3 text-sm">+</button>
                  <button onClick={() => setContributing(null)} className="text-zinc-400 text-sm px-1">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setContributing(g.id)}
                  className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1.5 w-full hover:border-zinc-400 transition-colors"
                >
                  + Contribute
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .input {
          border: 1px solid #e4e4e7; border-radius: 8px;
          padding: 10px 12px; font-size: 16px;
          background: white; color: #18181b; outline: none; width: 100%;
        }
        .input:focus { border-color: #a1a1aa; }
      `}</style>
    </div>
  );
}
