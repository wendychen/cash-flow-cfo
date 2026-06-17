import type { Income } from '@/types/income';
import { getAccruedCollectionStatus } from '@/lib/incomeConversion';

export interface IncomeBreakdown {
  cash: number;
  /** Outstanding accrued (gross accrued minus collections). */
  accrued: number;
  accruedGross: number;
  collected: number;
  total: number;
  cashPercent: number;
  accruedPercent: number;
}

export interface SankeyIncomeSplit {
  directCash: number;
  collections: number;
  accruedOutstanding: number;
  total: number;
}

export function computeIncomeBreakdown(incomes: Income[]): IncomeBreakdown {
  let cash = 0;
  let accruedGross = 0;
  let accruedOutstanding = 0;

  incomes.forEach((inc) => {
    if (inc.incomeType === 'accrued') {
      accruedGross += inc.amount;
      accruedOutstanding += getAccruedCollectionStatus(inc, incomes).outstanding;
    } else {
      cash += inc.amount;
    }
  });

  const collected = incomes
    .filter((inc) => inc.incomeType === 'cash' && inc.linkedAccruedIncomeId)
    .reduce((sum, inc) => sum + inc.amount, 0);

  const accrued = accruedOutstanding;
  const total = cash + accrued;
  const cashPercent = total > 0 ? Math.round((cash / total) * 100) : 0;
  const accruedPercent = total > 0 ? Math.round((accrued / total) * 100) : 0;

  return {
    cash,
    accrued,
    accruedGross,
    collected,
    total,
    cashPercent,
    accruedPercent,
  };
}

/** Income split for Sankey drill-down: direct cash, accrued collections, outstanding accrued. */
export function computeSankeyIncomeSplit(incomes: Income[]): SankeyIncomeSplit {
  const breakdown = computeIncomeBreakdown(incomes);
  return {
    directCash: breakdown.cash - breakdown.collected,
    collections: breakdown.collected,
    accruedOutstanding: breakdown.accrued,
    total: breakdown.total,
  };
}