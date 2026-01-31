import { FixedExpenseCategory } from './expenseCategory';

export type Frequency = "weekly" | "bi-weekly" | "bi-monthly" | "monthly" | "quarterly" | "yearly" | "custom";

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;
  frequency: Frequency;
  customDays?: number;
  isActive: boolean;
  createdAt: string;
  category: FixedExpenseCategory;
}

export interface FixedIncome {
  id: string;
  source: string;
  amount: number;
  frequency: Frequency;
  customDays?: number;
  isActive: boolean;
  createdAt: string;
  lastGeneratedDate?: string;
}

export const getMonthlyEquivalent = (amount: number, frequency: Frequency, customDays?: number): number => {
  switch (frequency) {
    case "weekly":
      return amount * 4.33;
    case "bi-weekly":
      return amount * 2.17;
    case "bi-monthly":
      return amount * 2;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "custom":
      return customDays ? (amount * 30) / customDays : amount;
    default:
      return amount;
  }
};

export const getDaysForFrequency = (frequency: Frequency, customDays?: number): number => {
  switch (frequency) {
    case "weekly":
      return 7;
    case "bi-weekly":
      return 14;
    case "bi-monthly":
      return 15;
    case "monthly":
      return 30;
    case "quarterly":
      return 90;
    case "yearly":
      return 365;
    case "custom":
      return customDays || 30;
    default:
      return 30;
  }
};
