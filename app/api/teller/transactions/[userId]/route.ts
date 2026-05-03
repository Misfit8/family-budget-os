import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDb();

    const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;

    const transactions = db
      .prepare(`
        SELECT * FROM teller_transactions
        WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'posted'
        ORDER BY date DESC
      `)
      .all(Number(userId), start, end) as {
        transaction_id: string; date: string; description: string;
        amount: number; type: string; category: string | null; account_id: string;
      }[];

    // Teller uses signed amounts: positive = money in, negative = money out
    const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const byCategory: Record<string, number> = {};
    for (const t of transactions.filter((t) => t.amount < 0)) {
      const cat = t.category ?? "other";
      byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
    }

    return NextResponse.json({ transactions, totalIn, totalOut, byCategory, month });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
