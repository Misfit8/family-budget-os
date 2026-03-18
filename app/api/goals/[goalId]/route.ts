import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const { user_id, amount, date, note } = await req.json();
  const db = getDb();
  const gid = Number(goalId);

  const goal = db.prepare("SELECT * FROM savings_goals WHERE id = ?").get(gid) as {
    id: number; current_amount: number; target_amount: number;
  } | undefined;

  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  db.prepare(
    "INSERT INTO goal_contributions (goal_id, user_id, amount, date, note) VALUES (?, ?, ?, ?, ?)"
  ).run(gid, user_id, amount, date, note ?? null);

  const newAmount = goal.current_amount + amount;
  const completed = newAmount >= goal.target_amount;

  db.prepare(
    "UPDATE savings_goals SET current_amount = ?, status = ?, completed_at = ? WHERE id = ?"
  ).run(
    newAmount,
    completed ? "completed" : "active",
    completed ? new Date().toISOString().slice(0, 10) : null,
    gid
  );

  return NextResponse.json({ current_amount: newAmount, completed });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const db = getDb();
  db.prepare("DELETE FROM savings_goals WHERE id = ?").run(Number(goalId));
  db.prepare("DELETE FROM goal_contributions WHERE goal_id = ?").run(Number(goalId));
  return NextResponse.json({ ok: true });
}
