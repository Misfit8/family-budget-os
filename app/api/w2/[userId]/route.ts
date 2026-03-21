import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);

  const settings = db
    .prepare("SELECT * FROM w2_settings WHERE user_id = ?")
    .get(uid) as {
      net_take_home: number;
      pay_frequency: string;
      next_payday: string;
      updated_at: string;
    } | undefined;

  if (!settings) {
    return NextResponse.json({ configured: false });
  }

  const today = new Date();

  // Project the actual next payday if it's in the past
  let projectedNext = new Date(settings.next_payday);
  const freqDays = settings.pay_frequency === "weekly" ? 7 :
                   settings.pay_frequency === "biweekly" ? 14 :
                   settings.pay_frequency === "semimonthly" ? 15 : 30;

  while (projectedNext < today) {
    projectedNext.setDate(projectedNext.getDate() + freqDays);
  }

  const daysToNext = Math.ceil((projectedNext.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Paycheck history
  const paychecks = db
    .prepare("SELECT * FROM w2_paychecks WHERE user_id = ? ORDER BY date DESC LIMIT 10")
    .all(uid) as { id: number; date: string; amount: number; hours: number | null; note: string | null }[];

  const recent3 = paychecks.slice(0, 3);
  const rollingAvg = recent3.length > 0
    ? recent3.reduce((s, p) => s + p.amount, 0) / recent3.length
    : null;

  return NextResponse.json({
    configured: true,
    net_take_home: settings.net_take_home,
    pay_frequency: settings.pay_frequency,
    next_payday: projectedNext.toISOString().slice(0, 10),
    days_to_payday: daysToNext,
    freq_days: freqDays,
    paychecks,
    last_paycheck: paychecks[0] ?? null,
    rolling_avg: rollingAvg,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { net_take_home, pay_frequency, next_payday } = await req.json();
  const db = getDb();
  const uid = Number(userId);

  const existing = db.prepare("SELECT id FROM w2_settings WHERE user_id = ?").get(uid);

  if (existing) {
    db.prepare(`
      UPDATE w2_settings SET net_take_home = ?, pay_frequency = ?, next_payday = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(net_take_home, pay_frequency, next_payday, uid);
  } else {
    db.prepare(
      "INSERT INTO w2_settings (user_id, net_take_home, pay_frequency, next_payday) VALUES (?, ?, ?, ?)"
    ).run(uid, net_take_home, pay_frequency, next_payday);
  }

  return NextResponse.json({ ok: true });
}
