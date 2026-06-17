import { ExpenseCategory } from './expenseCategory';
import type { GoalMilestone } from './goalMilestone';

export interface TaskItem {
  id: string;
  action: string;
  cost: number;
  timeCost: string;
  deadline: string;
  isMagicWand: boolean;
  completed: boolean;
  linkedExpenseId?: string;
}

export interface PostDream {
  id: string;
  title: string;
  cost: number;
  timeCost: string;
  deadline: string;
  isMagicWand: boolean;
  linkedExpenseId?: string;
}

export interface Ideation {
  id: string;
  content: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
  isMagicWand: boolean;
  createdAt: string;
  linkedExpenseId?: string;
  category: ExpenseCategory;
  budget: number;
  timeCost: string;
  ideations: Ideation[];
  constraint: string;
  urlPack: string[];
  milestones?: GoalMilestone[];
  preTasks?: TaskItem[];
  postTasks?: TaskItem[];
  postDreams?: PostDream[];
}
