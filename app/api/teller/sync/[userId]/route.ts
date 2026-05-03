import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { tellerRequest } from "@/lib/teller";

interface TellerAccount {
  id: string;
  enrollment_id: string;
  name: string;
  type: string;
  subtype: string;
  last_four: string;
  institution: { name: string };
}

interface TellerBalance {
  available: string | null;
  ledger: string | null;
}

interface TellerTransaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: string;
  type: string;
  status: string;
  details?: { category?: string };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const db = getDb();

    const enrollments = db
      .prepare("SELECT * FROM teller_enrollments WHERE user_id = ?")
      .all(Number(userId)) as { id: number; enrollment_id: string; access_token: string; institution: string }[];

    if (enrollments.length === 0) {
      return NextResponse.json({ error: "No linked accounts" }, { status: 404 });
    }

    let accountsSynced = 0;
    let txnsSynced = 0;

    for (const enrollment of enrollments) {
      const accounts = await tellerRequest<TellerAccount[]>("/accounts", enrollment.access_token);

      for (const acct of accounts) {
        const balance = await tellerRequest<TellerBalance>(
          `/accounts/${acct.id}/balances`,
          enrollment.access_token
        ).catch(() => ({ available: null, ledger: null }));

        db.prepare(`
          INSERT INTO teller_accounts (user_id, enrollment_id, account_id, account_name, account_type, account_subtype, last_four, institution, balance_available, balance_ledger, last_synced)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(account_id) DO UPDATE SET
            account_name = excluded.account_name,
            balance_available = excluded.balance_available,
            balance_ledger = excluded.balance_ledger,
            last_synced = excluded.last_synced
        `).run(
          Number(userId),
          acct.enrollment_id,
          acct.id,
          acct.name,
          acct.type,
          acct.subtype,
          acct.last_four,
          acct.institution?.name ?? enrollment.institution,
          balance.available != null ? parseFloat(balance.available) : null,
          balance.ledger != null ? parseFloat(balance.ledger) : null
        );
        accountsSynced++;

        const txns = await tellerRequest<TellerTransaction[]>(
          `/accounts/${acct.id}/transactions`,
          enrollment.access_token
        );

        for (const txn of txns) {
          db.prepare(`
            INSERT INTO teller_transactions (user_id, account_id, transaction_id, date, description, amount, type, status, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(transaction_id) DO UPDATE SET
              status = excluded.status,
              amount = excluded.amount
          `).run(
            Number(userId),
            txn.account_id,
            txn.id,
            txn.date,
            txn.description,
            parseFloat(txn.amount),
            txn.type,
            txn.status,
            txn.details?.category ?? null
          );
          txnsSynced++;
        }
      }
    }

    return NextResponse.json({ ok: true, accountsSynced, txnsSynced });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
