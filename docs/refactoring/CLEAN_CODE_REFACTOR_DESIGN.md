# Cash Flow CFO — Clean Code Refactoring Design

**Date**: 2026-05-21  
**Status**: Draft for Review  
**Goal**: Transform the current 1,710-line monolithic component into a maintainable, well-structured codebase while preserving all existing functionality and localStorage data compatibility.

---

## 1. Executive Summary

The application has grown through multiple AI-assisted development cycles. The core problem is a single **1,710-line `ExpenseTracker.tsx`** God component that owns state, persistence, business rules, filtering, and UI orchestration for 8+ financial domains.

This design proposes an incremental, low-risk refactoring to a layered architecture using **custom domain hooks** + **pure business logic** + **thin presentation layer**.

Primary outcomes:
- `ExpenseTracker` (or renamed `Dashboard`) reduced to < 300 lines of composition.
- Each financial domain (Expenses, Goals, Tasks, etc.) becomes independently understandable and testable.
- Cross-cutting concerns (period filtering, currency, import/export) are centralized.
- Safe migration path that never breaks users' existing localStorage data.

---

## 2. Current State Analysis

### 2.1 Quantitative Problems

| Metric                        | Value          | Impact                              |
|-------------------------------|----------------|-------------------------------------|
| `ExpenseTracker.tsx` LOC      | 1,710          | Extremely hard to reason about      |
| State/effect declarations     | ~22            | Massive cognitive load              |
| localStorage `useEffect`s     | 7–8            | Repetitive, error-prone             |
| Cross-domain mutation sites   | Many           | Hard to trace side effects          |
| Files with real logic         | 1 (the big one)| Most other files are thin UI        |

### 2.2 Qualitative Problems

**Core Issues**

1. **God Component Anti-pattern**
   - One component responsible for 8 different business domains + UI layout + persistence + derived state.

2. **Scattered & Duplicated Persistence**
   - Every domain has its own `useState` + `useEffect` pair doing almost identical `localStorage.setItem` work.

3. **Implicit Bidirectional Coupling**
   - `updateExpense` can mutate Goals and Tasks.
   - Auto-creation of "shadow" expenses for goals (useEffect with `[]` deps).
   - Goal ↔ Task relationship is maintained through complex reconstruction logic on every save.

4. **Two Inconsistent Task Models**
   - `TaskNode[]` (flat, with `goalId` + `taskType` + `sortOrder`) — used at runtime for drag-and-drop.
   - Embedded `preTasks / postTasks / postDreams` inside `Goal` — used for storage.
   - The big `useEffect` that rebuilds goals from tasks on every change is the most fragile piece of code.

5. **Business Logic Mixed with UI**
   - Period filtering, aggregations (`totalExpenses`, `latestSavingsBalance`), progress calculations, etc. all live inside the component or are recomputed in many places.

6. **No Clear Module Boundaries**
   - `GoalBudgetAllocator` needs goals + tasks + savings.
   - Charts need filtered + raw data.
   - Import/export touches almost everything.

### 2.3 What Is Already Good

- Many small, focused presentational components (`ExpenseForm`, `GoalList`, `SankeyFlowChart`, `TaskTreeNode`, etc.).
- `useTaskTree.ts` — excellent pure utility for hierarchical task drag-and-drop.
- `use-currency.tsx` — good example of a Context + hook for cross-cutting concern.
- TypeScript types exist in `src/types/`.
- React Query is already wired in `App.tsx` (currently under-used).

---

## 3. Goals of the Refactor

1. **Understandability** — A new developer (or future AI) can understand any single financial domain in < 5 minutes.
2. **Maintainability** — Adding a new feature (e.g., "Recurring Incomes") touches only a few files in predictable locations.
3. **Testability** — Business rules and calculations can be unit tested in isolation.
4. **Safety** — Zero data loss for existing users. Every change is incremental and reversible.
5. **Performance** (secondary) — Reduce unnecessary re-renders through better hook boundaries.
6. **Delight** — The codebase should feel pleasant to work in again.

Non-goals:
- Switching to a backend/Supabase (out of scope unless explicitly requested later).
- Complete UI redesign.
- Introducing heavy state management libraries unless they provide clear value.

---

## 4. Proposed Target Architecture

### 4.1 Layered Model

```
Presentation (thin)
    ↓
Domain Hooks (state + persistence + operations)
    ↓
Pure Business Logic (lib/finance.ts + domain utilities)
    ↓
Types (immutable contracts)
```

### 4.2 Recommended Module Structure

```
src/
├── types/
│   ├── expense.ts
│   ├── goal.ts
│   ├── task.ts
│   ├── ... (keep, minor cleanups)
│
├── hooks/                          ← New primary home of logic
│   ├── useExpenses.ts
│   ├── useIncomes.ts
│   ├── useSavings.ts
│   ├── useFixedExpenses.ts
│   ├── useFinancialTargets.ts
│   ├── useGoals.ts
│   ├── useTasks.ts                 (or useGoalSystem.ts)
│   ├── usePeriodFilter.ts          (reusable filtering)
│   ├── useCurrency.tsx             (already exists)
│   └── useTaskTree.ts              (already exists — promote)
│
├── lib/
│   ├── utils.ts                    (existing cn helper)
│   └── finance.ts                  (NEW — all pure calculations)
│
├── components/
│   ├── dashboard/                  (NEW — section containers)
│   │   ├── ExpensesSection.tsx
│   │   ├── GoalsSection.tsx
│   │   ├── CashFlowSection.tsx
│   │   └── ...
│   ├── expenses/
│   ├── goals/
│   ├── charts/
│   └── ui/                         (keep shadcn)
│
├── pages/
│   └── Index.tsx                   (or Dashboard.tsx)
│
└── App.tsx
```

### 4.3 Data Model Recommendations

**Option A (Recommended — Incremental)**: Keep current storage shape exactly. The hooks become the only place that knows about the dual Goal/Task representation. All the ugly syncing logic moves into `useGoals` + `useTasks` and is hidden behind a clean API.

**Option B (Longer term)**: Introduce a normalized shape:
- Always store `Goal[]` (without embedded tasks)
- Always store `TaskNode[]`
- Remove the reconstruction `useEffect`
- Add migration logic on first load for old data.

**Recommendation**: Start with **Option A**. Only do Option B if the current dual-model pain becomes obvious during extraction.

---

## 5. Detailed Responsibilities

### Domain Hooks (Example API)

```ts
// useExpenses.ts
export function useExpenses() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  
  const add = (expense: Omit<Expense, "id">) => ...
  const update = (id: string, updates: Partial<Expense>) => ...
  const remove = (id: string) => ...
  
  return { expenses, add, update, remove, /* filtered versions if useful */ };
}
```

Similar pattern for others. Cross-domain concerns (e.g., "when a goal is created, create a shadow expense") become explicit coordination inside a higher-level hook or a small orchestrator in the page.

### Pure Functions (`lib/finance.ts`)

```ts
export function filterByPeriod<T extends { date: string }>(items: T[], period: TimePeriod | null): T[];
export function calculateNetCashFlow(...): number;
export function computeGoalTaskCostTotal(goalId: string, tasks: TaskNode[]): number;
export function getLatestSavingsBalance(savings: Saving[], period?: TimePeriod): number;
// etc.
```

### Period Filtering

Create `usePeriodFilter` (or just a pure `filterByPeriod` + a small hook that holds `selectedPeriod` state). This replaces the duplicated `.filter(isDateInPeriod)` calls.

---

## 6. Phased Implementation Plan (Safe & Incremental)

### Phase 0 — Preparation (Low risk)
- Create folder structure (`hooks/`, `lib/finance.ts`, `components/dashboard/`)
- Add `useLocalStorage` helper (or use `useState` + `useEffect` inside each hook consistently)
- Write a small set of golden localStorage test fixtures

### Phase 1 — Extract Independent Domains (Highest ROI)
1. `useExpenses.ts`
2. `useIncomes.ts`
3. `useSavings.ts`
4. `useFixedExpenses.ts`
5. `useFinancialTargets.ts`

Each extraction is done by moving code into the hook, then replacing the usage in `ExpenseTracker`. Old code can stay temporarily behind a feature flag or just be deleted after verification.

### Phase 2 — Goals & Tasks (The Hard Part)
- Extract `useTasks.ts` (wraps the excellent existing `useTaskTree`)
- Extract `useGoals.ts`
- Move all the reconstruction + bidirectional update logic here
- GoalBudgetAllocator becomes a consumer of these two hooks

### Phase 3 — Cross-Cutting Concerns
- `usePeriodFilter.ts`
- Centralize currency usage where possible
- Extract import/export into their own module (`lib/importExport.ts`)

### Phase 4 — Composition Layer
- Create thin `<ExpensesSection>`, `<GoalsSection>`, etc.
- Shrink `ExpenseTracker.tsx` / rename to `Dashboard.tsx`
- Move layout, tabs, global search, TimeNavigator into the new thin component

### Phase 5 — Polish & Testing
- Add unit tests for `lib/finance.ts`
- Add simple integration tests for the hooks (using React Testing Library or just manual verification)
- Remove dead code and old comments
- Update README with new structure

---

## 7. Risks & Mitigations

| Risk                              | Likelihood | Mitigation |
|-----------------------------------|------------|------------|
| Breaking existing user data       | Medium     | Never change storage keys or shapes in early phases. Add migration functions only when needed, behind version checks. |
| Regression in complex goal↔task sync | High     | Extract that logic last. Keep the original code as reference during extraction. |
| Over-engineering (too many hooks) | Medium     | Stop at "good enough". Custom hooks are lightweight here. Only introduce Zustand if we feel real pain after Phase 2. |
| Performance regression            | Low        | Hooks naturally give better memoization boundaries. |
| Developer (or AI) confusion during transition | Medium | Work on one domain at a time. Keep the big file compiling/running after every small PR. |

---

## 8. Verification Strategy

1. **Manual** — After each phase, run the dev server and perform a full user flow (create goal → add tasks → allocate budget → record expenses → change time period → export).
2. **Data Compatibility** — Keep a "before" and "after" localStorage dump and write a small script that proves round-tripping.
3. **Code Metrics** — Target: `ExpenseTracker.tsx` < 300 LOC, no domain hook > 250 LOC.
4. **Future-proof** — The structure should make adding "Recurring Transactions" or "Reports" feel natural.

---

## 9. Final Decisions (Confirmed 2026-05-21)

1. **Goals/Tasks data model** → **B (Normalize)**  
   We will move to a clean normalized model: separate `Goal[]` + `TaskNode[]` in storage. A one-time migration will run on first load for existing users.

2. **State management** → **Zustand + persist middleware** (the "latter" option)  
   We will introduce Zustand early. This replaces the scattered `useState` + `useEffect` localStorage pattern with a single source of truth + automatic persistence. Much cleaner for cross-domain relationships.

3. **Root component name** → **Rename** to `Dashboard` (or `CashFlowDashboard` if preferred). The old `ExpenseTracker` name will be retired.

4. **UI component organization** → **Reorganize**  
   We will reorganize `components/ui/` (and related folders) for better discoverability. Non-shadcn pieces will be grouped by domain where it makes sense.

5. **Testing** → **Yes**  
   We will add **Vitest + @testing-library/react** as part of this effort. At minimum, we will have tests for the store(s), migration logic, and key pure functions in `lib/finance.ts`.

---

## 10. Updated Architecture (Reflecting Final Decisions)

### State Management: Zustand

Instead of many individual custom hooks, we will have:

- `src/stores/financeStore.ts` (or split by domain if it grows too large)
  - Uses `create` + `persist` middleware
  - Exposes selectors and actions
  - Handles the normalized `goals` + `tasks` shape

- `src/stores/uiStore.ts` (optional) — for transient UI state (selectedPeriod, open/closed panels, etc.)

This dramatically reduces the repetitive persistence code.

### Data Model (Normalized)

Final storage shape (after migration):

```ts
{
  version: 2,
  expenses: Expense[],
  incomes: Income[],
  savings: Saving[],
  fixedExpenses: FixedExpense[],
  targets: FinancialTarget[],
  goals: Goal[],           // no embedded tasks
  tasks: TaskNode[]        // single source of truth, flat + sortable
}
```

The old dual-model reconstruction logic will be deleted after the migration.

---

## 11. Updated Phased Plan (Adjusted for Decisions)

### Phase 0 — Foundation
- Install dependencies: `zustand`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
- Set up `vitest.config.ts`
- Create `src/stores/` and `src/lib/finance.ts`
- Write the **migration utility** + versioned storage shape
- Create a small set of test fixtures from real data

### Phase 1 — Zustand Store + Migration
- Build the main `useFinanceStore`
- Implement normalized state shape + actions
- Implement one-time migration from v1 → v2
- Replace all direct localStorage usage in the big component with the store
- Verify that existing user data still loads correctly

### Phase 2 — Normalize Goals & Tasks + Delete Old Sync Logic
- Migrate any remaining embedded task data during the store initialization
- Remove the giant reconstruction `useEffect`
- Update `GoalBudgetAllocator`, `TaskTreeSection`, etc. to use the flat `tasks` array via selectors

### Phase 3 — Extract Domain Logic & Pure Functions
- Move all calculations, filtering, and aggregations into `lib/finance.ts` + selectors
- Create `usePeriodFilter` logic (can live in the store or as a small hook)

### Phase 4 — UI Layer & Renaming
- Rename `ExpenseTracker.tsx` → `Dashboard.tsx`
- Create thin domain sections (`ExpensesSection`, `GoalsSection`, ...)
- Reorganize `components/` folder structure
- Clean up the massive original file (delete after everything is moved)

### Phase 5 — Testing & Polish
- Write unit tests for the store and `lib/finance.ts`
- Add a couple of component/integration tests
- Remove all dead code
- Update documentation

---

## 12. Recommended Next Steps

1. Review the updated decisions and architecture above.
2. Confirm you are happy with **Zustand + Normalized model + Rename + Reorganize + Tests**.
3. Approve the start of **Phase 0** (install + project setup + migration design).
4. We will then implement in small, verifiable steps.

This is now a more ambitious but ultimately much cleaner and more professional refactor. It will feel significantly better to work in once complete.

---

**Prepared for review and discussion.**

Once approved, we can start producing clean, well-tested code with confidence.

---

*End of Design Document*