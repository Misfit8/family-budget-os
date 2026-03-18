"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AddDebt() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "", balance: "", minimum_payment: "",
    interest_rate: "", debt_type: "credit_card", is_shared: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.balance || !form.minimum_payment) {
      setError("Name, balance, and minimum payment are required.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/debt/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        balance: Number(form.balance),
        minimum_payment: Number(form.minimum_payment),
        interest_rate: Number(form.interest_rate) || 0,
        debt_type: form.debt_type,
        is_shared: form.is_shared,
      }),
    });
    setSaving(false);
    if (res.ok) router.push(`/debt/${userId}`);
    else setError("Failed to save.");
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/debt/${userId}`} className="text-zinc-400 text-sm">← Back</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Add Debt</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col gap-4">
        <Field label="Name" required>
          <input type="text" placeholder="e.g. Chase Sapphire" value={form.name}
            onChange={(e) => update("name", e.target.value)} className="input" required />
        </Field>

        <Field label="Type">
          <select value={form.debt_type} onChange={(e) => update("debt_type", e.target.value)} className="input">
            <option value="credit_card">Credit Card</option>
            <option value="loan">Personal Loan</option>
            <option value="medical">Medical</option>
            <option value="student">Student Loan</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Current Balance ($) — negative if overdrawn" required>
          <input type="number" step="0.01" placeholder="e.g. -234.50 or 1200.00" value={form.balance}
            onChange={(e) => update("balance", e.target.value)} className="input" required />
        </Field>

        <Field label="Minimum Payment ($/mo)" required>
          <input type="number" step="0.01" min="0" placeholder="0.00" value={form.minimum_payment}
            onChange={(e) => update("minimum_payment", e.target.value)} className="input" required />
        </Field>

        <Field label="Interest Rate (%)">
          <input type="number" step="0.01" min="0" max="100" placeholder="0.00" value={form.interest_rate}
            onChange={(e) => update("interest_rate", e.target.value)} className="input" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.is_shared}
            onChange={(e) => update("is_shared", e.target.checked)} />
          Shared household debt
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="bg-zinc-800 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Add Debt"}
        </button>
      </form>

      <style>{`
        .input { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px 12px;
          font-size: 16px; background: white; color: #18181b; outline: none; width: 100%; }
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
