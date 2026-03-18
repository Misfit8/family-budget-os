import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface ParsedStatement {
  date_range: string;
  deliveries: number;
  hours: number;
  earnings_gross: number;
  uber_fee: number;
  tips: number;
  net: number;
  miles: number;
}

// POST with { user_id, pdf_base64 } — parse PDF via Claude
// POST with { user_id, rows } — bulk insert pre-parsed rows (confirm step)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // --- PDF parse mode ---
    if (body.pdf_base64) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: body.pdf_base64,
                },
              } as Anthropic.DocumentBlockParam,
              {
                type: "text",
                text: `Extract earnings data from this Uber Eats weekly statement.
Return ONLY a JSON object with these fields:
{
  "date_range": "YYYY-MM-DD to YYYY-MM-DD",
  "deliveries": number,
  "hours": number,
  "earnings_gross": number,
  "uber_fee": number,
  "tips": number,
  "net": number,
  "miles": number
}
No preamble. No markdown. JSON only.`,
              } as Anthropic.TextBlockParam,
            ],
          },
        ],
      });

      const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

      let parsed: ParsedStatement;
      try {
        parsed = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Claude could not parse the PDF. Is this an Uber Eats weekly statement?" }, { status: 422 });
      }

      return NextResponse.json({ preview: parsed });
    }

    // --- Confirm/insert mode ---
    if (body.rows && Array.isArray(body.rows)) {
      const db = getDb();
      const rows = body.rows as ParsedStatement[];

      // Duplicate detection: skip if same date_range + net already exists
      const existing = db
        .prepare("SELECT note, net FROM runs WHERE user_id = ?")
        .all(Number(user_id)) as { note: string; net: number }[];

      const existingKeys = new Set(
        existing.map((r) => `${r.note}|${Math.round(r.net * 100)}`)
      );

      const insert = db.prepare(`
        INSERT INTO runs (user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let inserted = 0;
      let skipped = 0;

      const importMany = db.transaction(() => {
        for (const row of rows) {
          const key = `${row.date_range}|${Math.round(row.net * 100)}`;
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          // Use the start date of the range as the run date
          const date = row.date_range?.split(" to ")[0] ?? new Date().toISOString().slice(0, 10);
          insert.run(
            Number(user_id),
            date,
            row.hours ?? null,
            row.earnings_gross ?? 0,
            row.tips ?? 0,
            row.miles ?? 0,
            "Uber Eats",
            row.uber_fee ?? 0,
            row.net ?? 0,
            row.date_range // store date_range in note for dupe detection
          );
          inserted++;
        }
      });

      importMany();
      return NextResponse.json({ inserted, skipped }, { status: 201 });
    }

    return NextResponse.json({ error: "Provide pdf_base64 or rows" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
