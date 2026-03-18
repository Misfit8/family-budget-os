import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "budget.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      household_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      income_type TEXT NOT NULL,
      weekly_salary_target REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      hours REAL,
      earnings_gross REAL,
      tips REAL DEFAULT 0,
      miles REAL DEFAULT 0,
      platform TEXT DEFAULT 'Uber Eats',
      uber_fee REAL DEFAULT 0,
      net REAL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS buffer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shared_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      paid_by_user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS weekly_salary_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      target_amount REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tax_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      set_aside REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ssi_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      countable_assets REAL DEFAULT 0,
      able_account REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS w2_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      net_take_home REAL NOT NULL,
      pay_frequency TEXT NOT NULL,
      next_payday TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      monthly_contribution REAL DEFAULT 0,
      is_family_goal INTEGER DEFAULT 0,
      deadline TEXT,
      status TEXT DEFAULT 'active',
      is_able INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      goal_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      action_url TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      dismissed INTEGER DEFAULT 0
    );
  `);

  // Migrations — add household_id to all existing tables
  const addHouseholdId = (table: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN household_id INTEGER NOT NULL DEFAULT 1`);
    } catch { /* column already exists */ }
  };

  [
    "users", "runs", "buffer", "shared_bills", "weekly_salary_settings",
    "tax_tracker", "ssi_assets", "w2_settings", "savings_goals",
    "goal_contributions", "notifications", "digests",
  ].forEach(addHouseholdId);

  db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL,
      original_balance REAL NOT NULL,
      minimum_payment REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      debt_type TEXT DEFAULT 'other',
      is_shared INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      paid_off_at TEXT
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL DEFAULT 1,
      debt_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payment_type TEXT DEFAULT 'minimum',
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Indexes for query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_runs_user_date        ON runs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_buffer_user           ON buffer(user_id);
    CREATE INDEX IF NOT EXISTS idx_buffer_user_type_date ON buffer(user_id, type, date);
    CREATE INDEX IF NOT EXISTS idx_debts_user            ON debts(user_id);
    CREATE INDEX IF NOT EXISTS idx_debt_payments_debt    ON debt_payments(debt_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_goals_user            ON savings_goals(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_digests_user          ON digests(user_id);
    CREATE INDEX IF NOT EXISTS idx_tax_user_year         ON tax_tracker(user_id, year);
    CREATE INDEX IF NOT EXISTS idx_ssi_user              ON ssi_assets(user_id);
  `);

  // Other migrations
  try { db.exec("ALTER TABLE runs ADD COLUMN note TEXT"); } catch { /* already exists */ }

  // Seed default household
  const hCount = (db.prepare("SELECT COUNT(*) as c FROM households").get() as { c: number }).c;
  if (hCount === 0) {
    db.prepare("INSERT INTO households (id, name) VALUES (1, 'Home')").run();
  }

  // Seed family members if not already seeded
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO users (id, household_id, name, income_type) VALUES (?, 1, ?, ?)"
    );
    const seedMany = db.transaction(() => {
      insert.run(1, "Mom", "gig");
      insert.run(2, "Dad", "gig");
      insert.run(3, "Braddon", "ssi");
      insert.run(4, "Bro1", "w2");
      insert.run(5, "Bro2", "tbd");
    });
    seedMany();
    console.log("DB seeded with family members.");
  }
}
