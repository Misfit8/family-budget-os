import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDb();

    const accounts = db
      .prepare("SELECT * FROM teller_accounts WHERE user_id = ? ORDER BY institution, account_name")
      .all(Number(userId));

    const enrollments = db
      .prepare("SELECT enrollment_id, institution, created_at FROM teller_enrollments WHERE user_id = ?")
      .all(Number(userId));

    return NextResponse.json({ accounts, enrollments });
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
    const { enrollmentId } = await req.json();
    const db = getDb();

    const enrollment = db
      .prepare("SELECT enrollment_id FROM teller_enrollments WHERE user_id = ? AND enrollment_id = ?")
      .get(Number(userId), enrollmentId);
    if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const accountIds = (db
      .prepare("SELECT account_id FROM teller_accounts WHERE enrollment_id = ?")
      .all(enrollmentId) as { account_id: string }[])
      .map((r) => r.account_id);

    const db2 = db;
    db2.transaction(() => {
      for (const aid of accountIds) {
        db.prepare("DELETE FROM teller_transactions WHERE account_id = ?").run(aid);
      }
      db.prepare("DELETE FROM teller_accounts WHERE enrollment_id = ?").run(enrollmentId);
      db.prepare("DELETE FROM teller_enrollments WHERE enrollment_id = ?").run(enrollmentId);
    })();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
