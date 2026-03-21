import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { amount, date, hours, note } = await req.json();

    if (!amount || !date) {
      return NextResponse.json({ error: "amount and date are required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO w2_paychecks (user_id, amount, date, hours, note) VALUES (?, ?, ?, ?, ?)")
      .run(Number(userId), Number(amount), date, hours ?? null, note ?? null);

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { id } = await req.json();
    const db = getDb();
    db.prepare("DELETE FROM w2_paychecks WHERE id = ? AND user_id = ?").run(Number(id), Number(userId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
