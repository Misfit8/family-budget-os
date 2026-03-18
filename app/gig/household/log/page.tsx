"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PARENTS_ID = 1;

export default function ParentsLogRun() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    hours: "",
    earnings_gross: "",
    tips: "",
    miles: "",
    platform: "Uber Eats",
    uber_fee: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.date || !form.earnings_gross) {
      setError("Date and gross earnings are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: PARENTS_ID,
        date: form.date,
        hours: form.hours ? Number(form.hours) : null,
        earnings_gross: Number(form.earnings_gross),
        tips: form.tips ? Number(form.tips) : 0,
        miles: form.miles ? Number(form.miles) : 0,
        platform: form.platform,
        uber_fee: form.uber_fee ? Number(form.uber_fee) : 0,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/gig/household");
    } else {
      setError("Failed to save run.");
    }
  }

  const netPreview =
    (Number(form.earnings_gross) || 0) +
    (Number(form.tips) || 0) -
    (Number(form.uber_fee) || 0);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gig/household" className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Log Run</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-4">
          <Field label="Date" required>
            <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)}
              className="input" required />
          </Field>

          <Field label="Platform">
            <select value={form.platform} onChange={(e) => update("platform", e.target.value)} className="input">
              <option>Uber Eats</option>
              <option>DoorDash</option>
              <option>Grubhub</option>
              <option>Instacart</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="Gross Earnings ($)" required>
            <input type="number" step="0.01" min="0" placeholder="0.00"
              value={form.earnings_gross} onChange={(e) => update("earnings_gross", e.target.value)}
              className="input" required />
          </Field>

          <Field label="Tips ($)">
            <input type="number" step="0.01" min="0" placeholder="0.00"
              value={form.tips} onChange={(e) => update("tips", e.target.value)} className="input" />
          </Field>

          <Field label="Uber/Platform Fee ($)">
            <input type="number" step="0.01" min="0" placeholder="0.00"
              value={form.uber_fee} onChange={(e) => update("uber_fee", e.target.value)} className="input" />
          </Field>

          <Field label="Hours Worked">
            <input type="number" step="0.5" min="0" placeholder="0"
              value={form.hours} onChange={(e) => update("hours", e.target.value)} className="input" />
          </Field>

          <Field label="Miles Driven">
            <input type="number" step="0.1" min="0" placeholder="0"
              value={form.miles} onChange={(e) => update("miles", e.target.value)} className="input" />
          </Field>
        </div>

        {form.earnings_gross && (
          <div className="bg-zinc-100 rounded-xl px-4 py-3 text-sm">
            <span className="text-zinc-500">Net: </span>
            <span className="font-semibold text-zinc-800">${netPreview.toFixed(2)}</span>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="bg-zinc-800 text-white rounded-xl py-3 font-medium text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save Run"}
        </button>
      </form>

      <style>{`
        .input { width: 100%; border: 1px solid #e4e4e7; border-radius: 8px;
          padding: 10px 12px; font-size: 16px; background: white; color: #18181b; outline: none; }
        .input:focus { border-color: #a1a1aa; }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
