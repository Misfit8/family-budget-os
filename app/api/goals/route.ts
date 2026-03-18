import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const db = getDb();

  const goals = userId
    ? db.prepare(
        "SELECT * FROM savings_goals WHERE (user_id = ? OR is_family_goal = 1) AND status != 'completed' ORDER BY created_at DESC"
      ).all(Number(userId))
    : db.prepare("SELECT * FROM savings_goals WHERE status != 'completed' ORDER BY created_at DESC").all();

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, name, target_amount, monthly_contribution, deadline, is_family_goal, is_able } = body;

  if (!user_id || !name || !target_amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO savings_goals (user_id, name, target_amount, monthly_contribution, deadline, is_family_goal, is_able)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    user_id, name, target_amount,
    monthly_contribution ?? 0,
    deadline ?? null,
    is_family_goal ? 1 : 0,
    is_able ? 1 : 0
  );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
