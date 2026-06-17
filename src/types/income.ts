import type { Currency } from '@/hooks/use-currency';

export type IncomeType = "cash" | "accrued";

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  originalAmount?: number;
  originalCurrency?: Currency;
  incomeType: IncomeType;
  /** Cash entry collected against a parent accrued income record. */
  linkedAccruedIncomeId?: string;
  note?: string;
  reviewCount?: number;
}
