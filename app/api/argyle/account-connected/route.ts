import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { user_id, account_id, employer } = await req.json();
    if (!user_id || !account_id) {
      return NextResponse.json({ error: "user_id and account_id required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO argyle_accounts (user_id, argyle_account_id, employer)
      VALUES (?, ?, ?)
      ON CONFLICT(argyle_account_id) DO UPDATE SET employer = excluded.employer
    `).run(Number(user_id), account_id, employer ?? null);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
