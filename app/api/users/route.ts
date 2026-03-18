import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const users = db
    .prepare("SELECT id, name, income_type FROM users ORDER BY id ASC")
    .all();
  return NextResponse.json(users);
}
