import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const user = db
    .prepare("SELECT id, name, income_type, weekly_salary_target FROM users WHERE id = ?")
    .get(Number(userId));
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json();
  const db = getDb();

  if (body.weekly_salary_target !== undefined) {
    const target = Number(body.weekly_salary_target);
    if (isNaN(target) || target < 0) {
      return NextResponse.json({ error: "Invalid weekly_salary_target" }, { status: 400 });
    }
    const result = db
      .prepare("UPDATE users SET weekly_salary_target = ? WHERE id = ?")
      .run(target, Number(userId));
    if (result.changes === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ ok: true, weekly_salary_target: target });
  }

  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.trim().length > 40) {
    return NextResponse.json({ error: "name must be 40 characters or less" }, { status: 400 });
  }

  const result = db
    .prepare("UPDATE users SET name = ? WHERE id = ?")
    .run(name.trim(), Number(userId));

  if (result.changes === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, name: name.trim() });
}
