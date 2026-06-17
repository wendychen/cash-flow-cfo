# Archived code (reference only)

Legacy ExpenseTracker and pre-v2 components kept for historical reference. **Not imported by the app** — active code lives under `src/features/`.

## Layout

| Path | Description |
|------|-------------|
| `ExpenseTracker.old.tsx` / `ExpenseTracker.retired.tsx` | Monolithic pre-Zustand app shells |
| `SankeyFlowChart.archived.tsx` | Earlier Sankey chart |
| `components/` | Duplicate feature components superseded by `src/features/` |

## Active replacements

- Dashboard: `src/features/dashboard/Dashboard.tsx`
- Charts: `src/features/charts/`
- Shared UI: `src/features/shared/`
- Store: `src/stores/finance/`

Excluded from `tsconfig.app.json` so stale types do not affect builds.