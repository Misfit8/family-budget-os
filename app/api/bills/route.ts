import { NextRequest, NextResponse } from "next/server";
import { getDb, syncRecurringBills } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, amount, due_date, month, frequency, due_day } = await req.json();
    if (!name || !amount) {
      return NextResponse.json({ error: "Missing name or amount" }, { status: 400 });
    }

    const db = getDb();
    const m = month ?? new Date().toISOString().slice(0, 7);

    // Recurring bill — insert template then sync to generate instances
    if (frequency && frequency !== "once" && due_day != null) {
      const result = db
        .prepare("INSERT INTO recurring_bills (name, amount, frequency, due_day) VALUES (?, ?, ?, ?)")
        .run(name, amount, frequency, due_day);
      syncRecurringBills(db, m);
      return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
    }

    // One-time bill
    const result = db
      .prepare("INSERT INTO shared_bills (name, amount, due_date, month) VALUES (?, ?, ?, ?)")
      .run(name, amount, due_date ?? null, m);

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
