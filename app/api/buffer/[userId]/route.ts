import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);

  const history = db
    .prepare("SELECT * FROM buffer WHERE user_id = ? ORDER BY date DESC")
    .all(uid) as { amount: number; date: string; type: string; note: string }[];

  const balance = (
    db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ?")
      .get(uid) as { total: number }
  ).total;

  // avg daily burn = abs sum of withdrawals in last 30 days / 30
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const burnRow = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ? AND type = 'withdrawal' AND date >= ?"
    )
    .get(uid, cutoff) as { total: number };

  const avgDailyBurn = Math.abs(burnRow.total) / 30;
  const runway = avgDailyBurn > 0 ? balance / avgDailyBurn : null;

  return NextResponse.json({ balance, avgDailyBurn, runway, history });
}
