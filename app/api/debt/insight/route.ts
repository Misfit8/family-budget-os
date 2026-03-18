import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { simulatePayoff } from "@/lib/debtCalc";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { user_id, monthly_extra } = await req.json();
    const db = getDb();
    const uid = Number(user_id);

    const debts = db
      .prepare("SELECT * FROM debts WHERE user_id = ? AND paid_off_at IS NULL ORDER BY balance ASC")
      .all(uid) as {
        id: number; name: string; balance: number; minimum_payment: number;
        interest_rate: number; debt_type: string;
      }[];

    if (debts.length === 0) {
      return NextResponse.json({ error: "No active debts" }, { status: 400 });
    }

    const extra = Number(monthly_extra ?? 0);
    const snowball = simulatePayoff(debts, extra, "snowball");
    const avalanche = simulatePayoff(debts, extra, "avalanche");

    // Get gig runway for context
    const bufRow = db
      .prepare("SELECT COALESCE(SUM(amount),0) as total FROM buffer WHERE user_id = ?")
      .get(uid) as { total: number };
    const burnCutoff = new Date();
    burnCutoff.setDate(burnCutoff.getDate() - 30);
    const burnRow = db
      .prepare("SELECT COALESCE(SUM(amount),0) as total FROM buffer WHERE user_id = ? AND type='withdrawal' AND date >= ?")
      .get(uid, burnCutoff.toISOString().slice(0, 10)) as { total: number };
    const runway = Math.abs(burnRow.total) > 0
      ? Math.floor(bufRow.total / (Math.abs(burnRow.total) / 30))
      : null;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are a calm, honest financial advisor analyzing debt for a family member.

Debts: ${JSON.stringify(debts, null, 2)}
Monthly extra available: $${extra}
Snowball payoff: ${snowball.months} months (${snowball.freedom_date}), interest: $${snowball.total_interest}
Avalanche payoff: ${avalanche.months} months (${avalanche.freedom_date}), interest: $${avalanche.total_interest}
Buffer runway: ${runway !== null ? runway + " days" : "unknown"}

Return ONLY a JSON object:
{
  "recommended_strategy": "snowball" | "avalanche",
  "reason": "one sentence",
  "highest_risk_debt": "debt name",
  "one_change": "one specific action that moves the freedom date most",
  "summary": "2 sentences max — calm, honest, forward-looking"
}
No preamble. No markdown. JSON only.`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: "Parse failed" }, { status: 422 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
