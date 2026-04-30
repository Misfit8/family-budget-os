import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const API_KEY_ID = process.env.ARGYLE_API_KEY_ID ?? "";
const API_KEY_SECRET = process.env.ARGYLE_API_KEY_SECRET ?? "";
const API_BASE = process.env.ARGYLE_SANDBOX === "false"
  ? "https://api.argyle.com/v2"
  : "https://api-sandbox.argyle.com/v2";

function authHeader() {
  return "Basic " + Buffer.from(`${API_KEY_ID}:${API_KEY_SECRET}`).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY_ID || !API_KEY_SECRET) {
      return NextResponse.json({ error: "Argyle API keys not configured" }, { status: 503 });
    }

    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const db = getDb();

    // Look up or create Argyle user for this app user
    let row = db
      .prepare("SELECT argyle_user_id FROM argyle_users WHERE user_id = ?")
      .get(Number(user_id)) as { argyle_user_id: string } | undefined;

    if (!row) {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { Authorization: authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Argyle create user failed: ${res.status}`);
      const data = await res.json();
      db.prepare("INSERT INTO argyle_users (user_id, argyle_user_id) VALUES (?, ?)").run(
        Number(user_id), data.id
      );
      row = { argyle_user_id: data.id };
    }

    // Always create a fresh token (tokens are short-lived)
    const tokenRes = await fetch(`${API_BASE}/user-tokens`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ user: row.argyle_user_id }),
    });
    if (!tokenRes.ok) throw new Error(`Argyle token create failed: ${tokenRes.status}`);
    const { user_token } = await tokenRes.json();

    return NextResponse.json({ userToken: user_token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to get Argyle token" }, { status: 500 });
  }
}
