# Family Budget OS

## Project context
Family budget prototype targeting multi-income households. Flask/SQLite experience transfers â€”
same patterns, Next.js API routes instead of Flask routes. Mobile-first: family members use phones.

## Stack
- Next.js 14 App Router, TypeScript, Tailwind
- SQLite via better-sqlite3 at /data/budget.db
- Claude API calls server-side only (never client-side)
- No auth yet â€” prototype phase

## Income modes
- GIG:  Uber Eats (Mom, Dad) â€” shift-based, chaotic income, Uber CSV import
- SSI:  Fixed monthly (Braddon) â€” $2,000 countable asset limit, strict SSI rules
- W2:   Steady paycheck (Bro 1) â€” predictable bi-weekly/monthly direct deposit
- TBD:  Bro 2 â€” picks income type at setup

## Seeded family members (in DB)
users table must be seeded on first run:
  id=1  name=Mom     income_type=gig
  id=2  name=Dad     income_type=gig
  id=3  name=Braddon income_type=ssi
  id=4  name=Bro1    income_type=w2
  id=5  name=Bro2    income_type=tbd

## Build rules
- Mobile-first â€” all layouts work on 390px width minimum
- NEVER expose ANTHROPIC_API_KEY client-side
- SSI asset limit warnings are non-negotiable â€” always render when assets approach $2,000
- Runway metric is the PRIMARY KPI for gig workers (not "budget remaining")
- Runway = buffer_balance / avg_daily_burn (trailing 30 days)
- Runway display: 72px font, centered, color-coded (green >14d, amber 7-14d, red <7d)
- IRS mileage rate 2025: $0.67/mile
- SE tax estimate: net_taxable Ã— 0.15
- Quarterly tax due dates: Apr 15, Jun 15, Sep 15, Jan 15
- Keep DB migrations versioned in /lib/db/migrations/
- App tone: calm, honest mirror â€” used during financial stress, never alarming UI

## DB schema (better-sqlite3 at /data/budget.db)
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  income_type TEXT NOT NULL,
  weekly_salary_target REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE runs (
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
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE buffer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE shared_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT,
  paid_by_user_id INTEGER,
  month TEXT,
  paid INTEGER DEFAULT 0
);
CREATE TABLE weekly_salary_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_amount REAL NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE tax_tracker (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  set_aside REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE ssi_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  countable_assets REAL DEFAULT 0,
  able_account REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE w2_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  net_take_home REAL NOT NULL,
  pay_frequency TEXT NOT NULL,
  next_payday TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

## Pages to build (full app)

### Session 1 â€” Gig Spoke (Mom + Dad)
/gig/[userId]          â€” Dashboard: runway, buffer, weekly earnings vs target, trailing avg
/gig/[userId]/log      â€” Quick run logger (date, hours, gross, tips, miles, platform)
/gig/[userId]/import   â€” Uber CSV import with preview + duplicate detection
/gig/[userId]/tax      â€” Tax tracker (YTD gross, miles, deductions, SE tax, set-aside, countdown)
/gig/[userId]/patterns â€” Claude-powered patterns (best days/windows, weekly floor, trend)

### Session 2 â€” Family Hub
/hub                   â€” Household runway, shared bills, contribution status per member

### Session 3 â€” SSI Spoke (Braddon)
/ssi/[userId]          â€” Fixed income dashboard, countable asset tracker, SSI limit guard
/ssi/[userId]/assets   â€” Asset tracker widget with green/amber/red/crisis status

### Session 4 â€” W-2 Spoke (Bro 1)
/w2/[userId]           â€” Pay schedule dashboard, next payday countdown, contribution tracker

## API routes
POST /api/runs                â€” insert single run
POST /api/runs/import         â€” bulk CSV import (papaparse)
GET  /api/runs/[userId]       â€” all runs for user
GET  /api/buffer/[userId]     â€” buffer balance + history
POST /api/buffer              â€” log deposit/withdrawal
GET  /api/tax/[userId]        â€” tax summary for current year
POST /api/tax/[userId]        â€” update set_aside
POST /api/gig/patterns        â€” Claude analysis (send last 8 weeks of runs)
GET  /api/ssi/[userId]        â€” SSI asset summary
POST /api/ssi/[userId]        â€” update countable assets / ABLE balance
GET  /api/w2/[userId]         â€” W-2 settings + next payday
POST /api/w2/[userId]         â€” update W-2 settings

## Current build focus
Start with Session 1 â€” Gig Spoke for Mom and Dad.
Build in this order: DB init + seed â†’ /gig/[userId] dashboard â†’ /log â†’ /import â†’ /tax â†’ /patterns
