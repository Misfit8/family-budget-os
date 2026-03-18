import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface RunRow {
  user_id: number;
  date: string;
  hours?: number;
  earnings_gross: number;
  tips?: number;
  miles?: number;
  platform?: string;
  uber_fee?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, rows } = body as { user_id: number; rows: RunRow[] };

    if (!user_id || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Missing user_id or rows" }, { status: 400 });
    }

    const db = getDb();

    // Fetch existing dates for duplicate detection
    const existing = db
      .prepare("SELECT date, earnings_gross FROM runs WHERE user_id = ?")
      .all(Number(user_id)) as { date: string; earnings_gross: number }[];

    const existingKeys = new Set(
      existing.map((r) => `${r.date}|${r.earnings_gross}`)
    );

    const insert = db.prepare(`
      INSERT INTO runs (user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    let skipped = 0;

    const importMany = db.transaction(() => {
      for (const row of rows) {
        const key = `${row.date}|${row.earnings_gross}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        const tips = row.tips ?? 0;
        const uber_fee = row.uber_fee ?? 0;
        const net = row.earnings_gross + tips - uber_fee;
        insert.run(
          user_id,
          row.date,
          row.hours ?? null,
          row.earnings_gross,
          tips,
          row.miles ?? 0,
          row.platform ?? "Uber Eats",
          uber_fee,
          net
        );
        inserted++;
      }
    });

    importMany();
    return NextResponse.json({ inserted, skipped }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
