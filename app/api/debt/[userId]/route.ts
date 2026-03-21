import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { simulatePayoff } from "@/lib/debtCalc";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);

  const debts = db
    .prepare("SELECT * FROM debts WHERE user_id = ? AND paid_off_at IS NULL ORDER BY balance ASC")
    .all(uid) as {
      id: number; name: string; balance: number; original_balance: number;
      minimum_payment: number; interest_rate: number; debt_type: string; is_shared: number;
    }[];

  const { searchParams } = new URL(req.url);
  const extra = Number(searchParams.get("extra") ?? 0);
  const strategy = (searchParams.get("strategy") ?? "snowball") as "snowball" | "avalanche";

  const snowball = simulatePayoff(debts, extra, "snowball");
  const avalanche = simulatePayoff(debts, extra, "avalanche");

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimum_payment, 0);

  return NextResponse.json({ debts, snowball, avalanche, totalBalance, totalMinimum, strategy });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json();
  const { name, balance, minimum_payment, interest_rate, debt_type, is_shared } = body;

  const VALID_DEBT_TYPES = ["credit_card", "loan", "medical", "student", "past_due_bill", "other"];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (balance == null || isNaN(Number(balance))) {
    return NextResponse.json({ error: "balance is required" }, { status: 400 });
  }
  if (minimum_payment == null || Number(minimum_payment) < 0) {
    return NextResponse.json({ error: "minimum_payment must be >= 0" }, { status: 400 });
  }
  if (interest_rate != null && (Number(interest_rate) < 0 || Number(interest_rate) > 100)) {
    return NextResponse.json({ error: "interest_rate must be 0–100" }, { status: 400 });
  }
  if (debt_type && !VALID_DEBT_TYPES.includes(debt_type)) {
    return NextResponse.json({ error: "invalid debt_type" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO debts (user_id, name, balance, original_balance, minimum_payment, interest_rate, debt_type, is_shared)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(userId), name.trim(), Number(balance), Number(balance),
    Number(minimum_payment), Number(interest_rate ?? 0),
    debt_type ?? "other", is_shared ? 1 : 0
  );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
