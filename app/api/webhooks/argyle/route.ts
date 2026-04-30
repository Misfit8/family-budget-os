import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.ARGYLE_WEBHOOK_SECRET ?? "";

function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true;
  const expected = crypto.createHmac("sha512", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function gigDate(startDatetime: string, timezone?: string): string {
  if (timezone) {
    try {
      return new Date(startDatetime).toLocaleDateString("en-CA", { timeZone: timezone });
    } catch { /* fall through */ }
  }
  return startDatetime.slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-argyle-signature") ?? "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { event } = payload;

    if (!["gig.added", "gig.updated"].includes(event)) {
      return NextResponse.json({ ok: true });
    }

    const gig = payload.data?.resource;
    if (!gig || gig.status !== "completed") return NextResponse.json({ ok: true });

    const db = getDb();

    const accountRow = db
      .prepare("SELECT user_id FROM argyle_accounts WHERE argyle_account_id = ?")
      .get(gig.account) as { user_id: number } | undefined;

    if (!accountRow) {
      console.warn(`Argyle webhook: no account mapping for account ${gig.account}`);
      return NextResponse.json({ ok: true });
    }

    const { user_id } = accountRow;
    const earnings = gig.earnings ?? {};
    const date = gigDate(gig.start_datetime, gig.timezone);
    const hours = gig.duration ? Math.round((gig.duration / 3600) * 10) / 10 : 0;
    const miles = gig.distance
      ? Math.round((gig.distance_unit === "km" ? gig.distance * 0.621371 : gig.distance) * 10) / 10
      : 0;
    const gross = earnings.gross ?? 0;
    const tips = earnings.tip ?? 0;
    const uber_fee = earnings.platform_fee ?? 0;
    const net = earnings.net ?? gross + tips - uber_fee;
    const platform = gig.employer ?? "Uber Eats";

    const existing = db
      .prepare("SELECT id FROM runs WHERE argyle_gig_id = ?")
      .get(gig.id) as { id: number } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE runs
        SET date = ?, hours = ?, earnings_gross = ?, tips = ?, miles = ?,
            platform = ?, uber_fee = ?, net = ?
        WHERE argyle_gig_id = ?
      `).run(date, hours, gross, tips, miles, platform, uber_fee, net, gig.id);
    } else {
      db.prepare(`
        INSERT INTO runs
          (user_id, date, hours, earnings_gross, tips, miles, platform, uber_fee, net, argyle_gig_id, household_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(user_id, date, hours, gross, tips, miles, platform, uber_fee, net, gig.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
