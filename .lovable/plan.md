

# Enhanced Monthly Summary with Predictions

## Overview
Upgrade the Monthly Summary to show **all months** (past and future), with the current month on top, followed by past months in descending order. Add a toggle to show **future month predictions** based on historical averages.

## New Layout Design

```text
┌────────────────────────────────────────────────────────────────────┐
│  📊 Monthly Summary                   [Show Predictions ◯───]  [▼] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─── 🔮 March 2026 (Prediction) ──────────────────────────────┐  │
│  │  Income         Expenses        Fixed          Savings       │  │
│  │  +NT$85,000     -NT$32,000      -NT$5,824      ~NT$145,000   │  │
│  │  (projected)    (projected)     (current)      (projected)   │  │
│  │────────────────────────────────────────────────────────────  │  │
│  │  Net: ~+NT$47,176                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─── 🔮 February 2026 (Prediction) ───────────────────────────┐  │
│  │  ...                                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─── ★ January 2026 (Current Month) ──────────────────────────┐  │
│  │  Income         Expenses        Fixed          Savings       │  │
│  │  +NT$85,000     -NT$32,450      -NT$5,824      NT$120,000    │  │
│  │────────────────────────────────────────────────────────────  │  │
│  │  Net: +NT$46,726                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─── December 2025 ───────────────────────────────────────────┐  │
│  │  ...                                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ... (more months, scrollable)                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Complete month coverage**: Show all months from your earliest data to the current month
2. **Current month highlighted**: Star icon and "(Current Month)" label
3. **Future predictions toggle**: Switch to show/hide predicted future months (up to 3 months ahead)
4. **Prediction indicators**: Crystal ball icon and dashed styling for predicted months
5. **Smart ordering**: Future months at top (if enabled), then current month, then past months descending

## Prediction Logic

### Income Prediction
- Calculate average monthly income from all past complete months
- Formula: `Total past income / Number of months with income data`

### Expense Prediction  
- Calculate average monthly one-time expenses from past complete months
- Formula: `Total past expenses / Number of months with expense data`

### Fixed Expenses
- Use current active fixed expenses (same as now - these are known recurring costs)

### Savings Prediction
- Calculate average monthly savings growth from historical data
- Project forward: `Last savings balance + (avgMonthlySavingsGrowth * monthsAhead)`

### Net Flow Prediction
- `Predicted Income - Predicted Expenses - Fixed Expenses`

## Technical Implementation

### Updated MonthData Interface
```typescript
interface MonthData {
  month: string;          // YYYY-MM format
  displayMonth: string;   // "January 2026" format
  totalIncome: number;
  totalExpenses: number;
  fixedExpensesMonthly: number;
  savingsBalance: number | null;
  netFlow: number;
  isPrediction: boolean;  // NEW: true for future months
  isCurrentMonth: boolean; // NEW: highlight current month
}
```

### Component State Changes
```typescript
const [showPredictions, setShowPredictions] = useState(false);
```

### Calculation Steps

1. **Identify current month**: `new Date().toISOString().slice(0, 7)` gives "YYYY-MM"

2. **Gather all existing months**: From expenses, incomes, and savings data (existing logic)

3. **Calculate averages** from historical data:
   - Average monthly income
   - Average monthly expenses
   - Average monthly savings growth

4. **Generate prediction months**: If toggle is on, add next 1-3 months with projected values

5. **Sort and display**:
   - Predictions first (furthest future first)
   - Current month (highlighted)
   - Past months (most recent first)

### Visual Distinctions

| Month Type | Icon | Border Style | Background |
|------------|------|--------------|------------|
| Prediction | 🔮 Crystal ball | Dashed border | Slightly transparent |
| Current | ★ Star | Solid border | Accent highlight |
| Past | None | Solid border | Normal muted |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/MonthlySummary.tsx` | Add prediction toggle, update sorting logic, add visual indicators for month types, implement prediction calculations |

### Props (No changes needed)
The component already receives all needed data:
```typescript
interface MonthlySummaryProps {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
}
```

