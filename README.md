# Cash Flow CFO

At first, it was an Expense Tracker.  
Then it became a Cash Flow Tracker.  
Now it is **Cash Flow CFO** — a local-first personal finance app for tracking cash flow, savings, goals, and tasks.

## What it does

- **Income** — cash and accrued revenue, with multi-currency display (NTD, USD, CAD)
- **Expenses** — one-time and fixed/recurring, categorized, with review flags
- **Savings** — balance snapshots and savings goals, synced with financial targets
- **Goals & tasks** — pre-tasks, post-tasks, and dreams with drag-and-drop; linked shadow expenses stay in sync
- **Charts** — Sankey cash-flow diagram, combined overview charts, monthly summaries
- **Time Navigator** — filter all data by year → quarter → month → week
- **Import / export** — JSON backup in the UI; legacy CSV import supported

All data stays in your browser (`localStorage`). No backend required for day-to-day use.

## Quick start

```bash
git clone git@github.com:wendychen/cash-flow-cfo.git
cd cash-flow-cfo
npm install
npm run dev
```

Open `http://localhost:5173`.

### Other commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | CI-style test run (26 tests) |
| `npm run lint` | ESLint |
| `npm run csv-to-json -- file.csv` | Convert legacy CSV export to importable JSON |
| `npm run legacy-to-json -- legacy.json` | Convert browser localStorage dump to v2 JSON |

### Docker

```bash
docker compose up -d --build
# App at http://localhost:8080
```

## Architecture (current)

The app was refactored in June 2026 from a monolithic `ExpenseTracker.tsx` (~1,710 LOC) to a layered layout:

```
src/
├── features/          # UI by domain (dashboard, expenses, goals, income, savings, charts)
├── stores/finance/    # Zustand store + v1→v2 migration
├── lib/               # CSV import, JSON export, domain sync helpers
├── components/ui/     # shadcn/ui primitives
└── types/             # TypeScript models
```

- **State:** [Zustand](https://zustand.docs.pmnd.rs/) with `persist` → single key `cash-flow-cfo-storage` (schema v2)
- **Entry:** `src/pages/Index.tsx` → `features/dashboard/Dashboard.tsx`
- **Legacy:** `src/components/ExpenseTracker.tsx` retained but no longer the production entry point

Design notes: [`docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md`](docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md)

## Migrating data from the old app

### Option A — CSV (recommended if you used Export CSV)

1. In the **old** app, export CSV (`cashflow-YYYY-MM-DD.csv`).
2. In the **new** Dashboard, click **Import JSON/CSV** and select the `.csv` file.

Or convert offline:

```bash
npm run csv-to-json -- ~/Downloads/cashflow-2026-06-16.csv
```

### Option B — Legacy localStorage (browser console)

In the old app, DevTools → Console:

```javascript
copy(JSON.stringify({
  expenses: JSON.parse(localStorage.getItem('expenses')||'[]'),
  incomes: JSON.parse(localStorage.getItem('incomes')||'[]'),
  savings: JSON.parse(localStorage.getItem('savings')||'[]'),
  fixedExpenses: JSON.parse(localStorage.getItem('fixedExpenses')||'[]'),
  targets: JSON.parse(localStorage.getItem('financialTargets')||'[]'),
  goals: JSON.parse(localStorage.getItem('goals')||'[]'),
  tasks: JSON.parse(localStorage.getItem('tasks')||'[]'),
}, null, 2))
```

Save as `legacy-data.json`, then:

```bash
npm run legacy-to-json -- legacy-data.json
```

Import the resulting `*-v2-import.json` via **Import JSON/CSV**.

### Auto-import

If you open the new app in the same browser **before** `cash-flow-cfo-storage` exists, per-domain legacy keys (`expenses`, `goals`, etc.) are imported automatically. Use **Re-import old data** on the Dashboard if needed.

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **Zustand** — client state and persistence
- **Recharts** — charts; custom SVG Sankey
- **dnd-kit** — goal/task drag-and-drop
- **Vitest** + **Testing Library** — unit tests
- **date-fns**, **react-hook-form**, **Zod**

## Project history

| When | Where | Notes |
|------|-------|-------|
| Early | [Lovable](https://lovable.dev) | Original scaffold |
| — | Replit Core | Continued development |
| — | Bolt | Iteration |
| 2026-01-31 | Local | Income split: accrued vs cash; lesson: use branches for manual edits |
| 2026-02 | Local | Goals tab first; collapsible fixed expenses; category fixes |
| 2026-06-16 | Cursor / local | Zustand refactor, Dashboard cutover, tests, CSV import, merged to `main` |

## Devlog

Development notes live in [`docs/devlog/`](docs/devlog/):

- [`2026-01-31.md`](docs/devlog/2026-01-31.md) — income types, branching lesson
- [`2026-06-16.md`](docs/devlog/2026-06-16.md) — Zustand refactor merge

## Related docs

- [`replit.md`](replit.md) — earlier architecture overview (pre-Zustand; some details superseded)
- [`docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md`](docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md) — refactor design doc

## License

Private project. All rights reserved.