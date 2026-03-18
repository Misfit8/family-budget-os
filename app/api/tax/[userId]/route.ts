import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const MILEAGE_RATE = 0.67;
const SE_TAX_RATE = 0.15;

const QUARTERLY_DATES = [
  { label: "Q1", date: "04-15" },
  { label: "Q2", date: "06-15" },
  { label: "Q3", date: "09-15" },
  { label: "Q4", date: "01-15" }, // next year
];

function nextQuarterlyDue(): { label: string; date: string; daysAway: number } {
  const now = new Date();
  const year = now.getFullYear();

  for (const q of QUARTERLY_DATES) {
    const qYear = q.label === "Q4" ? year + 1 : year;
    const due = new Date(`${qYear}-${q.date}`);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) return { label: q.label, date: due.toISOString().slice(0, 10), daysAway: diff };
  }

  // fallback: Q4 next year
  const due = new Date(`${year + 1}-01-15`);
  return { label: "Q4", date: due.toISOString().slice(0, 10), daysAway: 0 };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  const uid = Number(userId);
  const year = new Date().getFullYear();

  const ytdRow = db
    .prepare(
      `SELECT COALESCE(SUM(earnings_gross), 0) as gross, COALESCE(SUM(tips), 0) as tips,
       COALESCE(SUM(miles), 0) as miles
       FROM runs WHERE user_id = ? AND strftime('%Y', date) = ?`
    )
    .get(uid, String(year)) as { gross: number; tips: number; miles: number };

  const ytdGross = ytdRow.gross + ytdRow.tips;
  const ytdMiles = ytdRow.miles;
  const mileageDeduction = ytdMiles * MILEAGE_RATE;
  const netTaxable = Math.max(0, ytdGross - mileageDeduction);
  const seEstimate = netTaxable * SE_TAX_RATE;

  const taxRow = db
    .prepare("SELECT * FROM tax_tracker WHERE user_id = ? AND year = ?")
    .get(uid, year) as { set_aside: number } | undefined;

  const setAside = taxRow?.set_aside ?? 0;
  const remaining = Math.max(0, seEstimate - setAside);
  const nextDue = nextQuarterlyDue();

  return NextResponse.json({
    year,
    ytdGross,
    ytdMiles,
    mileageDeduction,
    netTaxable,
    seEstimate,
    setAside,
    remaining,
    nextDue,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { set_aside } = await req.json();
  const db = getDb();
  const uid = Number(userId);
  const year = new Date().getFullYear();

  const existing = db
    .prepare("SELECT id FROM tax_tracker WHERE user_id = ? AND year = ?")
    .get(uid, year);

  if (existing) {
    db.prepare("UPDATE tax_tracker SET set_aside = ?, updated_at = datetime('now') WHERE user_id = ? AND year = ?")
      .run(set_aside, uid, year);
  } else {
    db.prepare("INSERT INTO tax_tracker (user_id, year, set_aside) VALUES (?, ?, ?)")
      .run(uid, year, set_aside);
  }

  return NextResponse.json({ ok: true });
}
