import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; debtId: string }> }
) {
  const { userId, debtId } = await params;
  const { amount, date, payment_type, note } = await req.json();
  const db = getDb();
  const gid = Number(debtId);
  const uid = Number(userId);

  const debt = db.prepare("SELECT * FROM debts WHERE id = ?").get(gid) as
    { balance: number } | undefined;
  if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare(`
    INSERT INTO debt_payments (debt_id, user_id, amount, date, payment_type, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(gid, uid, amount, date, payment_type ?? "minimum", note ?? null);

  const newBalance = Math.max(0, debt.balance - amount);
  const paid_off = newBalance <= 0;

  db.prepare("UPDATE debts SET balance = ?, paid_off_at = ? WHERE id = ?").run(
    newBalance,
    paid_off ? date : null,
    gid
  );

  return NextResponse.json({ ok: true, new_balance: newBalance, paid_off });
}
