import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const db = getDb();
    const uid = Number(user_id);

    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const cutoff = eightWeeksAgo.toISOString().slice(0, 10);

    const runs = db
      .prepare("SELECT * FROM runs WHERE user_id = ? AND date >= ? ORDER BY date ASC")
      .all(uid, cutoff);

    if (runs.length === 0) {
      return NextResponse.json({ analysis: "No runs logged in the last 8 weeks. Start logging to see patterns." });
    }

    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(uid) as { name: string };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a calm, honest financial advisor analyzing gig work patterns for ${user?.name || "a gig worker"}.

Here are their Uber Eats runs from the last 8 weeks:
${JSON.stringify(runs, null, 2)}

Please analyze and provide:
1. Best earning days of the week
2. Best time windows (if hours data available)
3. Weekly earnings floor (minimum they can reliably expect)
4. Trend direction (improving, declining, or stable)
5. One specific actionable recommendation

Keep it brief, practical, and honest. No fluff. Format as clean paragraphs, not bullet lists.`,
        },
      ],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
