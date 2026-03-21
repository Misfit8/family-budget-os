import { NextResponse } from "next/server";
import { getDb, syncRecurringBills } from "@/lib/db";

export async function GET() {
  const db = getDb();

  // All family members
  const users = db.prepare("SELECT * FROM users").all() as {
    id: number; name: string; income_type: string; weekly_salary_target: number;
  }[];

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Auto-generate any recurring bill instances for this month
  syncRecurringBills(db, month);

  // Shared bills this month
  const bills = db
    .prepare("SELECT * FROM shared_bills WHERE month = ? ORDER BY due_date ASC")
    .all(month) as {
      id: number; name: string; amount: number; due_date: string;
      paid_by_user_id: number | null; paid: number; recurring_bill_id: number | null;
    }[];

  // Recurring templates (for management UI)
  const recurringTemplates = db
    .prepare("SELECT * FROM recurring_bills WHERE active = 1 ORDER BY name ASC")
    .all() as { id: number; name: string; amount: number; frequency: string; due_day: number }[];

  // Per-member data
  const members = users.map((u) => {
    if (u.income_type === "gig") {
      // Buffer runway
      const balRow = db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ?")
        .get(u.id) as { total: number };

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const burnRow = db
        .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ? AND type = 'withdrawal' AND date >= ?")
        .get(u.id, cutoffStr) as { total: number };

      const balance = balRow.total;
      const avgDailyBurn = Math.abs(burnRow.total) / 30;
      const runway = avgDailyBurn > 0 ? balance / avgDailyBurn : null;

      // Weekly earnings (Mon–now)
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const mondayStr = monday.toISOString().slice(0, 10);

      const weekRow = db
        .prepare("SELECT COALESCE(SUM(net), 0) as total FROM runs WHERE user_id = ? AND date >= ?")
        .get(u.id, mondayStr) as { total: number };

      const target = u.weekly_salary_target || 800;

      return {
        id: u.id, name: u.name, income_type: u.income_type,
        runway, balance, weekEarnings: weekRow.total, weekTarget: target,
      };
    }

    if (u.income_type === "w2") {
      const w2 = db
        .prepare("SELECT * FROM w2_settings WHERE user_id = ?")
        .get(u.id) as { net_take_home: number; pay_frequency: string; next_payday: string } | undefined;
      return { id: u.id, name: u.name, income_type: u.income_type, w2 };
    }

    if (u.income_type === "ssi") {
      const assets = db
        .prepare("SELECT * FROM ssi_assets WHERE user_id = ?")
        .get(u.id) as { countable_assets: number; able_account: number } | undefined;
      return { id: u.id, name: u.name, income_type: u.income_type, assets };
    }

    return { id: u.id, name: u.name, income_type: u.income_type };
  });

  // Household runway = lowest gig runway (that is non-null)
  const gigRunways = members
    .filter((m) => m.income_type === "gig" && (m as { runway: number | null }).runway !== null)
    .map((m) => (m as { runway: number | null }).runway as number);

  const householdRunway = gigRunways.length > 0 ? Math.min(...gigRunways) : null;

  // Bills summary
  const totalBills = bills.reduce((s, b) => s + b.amount, 0);
  const paidBills = bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);

  return NextResponse.json({ members, bills, recurringTemplates, householdRunway, totalBills, paidBills, month });
}
