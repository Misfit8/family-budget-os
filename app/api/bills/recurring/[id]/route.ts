import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Deactivate a recurring bill template (stops future generation). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("UPDATE recurring_bills SET active = 0 WHERE id = ?").run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
