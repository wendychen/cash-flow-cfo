# Cash Flow CFO

A local-first personal finance app for tracking cash flow, savings, goals, and tasks.  
Started as an expense tracker, evolved into a full **Cash Flow CFO** dashboard.

All data stays in your browser (`localStorage`). No backend required for day-to-day use.

## Features

### Cash flow
- **Income** — cash vs accrued revenue, collection tracking (accrued → cash), multi-currency (NTD, USD, CAD)
- **Expenses** — one-time and fixed/recurring, categorized, review flags, duplicate entry
- **Savings** — balance snapshots and goal-linked savings
- **Fixed expenses** — frequency tooltips (bi-weekly, bi-monthly, etc.) with monthly equivalents

### Goals & planning
- **Goals & tasks** — pre/post tasks and dreams with drag-and-drop; shadow expenses stay in sync
- **Milestones** — horizontal timeline with next-milestone highlight
- **Repeating goals** — auto-spawn next cycle on complete; optional task duplication
- **Goal timer** — countdown to deadline or next milestone
- **Goal export/import** — portable JSON bundles; print goals report

### Dashboard & charts
- **Time Navigator** — filter by year → quarter → month → week (goals always visible)
- **Monthly Summary** — all months with predictions toggle (cash / accrued / outstanding split)
- **Sankey diagram** — drill-down: income (direct cash, collections, accrued), expenses (fixed vs one-time categories side by side)
- **Cash Flow Simulator** — what-if income/expense changes with projection chart and ROI metrics
- **Combined overview charts** — collapsible income/expense/savings trends

### Data & backup
- **Export** — JSON (portable backup) and CSV (spreadsheet)
- **Import** — JSON or legacy CSV
- **Auto-backup** — last 5 snapshots in browser storage; restore or print backup report
- **User guide** — in-app onboarding (English, 繁體中文, 日本語)

### Other
- **PWA** — installable, offline-friendly service worker
- **i18n** — English, Traditional Chinese, Japanese (partial UI coverage)

## Quick start

```bash
git clone git@github.com:wendychen/cash-flow-cfo.git
cd cash-flow-cfo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | CI-style test run (133 tests) |
| `npm run lint` | ESLint |
| `npm run csv-to-json -- file.csv` | Convert legacy CSV to importable JSON |
| `npm run legacy-to-json -- legacy.json` | Convert browser localStorage dump to v2 JSON |

### Docker

```bash
docker compose up -d --build
# App at http://localhost:8080
```

## Architecture

```
src/
├── features/          # UI by domain (dashboard, expenses, goals, income, savings, charts)
├── stores/finance/    # Zustand store + v1→v2 migration
├── lib/               # CSV/JSON export, domain helpers, simulations
├── components/
│   ├── ui/            # shadcn/ui primitives
│   └── shared/        # TimeNavigator, UserGuide, etc.
├── i18n/              # Locale strings (en, zh-TW, ja)
└── types/             # TypeScript models
```

- **State:** [Zustand](https://zustand.docs.pmnd.rs/) with `persist` → `cash-flow-cfo-storage` (schema v2)
- **Entry:** `src/pages/Index.tsx` → `src/features/dashboard/Dashboard.tsx`
Design notes: [`docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md`](docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md)

## Migrating from the old app

### CSV export (recommended)

1. Export CSV from the old app (`cashflow-YYYY-MM-DD.csv`).
2. In Dashboard → **Import JSON/CSV**, select the file.

Or offline:

```bash
npm run csv-to-json -- ~/Downloads/cashflow-2026-06-16.csv
```

### Legacy localStorage

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

Opening the new app in the same browser before `cash-flow-cfo-storage` exists triggers automatic import from per-domain legacy keys. Use **Re-import old data** on the Dashboard if needed.

## Tech stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **Zustand** — state and persistence
- **Recharts** + custom SVG Sankey
- **dnd-kit** — goal/task reorder
- **Vitest** + **Testing Library**
- **date-fns**, **react-hook-form**, **Zod**

## Project history

| When | Notes |
|------|-------|
| Early | [Lovable](https://lovable.dev) scaffold |
| 2026-01 | Income split (accrued vs cash); goals tab |
| 2026-06 | Zustand refactor, Dashboard cutover, tests, CSV import |
| 2026-06 | Monthly summary, collections, Sankey drill-down, simulator, i18n, PWA |

## Docs

- [`docs/devlog/`](docs/devlog/) — development notes
- [`docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md`](docs/refactoring/CLEAN_CODE_REFACTOR_DESIGN.md) — refactor design
- [`docs/archive/`](docs/archive/) — superseded documentation

## License

Private project. All rights reserved.