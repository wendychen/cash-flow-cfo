import { Expense } from '@/types/expense';
import { Goal } from '@/types/goal';
import { TaskNode, TaskType } from '@/types/task';

export const TASK_PREFIX: Record<TaskType, string> = {
  pre: '[Pre-task]',
  post: '[Post-task]',
  dream: '[Dream]',
};

export function createGoalShadowExpense(
  goalId: string,
  goal: Pick<Goal, 'title' | 'deadline' | 'category' | 'budget' | 'timeCost'>
): { expense: Expense; expenseId: string } {
  const expenseId = crypto.randomUUID();
  return {
    expenseId,
    expense: {
      id: expenseId,
      date: goal.deadline || new Date().toISOString().split('T')[0],
      description: `Goal: ${goal.title}`,
      amount: goal.budget ?? 0,
      timeCost: goal.timeCost ?? '',
      needsCheck: true,
      category: goal.category || 'misc',
      linkedGoalId: goalId,
    },
  };
}

export function createTaskShadowExpense(
  goalId: string,
  taskId: string,
  taskType: TaskType,
  data: Pick<TaskNode, 'title' | 'cost' | 'timeCost' | 'deadline'>,
  goalCategory: Goal['category'] = 'misc'
): { expense: Expense; expenseId: string } {
  const expenseId = crypto.randomUUID();
  return {
    expenseId,
    expense: {
      id: expenseId,
      date: data.deadline || new Date().toISOString().split('T')[0],
      description: `${TASK_PREFIX[taskType]} ${data.title}`,
      amount: data.cost,
      timeCost: data.timeCost,
      needsCheck: false,
      category: goalCategory,
      linkedGoalId: goalId,
      linkedTaskId: taskId,
      linkedTaskType: taskType,
    },
  };
}

export function mapExpenseUpdatesToGoal(
  updates: Partial<Omit<Expense, 'id'>>
): Partial<Omit<Goal, 'id'>> {
  const goalUpdates: Partial<Omit<Goal, 'id'>> = {};
  if (updates.description !== undefined) {
    goalUpdates.title = updates.description.replace(/^Goal:\s*/i, '');
  }
  if (updates.date !== undefined) {
    goalUpdates.deadline = updates.date;
  }
  if (updates.category !== undefined) {
    goalUpdates.category = updates.category;
  }
  if (updates.amount !== undefined) {
    goalUpdates.budget = updates.amount;
  }
  if (updates.timeCost !== undefined) {
    goalUpdates.timeCost = updates.timeCost;
  }
  return goalUpdates;
}

export function mapExpenseUpdatesToTask(
  expense: Expense,
  updates: Partial<Omit<Expense, 'id'>>
): Partial<Omit<TaskNode, 'id'>> {
  const taskType = expense.linkedTaskType || 'pre';
  const prefix = TASK_PREFIX[taskType];
  const taskUpdates: Partial<Omit<TaskNode, 'id'>> = {};

  if (updates.description !== undefined) {
    const escaped = prefix.replace('[', '\\[').replace(']', '\\]');
    taskUpdates.title = updates.description.replace(new RegExp(`^${escaped}\\s*`, 'i'), '');
  }
  if (updates.amount !== undefined) {
    taskUpdates.cost = updates.amount;
  }
  if (updates.date !== undefined) {
    taskUpdates.deadline = updates.date;
  }
  if (updates.timeCost !== undefined) {
    taskUpdates.timeCost = updates.timeCost;
  }
  return taskUpdates;
}

export function mapGoalUpdatesToExpense(
  updates: Partial<Omit<Goal, 'id'>>
): Partial<Omit<Expense, 'id'>> {
  const expenseUpdates: Partial<Omit<Expense, 'id'>> = {};
  if (updates.deadline) {
    expenseUpdates.date = updates.deadline;
  }
  if (updates.title) {
    expenseUpdates.description = `Goal: ${updates.title}`;
  }
  if (updates.category) {
    expenseUpdates.category = updates.category;
  }
  if (updates.budget !== undefined) {
    expenseUpdates.amount = updates.budget;
  }
  if (updates.timeCost !== undefined) {
    expenseUpdates.timeCost = updates.timeCost;
  }
  return expenseUpdates;
}

export function mapTaskUpdatesToExpense(
  task: TaskNode,
  updates: Partial<Omit<TaskNode, 'id'>>
): Partial<Omit<Expense, 'id'>> {
  const expenseUpdates: Partial<Omit<Expense, 'id'>> = {};
  if (updates.title !== undefined) {
    expenseUpdates.description = `${TASK_PREFIX[task.taskType]} ${updates.title}`;
  }
  if (updates.cost !== undefined) {
    expenseUpdates.amount = updates.cost;
  }
  if (updates.deadline !== undefined && updates.deadline) {
    expenseUpdates.date = updates.deadline;
  }
  if (updates.timeCost !== undefined) {
    expenseUpdates.timeCost = updates.timeCost;
  }
  return expenseUpdates;
}

export function collectExpenseIdsForGoalDelete(
  goal: Goal | undefined,
  goalTasks: TaskNode[]
): string[] {
  const expenseIds: string[] = [];
  if (goal?.linkedExpenseId) {
    expenseIds.push(goal.linkedExpenseId);
  }
  goalTasks.forEach((t) => {
    if (t.linkedExpenseId) {
      expenseIds.push(t.linkedExpenseId);
    }
  });
  return expenseIds;
}

export function findGoalsMissingShadowExpenses(
  goals: Goal[],
  expenses: Expense[]
): Goal[] {
  return goals
    .filter((g) => g.title)
    .filter((g) => {
      if (g.linkedExpenseId) {
        const expenseExists = expenses.some((e) => e.id === g.linkedExpenseId);
        if (expenseExists) return false;
      }
      const hasLinkedExpense = expenses.some(
        (e) => e.linkedGoalId === g.id && !e.linkedTaskId
      );
      return !hasLinkedExpense;
    });
}

export function backfillShadowExpensesForGoals(
  goals: Goal[],
  expenses: Expense[]
): { goals: Goal[]; expenses: Expense[] } {
  const missing = findGoalsMissingShadowExpenses(goals, expenses);
  if (missing.length === 0) {
    return { goals, expenses };
  }

  const newExpenses: Expense[] = [];
  const goalUpdates = new Map<string, string>();

  missing.forEach((goal) => {
    const { expense, expenseId } = createGoalShadowExpense(goal.id, goal);
    newExpenses.push(expense);
    goalUpdates.set(goal.id, expenseId);
  });

  return {
    goals: goals.map((g) =>
      goalUpdates.has(g.id) ? { ...g, linkedExpenseId: goalUpdates.get(g.id) } : g
    ),
    expenses: [...expenses, ...newExpenses],
  };
}