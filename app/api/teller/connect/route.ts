import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface TellerEnrollment {
  accessToken: string;
  user: { id: string };
  enrollment: { id: string; institution: { name: string } };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, enrollment }: { userId: number; enrollment: TellerEnrollment } = await req.json();
    if (!userId || !enrollment?.accessToken || !enrollment?.enrollment?.id) {
      return NextResponse.json({ error: "Missing userId or enrollment data" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO teller_enrollments (user_id, enrollment_id, access_token, institution)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(enrollment_id) DO UPDATE SET access_token = excluded.access_token
    `).run(
      userId,
      enrollment.enrollment.id,
      enrollment.accessToken,
      enrollment.enrollment.institution?.name ?? null
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
