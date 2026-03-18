import { getDb } from "@/lib/db";

interface NotificationInsert {
  user_id: number;
  type: string;
  title: string;
  body: string;
  action_url?: string;
}

export function createNotification(n: NotificationInsert) {
  const db = getDb();

  // Dedupe: don't create the same type twice in 24 hours
  const recent = db
    .prepare(
      `SELECT id FROM notifications WHERE user_id = ? AND type = ?
       AND created_at > datetime('now', '-1 day') LIMIT 1`
    )
    .get(n.user_id, n.type);

  if (recent) return null;

  const result = db
    .prepare(
      "INSERT INTO notifications (user_id, type, title, body, action_url) VALUES (?, ?, ?, ?, ?)"
    )
    .run(n.user_id, n.type, n.title, n.body, n.action_url ?? null);

  return result.lastInsertRowid;
}

export function checkAndCreateAlerts(userId: number) {
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as {
    id: number; name: string; income_type: string;
  };
  if (!user) return;

  if (user.income_type === "gig") {
    // Runway alerts
    const balRow = db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ?")
      .get(userId) as { total: number };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const burnRow = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM buffer WHERE user_id = ? AND type = 'withdrawal' AND date >= ?"
      )
      .get(userId, cutoff.toISOString().slice(0, 10)) as { total: number };

    const balance = balRow.total;
    const avgBurn = Math.abs(burnRow.total) / 30;
    const runway = avgBurn > 0 ? balance / avgBurn : null;

    if (runway !== null && runway < 3) {
      createNotification({
        user_id: userId,
        type: "RUNWAY_CRITICAL",
        title: `Runway is ${Math.floor(runway)} days`,
        body: `Your buffer has ${Math.floor(runway)} days left. Review your buffer soon.`,
        action_url: `/gig/${userId}/buffer`,
      });
    } else if (runway !== null && runway < 7) {
      createNotification({
        user_id: userId,
        type: "RUNWAY_LOW",
        title: `Runway is ${Math.floor(runway)} days`,
        body: `Your buffer covers ${Math.floor(runway)} days of expenses. Consider a deposit.`,
        action_url: `/gig/${userId}/buffer`,
      });
    }

    // Tax: quarterly due within 30 days and set-aside gap > 20%
    const year = new Date().getFullYear();
    const taxRow = db
      .prepare("SELECT set_aside FROM tax_tracker WHERE user_id = ? AND year = ?")
      .get(userId, year) as { set_aside: number } | undefined;

    const ytdRow = db
      .prepare(
        `SELECT COALESCE(SUM(earnings_gross),0) as gross, COALESCE(SUM(tips),0) as tips,
         COALESCE(SUM(miles),0) as miles FROM runs WHERE user_id = ? AND strftime('%Y',date) = ?`
      )
      .get(userId, String(year)) as { gross: number; tips: number; miles: number };

    const netTaxable = Math.max(0, (ytdRow.gross + ytdRow.tips) - ytdRow.miles * 0.67);
    const seEstimate = netTaxable * 0.15;
    const setAside = taxRow?.set_aside ?? 0;

    if (seEstimate > 0 && setAside < seEstimate * 0.8) {
      createNotification({
        user_id: userId,
        type: "SET_ASIDE_GAP",
        title: "Tax set-aside may be low",
        body: `You've set aside $${setAside.toFixed(0)} of an estimated $${seEstimate.toFixed(0)} owed.`,
        action_url: `/gig/${userId}/tax`,
      });
    }
  }

  if (user.income_type === "ssi") {
    const assets = db
      .prepare("SELECT countable_assets FROM ssi_assets WHERE user_id = ?")
      .get(userId) as { countable_assets: number } | undefined;

    const countable = assets?.countable_assets ?? 0;

    if (countable >= 2000) {
      createNotification({
        user_id: userId,
        type: "ASSET_CRISIS",
        title: "SSI asset limit reached",
        body: "Your countable assets are at or above $2,000. Contact SSA immediately. This is not legal advice.",
        action_url: `/ssi/${userId}/assets`,
      });
    } else if (countable >= 1800) {
      createNotification({
        user_id: userId,
        type: "ASSET_RED",
        title: `Assets at $${countable.toFixed(0)} — near SSI limit`,
        body: "Consider an ABLE account for new savings. Contact a benefits counselor. This is not legal advice.",
        action_url: `/ssi/${userId}/assets`,
      });
    } else if (countable >= 1500) {
      createNotification({
        user_id: userId,
        type: "ASSET_AMBER",
        title: `Assets at $${countable.toFixed(0)} — approaching limit`,
        body: "Avoid adding to countable savings right now. This is not legal advice.",
        action_url: `/ssi/${userId}/assets`,
      });
    }
  }
}
