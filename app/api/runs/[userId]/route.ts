import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();

  const runs = db
    .prepare("SELECT * FROM runs WHERE user_id = ? ORDER BY date DESC LIMIT 200")
    .all(Number(userId));

  return NextResponse.json(runs);
}
