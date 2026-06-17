import type { Currency } from '@/hooks/use-currency';

export type SavingType = "balance" | "goal";

export interface Saving {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number; // Stored in NTD base
  originalAmount?: number;
  originalCurrency?: Currency;
  note?: string;
  reviewCount?: number;
  savingType: SavingType; // "balance" = actual savings, "goal" = target/desired savings
}
