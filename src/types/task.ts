export type TaskType = 'pre' | 'post' | 'dream';

export interface TaskNode {
  id: string;
  goalId: string;
  parentId: string | null;
  taskType: TaskType;
  sortOrder: number;
  title: string;
  cost: number;
  timeCost: string;
  deadline: string;
  isMagicWand: boolean;
  completed: boolean;
  linkedExpenseId?: string;
  createdAt: string;
}
