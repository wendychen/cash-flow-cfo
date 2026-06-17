import { ExpenseCategory } from './expenseCategory';
import type { Currency } from '@/hooks/use-currency';

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  /** Amount as originally entered when not in USD */
  originalAmount?: number;
  originalCurrency?: Currency;
  timeCost: string;
  needsCheck: boolean;
  reviewCount?: number;
  category: ExpenseCategory;
  linkedGoalId?: string;
  linkedTaskId?: string;
  linkedTaskType?: 'pre' | 'post' | 'dream';
}
