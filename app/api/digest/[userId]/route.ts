import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface DigestContent {
  headline: string;
  runway_status?: string;
  key_metric: string;
  insight: string;
  action_item: string;
}

function isStale(generatedAt: string): boolean {
  const generated = new Date(generatedAt);
  const now = new Date();
  const diffDays = (now.getTime() - generated.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 6;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);
  const force = new URL(req.url).searchParams.get("refresh") === "1";

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid) as {
    id: number; name: string; income_type: string;
  };

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Return cached digest if fresh
  const cached = db
    .prepare("SELECT * FROM digests WHERE user_id = ? AND dismissed = 0 ORDER BY generated_at DESC LIMIT 1")
    .get(uid) as { id: number; content: string; generated_at: string } | undefined;

  if (cached && !force && !isStale(cached.generated_at)) {
    return NextResponse.json({ id: cached.id, ...JSON.parse(cached.content), generated_at: cached.generated_at, fresh: false });
  }

  // Generate new digest
  const prompt = buildPrompt(user, db);
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  let content: DigestContent;
  try {
    content = JSON.parse(text);
  } catch {
    content = {
      headline: "Weekly check-in",
      key_metric: "—",
      insight: text,
      action_item: "Review your dashboard.",
    };
  }

  // Save to DB (dismiss any old ones)
  db.prepare("UPDATE digests SET dismissed = 1 WHERE user_id = ?").run(uid);
  const result = db
    .prepare("INSERT INTO digests (user_id, content) VALUES (?, ?)")
    .run(uid, JSON.stringify(content));

  return NextResponse.json({
    id: result.lastInsertRowid,
    ...content,
    generated_at: new Date().toISOString(),
    fresh: true,
  });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  db.prepare("UPDATE digests SET dismissed = 1 WHERE user_id = ? AND dismissed = 0")
    .run(Number(userId));
  return NextResponse.json({ ok: true });
}

function buildPrompt(
  user: { id: number; name: string; income_type: string },
  db: ReturnType<typeof getDb>
): string {
  const uid = user.id;
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekCutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const base = `You are a calm, honest financial assistant. Generate a weekly digest for ${user.name}.
Return ONLY a JSON object:
{
  "headline": "one short sentence (max 10 words)",
  "runway_status": "optional one sentence about runway/assets",
  "key_metric": "the single most important number this week",
  "insight": "one observation about their data (1-2 sentences, calm tone)",
  "action_item": "one specific thing to do this week (1 sentence)"
}
No preamble. No markdown. JSON only.

Today: ${today}
`;

  if (user.income_type === "gig") {
    const weekRuns = db
      .prepare("SELECT * FROM runs WHERE user_id = ? AND date >= ?")
      .all(uid, weekCutoff) as { net: number; earnings_gross: number; miles: number; hours: number }[];

    const bufRow = db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ?")
      .get(uid) as { total: number };

    const burnCutoff = new Date();
    burnCutoff.setDate(burnCutoff.getDate() - 30);
    const burnRow = db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ? AND type = 'withdrawal' AND date >= ?")
      .get(uid, burnCutoff.toISOString().slice(0, 10)) as { total: number };

    const balance = bufRow.total;
    const avgBurn = Math.abs(burnRow.total) / 30;
    const runway = avgBurn > 0 ? Math.floor(balance / avgBurn) : null;
    const weekNet = weekRuns.reduce((s, r) => s + r.net, 0);
    const weekMiles = weekRuns.reduce((s, r) => s + r.miles, 0);
    const weekHours = weekRuns.reduce((s, r) => s + (r.hours ?? 0), 0);

    const taxRow = db
      .prepare("SELECT * FROM tax_tracker WHERE user_id = ? AND year = ?")
      .get(uid, new Date().getFullYear()) as { set_aside: number } | undefined;

    return `${base}
Gig worker data:
- Last 7 days: ${weekRuns.length} runs, $${weekNet.toFixed(2)} net, ${weekMiles.toFixed(1)} miles, ${weekHours.toFixed(1)} hours
- Buffer balance: $${balance.toFixed(2)}
- Runway: ${runway !== null ? runway + " days" : "unknown (no burn data)"}
- Tax set aside this year: $${(taxRow?.set_aside ?? 0).toFixed(2)}
`;
  }

  if (user.income_type === "ssi") {
    const assets = db
      .prepare("SELECT * FROM ssi_assets WHERE user_id = ?")
      .get(uid) as { countable_assets: number; able_account: number } | undefined;

    const countable = assets?.countable_assets ?? 0;
    const able = assets?.able_account ?? 0;
    const remaining = Math.max(0, 2000 - countable);

    return `${base}
SSI recipient data:
- Countable assets: $${countable.toFixed(2)} (limit: $2,000, remaining: $${remaining.toFixed(2)})
- ABLE account: $${able.toFixed(2)}
- Status: ${countable >= 2000 ? "CRISIS — at limit" : countable >= 1800 ? "RED — near limit" : countable >= 1500 ? "AMBER — approaching" : "GREEN — on track"}
Note: always remind to report any outside income to SSA. Never give legal advice.
`;
  }

  if (user.income_type === "w2") {
    const w2 = db
      .prepare("SELECT * FROM w2_settings WHERE user_id = ?")
      .get(uid) as { net_take_home: number; pay_frequency: string; next_payday: string } | undefined;

    const bills = db
      .prepare("SELECT * FROM shared_bills WHERE month = ? AND paid = 0")
      .all(today.slice(0, 7)) as { name: string; amount: number }[];

    const unpaidTotal = bills.reduce((s, b) => s + b.amount, 0);

    return `${base}
W-2 employee data:
- Net take-home per paycheck: $${(w2?.net_take_home ?? 0).toFixed(2)} (${w2?.pay_frequency ?? "unknown"})
- Next payday: ${w2?.next_payday ?? "not set"}
- Unpaid shared bills this month: $${unpaidTotal.toFixed(2)} across ${bills.length} bill(s)
`;
  }

  return `${base}\nIncome type: ${user.income_type} (not yet configured)`;
}
