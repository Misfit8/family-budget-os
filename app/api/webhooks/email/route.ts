import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const EMAIL_WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET ?? "";

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

export async function POST(req: NextRequest) {
  try {
    // Validate secret token
    const secret = req.nextUrl.searchParams.get("secret");
    if (EMAIL_WEBHOOK_SECRET && secret !== EMAIL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = req.nextUrl.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id query param required" }, { status: 400 });
    }

    const body = await req.json();
    // Zapier Gmail trigger sends Body Plain as body_text; accept multiple field names
    const emailText: string = body.body_text ?? body.body_plain ?? body.body ?? body.text ?? "";
    if (!emailText.trim()) {
      return NextResponse.json({ error: "No email body provided" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You extract structured earnings data from Uber Eats earnings emails. Return only valid JSON, no markdown.",
      messages: [
        {
          role: "user",
          content: `Extract earnings from this Uber Eats email. Return ONLY a JSON object with these exact fields:
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
Rules:
- date_range must use ISO format (YYYY-MM-DD to YYYY-MM-DD)
- Use 0 for any missing numeric fields
- net = earnings_gross + tips - uber_fee if not stated explicitly
- If this is not an Uber earnings email, return { "error": "not an earnings email" }
- No preamble, no markdown, JSON only

EMAIL:
${emailText.slice(0, 8000)}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const cleaned = raw.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();

    let parsed: ParsedStatement & { error?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Claude response not parseable:", raw);
      return NextResponse.json({ error: "Could not parse earnings from email" }, { status: 422 });
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    if (!parsed.date_range || (!parsed.net && !parsed.earnings_gross)) {
      return NextResponse.json({ error: "No earnings data found in email" }, { status: 422 });
    }

    const db = getDb();

    // Dedup by date_range — re-processing same email is safe
    const existing = db
      .prepare("SELECT id FROM runs WHERE user_id = ? AND note = ?")
      .get(Number(user_id), parsed.date_range);

    if (existing) {
      return NextResponse.json({ inserted: 0, skipped: 1, reason: "duplicate", date_range: parsed.date_range });
    }

    const date = parsed.date_range.split(" to ")[0] ?? new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO runs
        (user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net, note, household_id)
      VALUES (?, ?, ?, ?, ?, ?, 'Uber Eats', ?, ?, ?, 1)
    `).run(
      Number(user_id),
      date,
      parsed.hours ?? null,
      parsed.earnings_gross ?? 0,
      parsed.tips ?? 0,
      parsed.miles ?? 0,
      parsed.uber_fee ?? 0,
      parsed.net ?? 0,
      parsed.date_range,
    );

    return NextResponse.json({
      inserted: 1,
      skipped: 0,
      date_range: parsed.date_range,
      net: parsed.net,
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
