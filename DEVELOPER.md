# Family Budget OS — Developer Reference

> Senior-level technical reference. Keep this file updated whenever new routes, pages, schema changes, or AI integrations are added.

---

## Overview

Comprehensive, mobile-first household finance application for multi-income families. Each family member has a dedicated income-type spoke (gig/SSI/W-2) feeding into a shared family hub. Features Claude AI for PDF parsing, earnings pattern analysis, debt payoff simulation, and weekly digest generation.

**Local**: `C:/Projects/family-budget-os`
**Status**: Multi-phase build complete. Not yet deployed to production.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.1.7, React 19.2.3, TypeScript 5, Tailwind CSS 4 |
| Backend | Next.js API Routes (Node.js 20+) |
| Database | SQLite via better-sqlite3 12.8.0 |
| AI | Anthropic Claude Sonnet 4.6 (`@anthropic-ai/sdk 0.79.0`) |
| Theming | next-themes 0.4.6 (dark/light mode) |
| CSV | papaparse 5.5.3 |

**DB location**: `/data/budget.db` (WAL mode, auto-created on first run)
**Auth**: None (prototype — user_id in URL params)
**API key exposure**: Zero — all Claude calls are in API routes, never client-side

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | PDF parsing, patterns, digest, debt insight — server-side only |

---

## Database Schema (`/data/budget.db`)

### households
Multi-tenant support. Default: household id=1.
```
id, name, created_at
```

### users
```
id, household_id, name, role,
income_type: gig | ssi | w2 | tbd,
weekly_salary_target, created_at
```
**Seeded**: 1=Mom (gig), 2=Dad (gig), 3=Braddon (ssi), 4=Bro1 (w2), 5=Bro2 (tbd)

### runs (Gig earnings log)
```
id, household_id, user_id, date, hours,
earnings_gross, tips, miles, platform, uber_fee, net,
note,  ← used as idempotency key for PDF import dedup
created_at
```
Index: `idx_runs_user_date`

### buffer (Cash reserves)
```
id, household_id, user_id, date,
amount, type: deposit | withdrawal,
note, created_at
```
Indexes: `idx_buffer_user`, `idx_buffer_user_type_date`

### shared_bills
```
id, household_id, name, amount, due_date,
paid_by_user_id, month, paid: 0|1
```

### tax_tracker
```
id, household_id, user_id, year, set_aside, updated_at
```

### ssi_assets
```
id, household_id, user_id,
countable_assets,  ← tracked against $2,000 limit
able_account,      ← separate, up to $100k
updated_at
```

### w2_settings
```
id, household_id, user_id, net_take_home,
pay_frequency: weekly | biweekly | semimonthly | monthly,
next_payday, updated_at
```

### savings_goals
```
id, household_id, user_id, name, target_amount, current_amount,
monthly_contribution, is_family_goal: 0|1,
deadline, status, is_able: 0|1,  ← ABLE-safe for SSI users
created_at, completed_at
```
Index: `idx_goals_user`

### goal_contributions
```
id, household_id, goal_id, user_id, amount, date, note, created_at
```

### debts
```
id, household_id, user_id, name, balance, original_balance,
minimum_payment, interest_rate,
debt_type: credit_card | loan | medical | student | other,
is_shared: 0|1, created_at, paid_off_at
```
Index: `idx_debts_user`

### debt_payments
```
id, household_id, debt_id, user_id, amount,
date, payment_type, note, created_at
```
Index: `idx_debt_payments_debt`

### notifications
```
id, household_id, user_id, type, title, body,
action_url, read: 0|1, created_at
```
Index: `idx_notifications_user_read`
24-hour dedup per notification type per user.

### digests (Weekly AI summaries)
```
id, household_id, user_id, content (JSON),
generated_at, dismissed: 0|1
```
Index: `idx_digests_user`
Cached 6 days — only regenerated when stale or `?refresh=1` is passed.

---

## Pages & Routes

### Landing
| Route | Purpose |
|---|---|
| `GET /` | Home: member cards + inline rename UI |
| `GET /help` | Glossary + help page |

### Gig Spoke (Mom=1, Dad=2)
| Route | Purpose |
|---|---|
| `GET /gig/household` | Dashboard: 72px runway KPI, weekly target, 7-day avg, recent runs |
| `GET /gig/[userId]/log` | Log run: date, hours, gross, tips, miles, platform, uber_fee, net preview |
| `GET /gig/[userId]/import` | PDF import: Claude parses Uber statement, preview + confirm |
| `GET /gig/[userId]/tax` | Tax tracker: YTD gross, mileage deduction, SE tax, quarterly due dates |
| `GET /gig/[userId]/patterns` | Claude AI patterns: best days, best windows, weekly floor, trend |
| `GET /gig/[userId]/buffer` | Buffer: balance, daily burn, runway days, history |

### SSI Spoke (Braddon=3)
| Route | Purpose |
|---|---|
| `GET /ssi/[userId]` | Dashboard: asset guard, ABLE account, next payment, goals links |
| `GET /ssi/[userId]/assets` | Asset tracker with color-coded status |

### W-2 Spoke (Bro1=4)
| Route | Purpose |
|---|---|
| `GET /w2/[userId]` | Dashboard: 72px next payday countdown, pay cycle progress bar |

### Family Hub
| Route | Purpose |
|---|---|
| `GET /hub` | Household overview: runway, per-member status cards, shared bills |

### Debt Freedom (all users)
| Route | Purpose |
|---|---|
| `GET /debt/[userId]` | Debt dashboard: snowball/avalanche toggle, freedom date, extra payment slider |
| `GET /debt/[userId]/add` | Add debt form |
| `GET /debt/[userId]/[debtId]` | Debt detail: balance, payment history |

### Savings & Digest
| Route | Purpose |
|---|---|
| `GET /digest/[userId]` | AI weekly summary (6-day cache, force refresh via `?refresh=1`) |

---

## API Endpoints

### Users
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users` | All users |
| GET | `/api/users/[userId]` | Single user |
| PATCH | `/api/users/[userId]` | Rename user |

### Runs (Gig)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/runs` | Insert single run |
| GET | `/api/runs/[userId]` | All runs (limit 200) |
| POST | `/api/runs/import` | Claude PDF parse + bulk insert with note-based dedup |

### Buffer
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/buffer` | Deposit/withdrawal (overdraft guard) |
| GET | `/api/buffer/[userId]` | Balance + avgDailyBurn + runway + history |

### Tax
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tax/[userId]` | YTD summary + next quarterly due date |
| POST | `/api/tax/[userId]` | Update set-aside amount |
| GET | `/api/tax/parents` | Consolidated for users 1+2 |

### AI Analysis
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/gig/patterns` | Claude earnings patterns (requires ≥20 runs) |
| POST | `/api/debt/insight` | Claude debt strategy recommendation |

### SSI
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ssi/[userId]` | Assets, ABLE, status |
| POST | `/api/ssi/[userId]` | Update assets |

### W-2
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/w2/[userId]` | Settings + next payday countdown |
| POST | `/api/w2/[userId]` | Update net, frequency, next_payday |

### Hub & Bills
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/hub` | Household stats (runway, members, bills) |
| POST | `/api/bills` | Create shared bill |
| PATCH | `/api/bills/[id]` | Mark paid/unpaid |
| DELETE | `/api/bills/[id]` | Remove bill |

### Debt
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/debt/[userId]?extra=X&strategy=snowball\|avalanche` | Debts + payoff simulation |
| POST | `/api/debt/[userId]` | Create debt |
| GET | `/api/debt/[userId]/[debtId]` | Detail + payment history |
| PATCH | `/api/debt/[userId]/[debtId]` | Update balance + auto-log payment |
| DELETE | `/api/debt/[userId]/[debtId]` | Remove debt |
| POST | `/api/debt/[userId]/[debtId]/payments` | Manual payment |

### Goals
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/goals?user_id=X` | Goals for user + family goals |
| POST | `/api/goals` | Create goal |
| POST | `/api/goals/[goalId]` | Contribute to goal |
| DELETE | `/api/goals/[goalId]` | Remove goal |

### Digest & Notifications
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/digest/[userId]?refresh=1` | AI weekly summary (6-day cache) |
| PATCH | `/api/digest/[userId]` | Dismiss digest |
| GET | `/api/notifications/[userId]` | Unread alerts (auto-generates new ones on fetch) |
| PATCH | `/api/notifications/[userId]` | Mark read |

---

## Key Business Logic

### Runway Calculation
```
runway_days = buffer_balance ÷ avg_daily_burn
avg_daily_burn = total withdrawals in last 30 days ÷ 30
```

### Tax Calculations
- SE Tax = `net_taxable × 0.15` (simplified, not filing-accurate)
- Mileage deduction = `miles × $0.67` (2025 IRS rate)
- Quarterly deadlines: Apr 15, Jun 15, Sep 15, Jan 15

### SSI Asset Status (`lib/notifications.ts`)
| Status | Range | UI Behavior |
|---|---|---|
| green | < $1,500 | Normal |
| amber | $1,500–$1,800 | Warning banner |
| red | $1,800–$2,000 | Urgent warning |
| crisis | ≥ $2,000 | Non-dismissable alert |

ABLE account tracked separately (up to $100k, does NOT count toward $2k limit).

### Debt Payoff Simulation (`lib/debtCalc.ts`)
- Monthly interest accrual on each debt
- Minimum payments applied to all debts
- Freed minimums cascade to next target debt
- Extra payment directed to: snowball (lowest balance first) or avalanche (highest rate first)
- Returns: months to freedom, freedom date, total interest paid, interest saved vs minimums only

### Notifications (auto-generated on fetch)
- Runway < 3 days → `runway_critical`
- Runway 3–7 days → `runway_low`
- Tax set-aside gap > 20% → `tax_gap`
- SSI assets at amber/red/crisis levels → `ssi_warning`
- **24h dedup**: one notification per type per user per day

### AI Digest Output Format
```json
{
  "headline": "string",
  "keyMetric": "string",
  "insight": "string",
  "actionItem": "string"
}
```
Custom prompt per income_type. Tone: calm, honest, forward-looking. Cached 6 days.

### PDF Import (Claude Vision)
- Base64-encode PDF → Anthropic API with `document` content block
- Extracts per-run: date, hours, gross, tips, miles, platform, fee, net
- Dedup via `note` field — re-running same import is safe
- Preview before commit to DB

---

## Key Files

```
lib/db/index.ts              Schema, seeding, idempotent migrations
lib/debtCalc.ts              Snowball/avalanche simulation
lib/notifications.ts         Auto-notification generation logic
app/layout.tsx               Root layout + ThemeProvider
app/page.tsx                 Home/member selector
app/components/
  NotificationBanner.tsx     Alert display
  GoalsSection.tsx           Goal form + list
  ThemeProvider.tsx          Dark/light mode wrapper
  HelpTip.tsx                Inline tooltip helper
```

---

## UI/UX Patterns

- Mobile-first: 390px minimum width
- 72px font for primary KPIs (runway days, next payday countdown)
- 16px minimum on all form inputs (prevents iOS auto-zoom)
- Optimistic state updates on bill paid/unpaid toggle
- 400ms debounce on debt extra payment slider (prevents API thrashing)
- Color-coded status system: green → amber → red → crisis
- All Claude calls server-side — zero API key exposure to client

---

## Built vs Planned

### Built
- [x] Gig dashboard, run logger, Uber PDF import, tax tracker, Claude patterns
- [x] Family hub with household runway
- [x] SSI asset limit guard (4-level status system)
- [x] W-2 payday tracker (countdown + pay cycle progress)
- [x] Debt Freedom: snowball/avalanche simulation + Claude insight
- [x] Savings goals (individual + family, ABLE flag)
- [x] Weekly AI digest (cached 6 days)
- [x] Auto-generated notifications
- [x] Multi-household infrastructure

### Not Yet Built
- [ ] Authentication
- [ ] User roles/permissions
- [ ] Bill splitting algorithm
- [ ] CSV/export download
- [ ] Cron for weekly digest generation
- [ ] Email/push notifications
- [ ] Dark mode testing pass

---

## Local Development

```bash
cd C:/Projects/family-budget-os
npm install
# Create .env.local with ANTHROPIC_API_KEY
npm run dev
# → http://localhost:3000
```
