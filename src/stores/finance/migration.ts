import { FinanceStateV1, FinanceStateV2 } from './financeStore';
import { TaskNode, TaskType } from '@/types/task';
import { Goal } from '@/types/goal';

/**
 * One-time migration from legacy (v1) storage to normalized v2.
 * 
 * Key changes in v2:
 * - Goals no longer contain embedded preTasks/postTasks/postDreams
 * - All tasks live in a flat `tasks` array with goalId + taskType + sortOrder
 * - Added explicit `version: 2`
 */
export function migrateFromV1(oldState: any): FinanceStateV2 {
  console.log('[Migration] Starting v1 → v2 migration...');

  if (!oldState) {
    return {
      version: 2,
      expenses: [],
      incomes: [],
      savings: [],
      fixedExpenses: [],
      targets: [],
      goals: [],
      tasks: [],
    };
  }

  const v1 = oldState as FinanceStateV1;

  // Start with whatever arrays exist (or empty)
  const migrated: FinanceStateV2 = {
    version: 2,
    expenses: v1.expenses || [],
    incomes: v1.incomes || [],
    savings: v1.savings || [],
    fixedExpenses: v1.fixedExpenses || [],
    targets: v1.targets || [],
    goals: [],
    tasks: [],
  };

  const newTasks: TaskNode[] = [];
  const newGoals: Goal[] = [];

  (v1.goals || []).forEach((oldGoal: any, goalIndex: number) => {
    // Create clean goal without embedded task arrays
    const cleanGoal: Goal = {
      id: oldGoal.id || crypto.randomUUID(),
      title: oldGoal.title || '',
      deadline: oldGoal.deadline || '',
      completed: !!oldGoal.completed,
      isMagicWand: !!oldGoal.isMagicWand,
      createdAt: oldGoal.createdAt || new Date().toISOString(),
      linkedExpenseId: oldGoal.linkedExpenseId,
      category: oldGoal.category || 'misc',
      budget: oldGoal.budget || 0,
      timeCost: oldGoal.timeCost || '',
      ideations: oldGoal.ideations || [],
      constraint: oldGoal.constraint || '',
      urlPack: oldGoal.urlPack || [],
      milestones: oldGoal.milestones || [],
      // Intentionally do NOT copy preTasks / postTasks / postDreams
    };

    newGoals.push(cleanGoal);

    // Convert embedded tasks → flat TaskNode[]
    const convertTasks = (
      taskList: any[] | undefined,
      taskType: TaskType,
      baseSortOrder: number
    ) => {
      if (!Array.isArray(taskList)) return;

      taskList.forEach((oldTask: any, index: number) => {
        const taskNode: TaskNode = {
          id: oldTask.id || crypto.randomUUID(),
          goalId: cleanGoal.id,
          parentId: null, // v1 did not support nesting in the embedded format
          taskType,
          sortOrder: baseSortOrder + index,
          title: oldTask.action || oldTask.title || '',
          cost: oldTask.cost || 0,
          timeCost: oldTask.timeCost || '',
          deadline: oldTask.deadline || cleanGoal.deadline || '',
          isMagicWand: !!oldTask.isMagicWand,
          completed: !!oldTask.completed,
          linkedExpenseId: oldTask.linkedExpenseId,
          createdAt: new Date().toISOString(),
        };
        newTasks.push(taskNode);
      });
    };

    // Convert the three categories from the old shape
    convertTasks(oldGoal.preTasks || oldGoal.subTasks, 'pre', 0);
    convertTasks(oldGoal.postTasks, 'post', 1000);
    convertTasks(oldGoal.postDreams, 'dream', 2000);
  });

  migrated.goals = newGoals;
  migrated.tasks = newTasks;

  console.log(
    `[Migration] Complete. Converted ${newGoals.length} goals and ${newTasks.length} tasks to normalized structure.`
  );

  return migrated;
}

/**
 * Main entry point used by Zustand persist middleware.
 */
export function migratePersistedState(persistedState: any, version: number): FinanceStateV2 {
  // No data at all
  if (!persistedState) {
    return {
      version: 2,
      expenses: [],
      incomes: [],
      savings: [],
      fixedExpenses: [],
      targets: [],
      goals: [],
      tasks: [],
    };
  }

  // Already on v2 or higher
  if (persistedState.version === 2) {
    return persistedState as FinanceStateV2;
  }

  // v1 or unknown (treat as v1)
  return migrateFromV1(persistedState);
}
