export type SavingType = "balance" | "goal";

export interface Saving {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number; // Total savings balance for that day (in NTD)
  note?: string;
  reviewCount?: number;
  savingType: SavingType; // "balance" = actual savings, "goal" = target/desired savings
}
