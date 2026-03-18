import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const user = db
    .prepare("SELECT id, name, income_type FROM users WHERE id = ?")
    .get(Number(userId));
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.trim().length > 40) {
    return NextResponse.json({ error: "name must be 40 characters or less" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET name = ? WHERE id = ?")
    .run(name.trim(), Number(userId));

  if (result.changes === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, name: name.trim() });
}
