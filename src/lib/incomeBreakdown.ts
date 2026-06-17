import type { Income } from '@/types/income';

export interface IncomeBreakdown {
  cash: number;
  accrued: number;
  total: number;
  cashPercent: number;
  accruedPercent: number;
}

export function computeIncomeBreakdown(incomes: Income[]): IncomeBreakdown {
  let cash = 0;
  let accrued = 0;

  incomes.forEach((inc) => {
    if (inc.incomeType === 'accrued') {
      accrued += inc.amount;
    } else {
      cash += inc.amount;
    }
  });

  const total = cash + accrued;
  const cashPercent = total > 0 ? Math.round((cash / total) * 100) : 0;
  const accruedPercent = total > 0 ? Math.round((accrued / total) * 100) : 0;

  return { cash, accrued, total, cashPercent, accruedPercent };
}