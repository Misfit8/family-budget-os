import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { paid, paid_by_user_id } = await req.json();
    const db = getDb();

    db.prepare(
      "UPDATE shared_bills SET paid = ?, paid_by_user_id = ? WHERE id = ?"
    ).run(paid ? 1 : 0, paid_by_user_id ?? null, Number(id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const bill = db.prepare("SELECT recurring_bill_id FROM shared_bills WHERE id = ?").get(Number(id)) as { recurring_bill_id: number | null } | undefined;
    if (bill?.recurring_bill_id) {
      // Mark skipped so syncRecurringBills won't recreate it for this month
      db.prepare("UPDATE shared_bills SET skipped = 1 WHERE id = ?").run(Number(id));
    } else {
      db.prepare("DELETE FROM shared_bills WHERE id = ?").run(Number(id));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
