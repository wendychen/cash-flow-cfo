export type IncomeType = "cash" | "accrued";

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  incomeType: IncomeType;
  note?: string;
  reviewCount?: number;
}
