import { ExpenseCategory } from './expenseCategory';

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  timeCost: string;
  needsCheck: boolean;
  reviewCount?: number;
  category: ExpenseCategory;
  linkedGoalId?: string;
  linkedTaskId?: string;
  linkedTaskType?: 'pre' | 'post' | 'dream';
}
