import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, amount, due_date, month } = await req.json();
    if (!name || !amount) {
      return NextResponse.json({ error: "Missing name or amount" }, { status: 400 });
    }

    const db = getDb();
    const m = month ?? new Date().toISOString().slice(0, 7);

    const result = db
      .prepare("INSERT INTO shared_bills (name, amount, due_date, month) VALUES (?, ?, ?, ?)")
      .run(name, amount, due_date ?? null, m);

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
