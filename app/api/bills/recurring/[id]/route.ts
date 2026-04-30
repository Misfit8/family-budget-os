import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Deactivate a recurring bill template and remove all unpaid future instances. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("UPDATE recurring_bills SET active = 0 WHERE id = ?").run(Number(id));
    db.prepare("DELETE FROM shared_bills WHERE recurring_bill_id = ? AND paid = 0").run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
