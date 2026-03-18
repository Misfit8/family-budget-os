import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);

  const assets = db
    .prepare("SELECT * FROM ssi_assets WHERE user_id = ?")
    .get(uid) as { countable_assets: number; able_account: number; updated_at: string } | undefined;

  const countable = assets?.countable_assets ?? 0;
  const able = assets?.able_account ?? 0;
  const limit = 2000;
  const remaining = Math.max(0, limit - countable);

  // Status thresholds per notification spec
  const status =
    countable >= 2000 ? "crisis" :
    countable >= 1800 ? "red" :
    countable >= 1500 ? "amber" :
    "green";

  return NextResponse.json({
    countable_assets: countable,
    able_account: able,
    limit,
    remaining,
    status,
    updated_at: assets?.updated_at ?? null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { countable_assets, able_account } = await req.json();
  const db = getDb();
  const uid = Number(userId);

  const existing = db.prepare("SELECT id FROM ssi_assets WHERE user_id = ?").get(uid);

  if (existing) {
    db.prepare(
      "UPDATE ssi_assets SET countable_assets = ?, able_account = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(countable_assets, able_account, uid);
  } else {
    db.prepare(
      "INSERT INTO ssi_assets (user_id, countable_assets, able_account) VALUES (?, ?, ?)"
    ).run(uid, countable_assets, able_account);
  }

  return NextResponse.json({ ok: true });
}
