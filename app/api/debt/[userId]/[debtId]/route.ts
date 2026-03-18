import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; debtId: string }> }
) {
  const { debtId } = await params;
  const db = getDb();

  const debt = db.prepare("SELECT * FROM debts WHERE id = ?").get(Number(debtId));
  const payments = db
    .prepare("SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC")
    .all(Number(debtId));

  return NextResponse.json({ debt, payments });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; debtId: string }> }
) {
  const { userId, debtId } = await params;
  const { new_balance, date, note } = await req.json();

  if (new_balance == null || Number(new_balance) < 0) {
    return NextResponse.json({ error: "new_balance must be >= 0" }, { status: 400 });
  }

  const db = getDb();
  const gid = Number(debtId);
  const uid = Number(userId);

  const debt = db.prepare("SELECT * FROM debts WHERE id = ?").get(gid) as
    { balance: number } | undefined;
  if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const implied_payment = Math.max(0, debt.balance - new_balance);

  if (implied_payment > 0) {
    db.prepare(`
      INSERT INTO debt_payments (debt_id, user_id, amount, date, payment_type, note)
      VALUES (?, ?, ?, ?, 'balance_update', ?)
    `).run(gid, uid, implied_payment, date ?? new Date().toISOString().slice(0, 10), note ?? null);
  }

  const paid_off = new_balance <= 0;
  db.prepare(`
    UPDATE debts SET balance = ?, paid_off_at = ? WHERE id = ?
  `).run(
    Math.max(0, new_balance),
    paid_off ? new Date().toISOString().slice(0, 10) : null,
    gid
  );

  return NextResponse.json({ ok: true, paid_off });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; debtId: string }> }
) {
  const { debtId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM debt_payments WHERE debt_id = ?").run(Number(debtId));
  db.prepare("DELETE FROM debts WHERE id = ?").run(Number(debtId));
  return NextResponse.json({ ok: true });
}
