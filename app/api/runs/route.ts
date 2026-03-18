import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, date, hours, earnings_gross, tips = 0, miles = 0, platform = "Uber Eats", uber_fee = 0 } = body;

    if (!user_id || !date || !earnings_gross) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const net = earnings_gross + tips - uber_fee;
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO runs (user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
