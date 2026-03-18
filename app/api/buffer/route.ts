import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, date, amount, type, note } = body;

    if (!user_id || !date || amount == null || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["deposit", "withdrawal"].includes(type)) {
      return NextResponse.json({ error: "type must be deposit or withdrawal" }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }

    const db = getDb();
    // Store deposits as positive, withdrawals as negative
    const storedAmount = type === "withdrawal" ? -Math.abs(amount) : Math.abs(amount);

    const stmt = db.prepare(
      "INSERT INTO buffer (user_id, date, amount, type, note) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(user_id, date, storedAmount, type, note ?? null);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
