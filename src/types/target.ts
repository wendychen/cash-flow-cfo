import { Currency } from "@/hooks/use-currency";

export type TargetType = "income" | "expense" | "savings";
export type TargetPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface FinancialTarget {
  id: string;
  type: TargetType;
  amount: number;
  currency: Currency;
  period: TargetPeriod;
  createdAt: string;
  updatedAt: string;
}
