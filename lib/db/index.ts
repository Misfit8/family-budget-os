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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      income_type TEXT NOT NULL,
      weekly_salary_target REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shared_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      paid_by_user_id INTEGER,
      month TEXT,
      paid INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS weekly_salary_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_amount REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tax_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      set_aside REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ssi_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      countable_assets REAL DEFAULT 0,
      able_account REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS w2_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      net_take_home REAL NOT NULL,
      pay_frequency TEXT NOT NULL,
      next_payday TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations
  try { db.exec("ALTER TABLE runs ADD COLUMN note TEXT"); } catch { /* already exists */ }
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      dismissed INTEGER DEFAULT 0
    );
  `);

  // Seed family members if not already seeded
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO users (id, name, income_type) VALUES (?, ?, ?)"
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
