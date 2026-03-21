"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HelpTip from "@/app/components/HelpTip";

interface GigMember {
  id: number; name: string; income_type: "gig";
  runway: number | null; balance: number;
  weekEarnings: number; weekTarget: number;
}
interface W2Member {
  id: number; name: string; income_type: "w2";
  w2?: { net_take_home: number; pay_frequency: string; next_payday: string };
}
interface SSIMember {
  id: number; name: string; income_type: "ssi";
  assets?: { countable_assets: number; able_account: number };
}
interface TBDMember { id: number; name: string; income_type: "tbd" }
type Member = GigMember | W2Member | SSIMember | TBDMember;

interface Bill {
  id: number; name: string; amount: number;
  due_date: string | null; paid: number; paid_by_user_id: number | null;
  recurring_bill_id: number | null;
}

interface RecurringTemplate {
  id: number; name: string; amount: number; frequency: string; due_day: number;
}

interface HubData {
  members: Member[];
  bills: Bill[];
  recurringTemplates: RecurringTemplate[];
  householdRunway: number | null;
  totalBills: number;
  paidBills: number;
  month: string;
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function recurringLabel(t: RecurringTemplate): string {
  if (t.frequency === "monthly") return `Monthly on the ${t.due_day}${ordinal(t.due_day)}`;
  if (t.frequency === "weekly") return `Every ${WEEKDAY_NAMES[t.due_day]}`;
  return t.frequency;
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

function runwayColor(days: number | null) {
  if (days === null) return "text-zinc-400";
  if (days > 14) return "text-emerald-500";
  if (days >= 7) return "text-amber-500";
  return "text-red-500";
}

export default function HubPage() {
  const [data, setData] = useState<HubData | null>(null);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showManageRecurring, setShowManageRecurring] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDue, setBillDue] = useState("");
  const [billFrequency, setBillFrequency] = useState<"once" | "weekly" | "monthly">("once");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/hub");
    setData(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function addBill(e: React.FormEvent) {
    e.preventDefault();
    if (!billName || !billAmount) return;
    setSaving(true);

    let due_day: number | null = null;
    if (billFrequency !== "once" && billDue) {
      // Parse date string directly to avoid UTC timezone shift
      const [, , dayStr] = billDue.split("-");
      if (billFrequency === "monthly") due_day = parseInt(dayStr, 10);
      if (billFrequency === "weekly") due_day = new Date(billDue + "T12:00:00").getDay();
    }

    await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: billName,
        amount: Number(billAmount),
        due_date: billFrequency === "once" ? (billDue || null) : null,
        frequency: billFrequency,
        due_day,
      }),
    });
    setSaving(false);
    setBillName(""); setBillAmount(""); setBillDue(""); setBillFrequency("once");
    setShowAddBill(false);
    load();
  }

  async function cancelRecurring(id: number) {
    await fetch(`/api/bills/recurring/${id}`, { method: "DELETE" });
    load();
  }

  async function togglePaid(bill: Bill) {
    await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !bill.paid, paid_by_user_id: bill.paid ? null : 1 }),
    });
    load();
  }

  async function deleteBill(id: number) {
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    load();
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-400 text-sm">Loading…</p>
      </div>
    );
  }

  const unpaidTotal = data.totalBills - data.paidBills;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Family Hub</h1>
        <span className="text-xs text-zinc-400">{data.month}</span>
      </div>

      {/* Household Runway */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-2">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Household Runway</p>
          <HelpTip explanation="How many days the household's savings (buffer) can cover expenses. Based on the lowest individual gig worker runway. Green = 14+ days. Yellow = 7–14 days. Red = under 7 days." />
        </div>
        <p className={`font-bold leading-none ${runwayColor(data.householdRunway)}`} style={{ fontSize: "72px" }}>
          {data.householdRunway !== null ? Math.floor(data.householdRunway) : "—"}
        </p>
        <p className="text-zinc-400 text-sm mt-1">days</p>
        <p className="text-xs text-zinc-400 mt-2">Based on lowest gig buffer runway</p>
      </div>

      {/* Member cards — gig users are merged into one "Parents" card */}
      <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Members</p>
      <div className="flex flex-col gap-3 mb-6">
        {(() => {
          const gigMembers = data.members.filter((m) => m.income_type === "gig") as GigMember[];
          const others = data.members.filter((m) => m.income_type !== "gig");
          const combinedWeekEarnings = gigMembers.reduce((s, m) => s + m.weekEarnings, 0);
          const combinedWeekTarget = gigMembers.reduce((s, m) => s + m.weekTarget, 0);
          return (
            <>
              {gigMembers.length > 0 && (
                <Link href="/gig/household" className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between hover:border-zinc-400 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">Parents</p>
                    <p className="text-xs text-zinc-400">Gig delivery</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${runwayColor(data.householdRunway)}`}>
                      {data.householdRunway !== null ? `${Math.floor(data.householdRunway)}d runway` : "No runway"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      ${combinedWeekEarnings.toFixed(0)} / ${combinedWeekTarget} wk
                    </p>
                  </div>
                </Link>
              )}
              {others.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </>
          );
        })()}
      </div>

      {/* Shared Bills */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Shared Bills</p>
          <HelpTip explanation="Bills the household shares — rent, utilities, subscriptions, etc. Add a bill, set a due date, then tap the circle to mark it paid when it's been taken care of. Resets each month." />
        </div>
        <button
          onClick={() => setShowAddBill(!showAddBill)}
          className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1 hover:border-zinc-400"
        >
          {showAddBill ? "Cancel" : "+ Add Bill"}
        </button>
      </div>
      <p className="text-xs text-zinc-400 mb-3">Rent, utilities, subscriptions — bills everyone shares.</p>

      {/* Bills summary bar */}
      {data.totalBills > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 mb-3 grid grid-cols-3 text-sm text-center">
          <div>
            <p className="text-zinc-400 text-xs">Total</p>
            <p className="text-zinc-800 font-medium">${data.totalBills.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Paid</p>
            <p className="text-emerald-600 font-medium">${data.paidBills.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Left</p>
            <p className={`font-medium ${unpaidTotal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              ${unpaidTotal.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Add bill form */}
      {showAddBill && (
        <form onSubmit={addBill} className="bg-white rounded-2xl border border-zinc-200 p-4 mb-3 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Bill name (e.g. Rent, Electric, Netflix)"
            value={billName}
            onChange={(e) => setBillName(e.target.value)}
            className="input"
            required
          />
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Repeat</label>
              <select
                value={billFrequency}
                onChange={(e) => setBillFrequency(e.target.value as "once" | "weekly" | "monthly")}
                className="input"
              >
                <option value="once">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">
              {billFrequency === "once" ? "Due date (optional)" :
               billFrequency === "monthly" ? "Pick any date — the day of the month repeats (e.g. 15th)" :
               "Pick any date — the day of the week repeats (e.g. every Friday)"}
            </label>
            <input
              type="date"
              value={billDue}
              onChange={(e) => setBillDue(e.target.value)}
              required={billFrequency !== "once"}
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : billFrequency === "once" ? "Add Bill" : "Add Recurring Bill"}
          </button>
        </form>
      )}

      {/* Bills list */}
      {data.bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center">
          <p className="text-zinc-500 text-sm mb-1">No bills added yet.</p>
          <p className="text-xs text-zinc-400">Tap "+ Add Bill" above to add rent, utilities, or any shared expense.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400 mb-2">Tap the circle on any bill to mark it paid.</p>
          <div className="flex flex-col gap-2">
            {data.bills.map((bill) => (
              <div
                key={bill.id}
                className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  bill.paid ? "border-emerald-100 opacity-60" : "border-zinc-200"
                }`}
              >
                <button
                  onClick={() => togglePaid(bill)}
                  title={bill.paid ? "Mark unpaid" : "Mark as paid"}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    bill.paid ? "bg-emerald-500 border-emerald-500" : "border-zinc-300 hover:border-zinc-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${bill.paid ? "line-through text-zinc-400" : "text-zinc-800"}`}>
                    {bill.name}
                    {bill.recurring_bill_id && <span className="ml-1 text-xs text-zinc-400">🔁</span>}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {bill.paid ? "✓ Paid" : bill.due_date ? `Due ${bill.due_date}` : "No due date"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-700 flex-shrink-0">
                  ${bill.amount.toFixed(2)}
                </p>
                <button
                  onClick={() => deleteBill(bill.id)}
                  title="Remove bill"
                  className="text-zinc-300 hover:text-red-400 flex-shrink-0 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recurring bill templates */}
      {data.recurringTemplates.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowManageRecurring(!showManageRecurring)}
            className="w-full flex items-center justify-between text-xs text-zinc-400 uppercase tracking-widest py-2"
          >
            <span>Recurring Bills ({data.recurringTemplates.length})</span>
            <span>{showManageRecurring ? "−" : "+"}</span>
          </button>
          {showManageRecurring && (
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-xs text-zinc-400">These auto-generate every month. Remove one to stop it.</p>
              {data.recurringTemplates.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{t.name}</p>
                    <p className="text-xs text-zinc-400">{recurringLabel(t)}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700 flex-shrink-0">${t.amount.toFixed(2)}</p>
                  <button
                    onClick={() => cancelRecurring(t.id)}
                    title="Cancel recurring bill"
                    className="text-zinc-300 hover:text-red-400 flex-shrink-0 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
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

function MemberCard({ member }: { member: Member }) {
  const href =
    member.income_type === "gig" ? `/gig/${member.id}` :
    member.income_type === "ssi" ? `/ssi/${member.id}` :
    member.income_type === "w2" ? `/w2/${member.id}` : "#";

  return (
    <Link href={href} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between hover:border-zinc-400 transition-colors">
      <div>
        <p className="text-sm font-semibold text-zinc-800">{member.name}</p>
        <p className="text-xs text-zinc-400">
          {member.income_type === "gig" ? "Gig delivery" :
           member.income_type === "w2" ? "W-2 employee" :
           member.income_type === "ssi" ? "SSI recipient" :
           "Not set up"}
        </p>
      </div>
      <MemberStat member={member} />
    </Link>
  );
}

function MemberStat({ member }: { member: Member }) {
  if (member.income_type === "gig") {
    const m = member as GigMember;
    return (
      <div className="text-right">
        <p className={`text-sm font-semibold ${runwayColor(m.runway)}`}>
          {m.runway !== null ? `${Math.floor(m.runway)}d runway` : "No runway"}
        </p>
        <p className="text-xs text-zinc-400">
          ${m.weekEarnings.toFixed(0)} / ${m.weekTarget} wk
        </p>
      </div>
    );
  }
  if (member.income_type === "w2") {
    const m = member as W2Member;
    return (
      <div className="text-right">
        <p className="text-sm font-semibold text-zinc-600">
          {m.w2 ? `$${m.w2.net_take_home} ${m.w2.pay_frequency}` : "Not set up"}
        </p>
        {m.w2?.next_payday && <p className="text-xs text-zinc-400">Next: {m.w2.next_payday}</p>}
      </div>
    );
  }
  if (member.income_type === "ssi") {
    const m = member as SSIMember;
    const assets = m.assets?.countable_assets ?? 0;
    const pct = (assets / 2000) * 100;
    return (
      <div className="text-right">
        <p className={`text-sm font-semibold ${pct >= 90 ? "text-red-500" : pct >= 75 ? "text-amber-500" : "text-zinc-600"}`}>
          ${assets.toFixed(0)} / $2,000
        </p>
        <p className="text-xs text-zinc-400">SSI asset limit</p>
      </div>
    );
  }
  return <p className="text-xs text-zinc-400">TBD</p>;
}
