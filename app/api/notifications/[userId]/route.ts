import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkAndCreateAlerts } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const uid = Number(userId);
  const db = getDb();

  // Check and create any new alerts
  checkAndCreateAlerts(uid);

  const notifications = db
    .prepare(
      "SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 10"
    )
    .all(uid);

  return NextResponse.json(notifications);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { id } = await req.json();
  const db = getDb();

  if (id) {
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?")
      .run(id, Number(userId));
  } else {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?")
      .run(Number(userId));
  }

  return NextResponse.json({ ok: true });
}
