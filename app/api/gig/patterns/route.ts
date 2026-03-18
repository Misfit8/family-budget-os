import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MIN_RUNS = 20;

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const db = getDb();
    const uid = Number(user_id);

    const allRuns = db
      .prepare("SELECT * FROM runs WHERE user_id = ? ORDER BY date ASC")
      .all(uid) as {
        id: number; date: string; hours: number; earnings_gross: number;
        tips: number; miles: number; net: number; uber_fee: number;
      }[];

    // Not enough data
    if (allRuns.length < MIN_RUNS) {
      return NextResponse.json({
        insufficient: true,
        run_count: allRuns.length,
        min_runs: MIN_RUNS,
      });
    }

    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(uid) as { name: string };

    // Enrich runs with day of week
    const enriched = allRuns.map((r) => ({
      ...r,
      day_of_week: new Date(r.date).toLocaleDateString("en-US", { weekday: "long" }),
      effective_hourly: r.hours > 0 ? r.net / r.hours : null,
    }));

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are analyzing gig work patterns for ${user?.name ?? "a driver"}.

Run history (${enriched.length} total runs):
${JSON.stringify(enriched, null, 2)}

Return ONLY a JSON object:
{
  "best_days": [
    { "day": "Saturday", "avg_hourly": 19.40, "hit_rate": 0.87, "note": "string" }
  ],
  "best_windows": [
    { "label": "Fri/Sat dinner (6-9pm)", "avg_hourly": 21.20, "consistency": "high|medium|low" }
  ],
  "avoid": [
    { "label": "Mon morning (8-11am)", "avg_hourly": 8.40, "note": "string" }
  ],
  "weekly_floor": number,
  "weekly_target_plan": "string — how to hit their average weekly earnings",
  "mileage_insight": "string",
  "trend": "improving|stable|declining",
  "trend_note": "string"
}
No preamble. No markdown. JSON only.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    try {
      const analysis = JSON.parse(text);
      return NextResponse.json({ analysis, run_count: allRuns.length });
    } catch {
      return NextResponse.json({ error: "Failed to parse analysis." }, { status: 422 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
