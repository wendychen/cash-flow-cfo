import { FinanceStateV2 } from '@/stores/finance/financeStore';
import { ExportPayload } from '@/lib/exportImport';
import { Expense } from '@/types/expense';
import { Income } from '@/types/income';
import { Saving } from '@/types/saving';
import { FixedExpense } from '@/types/fixedExpense';
import { Goal } from '@/types/goal';
import { TaskNode, TaskType } from '@/types/task';
import { FinancialTarget } from '@/types/target';
import {
  LONG_TERM_FIN_GOAL_HORIZON_YEARS,
  type LongTermFinGoal,
} from '@/types/longTermFinGoal';
import {
  ExpenseCategory,
  FixedExpenseCategory,
  migrateFixedExpenseCategory,
} from '@/types/expenseCategory';

type CsvSection =
  | 'expenses'
  | 'incomes'
  | 'savings'
  | 'goals'
  | 'tasks'
  | 'fixedExpenses'
  | 'targets'
  | 'longTermFinGoal'
  | null;

export function parseCsvFields(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseJsonField<T>(val: string, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'lifestyle',
  'family',
  'misc',
  'opex',
  'capex',
  'gna',
];

const VALID_FIXED_CATEGORIES: FixedExpenseCategory[] = [
  'housing',
  'utilities-water-electric',
  'utilities-gas',
  'utilities-telecom',
  'transport',
  'health',
  'liabilities-debt',
  'liabilities-loans',
  'liabilities-installments',
  'taxes',
];

function newId() {
  return crypto.randomUUID();
}

export interface CsvImportResult {
  success: boolean;
  data?: FinanceStateV2;
  error?: string;
  counts?: Record<string, number>;
}

/**
 * Parse Cash Flow CFO CSV export (from the legacy ExpenseTracker app)
 * into normalized v2 finance state.
 */
export function parseCsvToFinanceState(csvText: string): CsvImportResult {
  try {
    const lines = csvText.split('\n').filter((line) => line.trim());

    const importedExpenses: Expense[] = [];
    const importedIncomes: Income[] = [];
    const importedSavings: Saving[] = [];
    const importedGoals: Goal[] = [];
    const importedTasks: TaskNode[] = [];
    const importedFixedExpenses: FixedExpense[] = [];
    const importedTargets: FinancialTarget[] = [];
    let importedLongTermFinGoal: LongTermFinGoal | null = null;

    let currentSection: CsvSection = null;
    let goalsFormat: 'old' | 'new' | null = null;
    let goalsNewHasId = false;

    for (const line of lines) {
      if (line.includes('### FIXED EXPENSES ###')) {
        currentSection = 'fixedExpenses';
        continue;
      }
      if (line.includes('### EXPENSES ###')) {
        currentSection = 'expenses';
        continue;
      }
      if (line.includes('### INCOMES ###')) {
        currentSection = 'incomes';
        continue;
      }
      if (line.includes('### SAVINGS ###')) {
        currentSection = 'savings';
        continue;
      }
      if (line.includes('### GOALS ###')) {
        currentSection = 'goals';
        continue;
      }
      if (line.includes('### TASKS ###')) {
        currentSection = 'tasks';
        continue;
      }
      if (line.includes('### TARGETS ###')) {
        currentSection = 'targets';
        continue;
      }
      if (line.includes('### LONG TERM FIN GOAL ###')) {
        currentSection = 'longTermFinGoal';
        continue;
      }

      if (
        currentSection === 'goals' &&
        goalsFormat === null &&
        (line.toLowerCase().startsWith('title,') || line.toLowerCase().startsWith('id,'))
      ) {
        const hasBudget = line.includes('Budget');
        const hasPreTasks = line.includes('PreTasks');
        goalsFormat = hasPreTasks && !hasBudget ? 'old' : 'new';
        goalsNewHasId = line.toLowerCase().startsWith('id,');
        continue;
      }

      if (
        line.toLowerCase().startsWith('date,') ||
        line.toLowerCase().startsWith('title,') ||
        line.toLowerCase().startsWith('description,') ||
        line.toLowerCase().startsWith('type,') ||
        line.toLowerCase().startsWith('targetamount,') ||
        line.toLowerCase().startsWith('id,')
      ) {
        continue;
      }

      const f = parseCsvFields(line);
      if (f.length < 2) continue;

      if (currentSection === 'fixedExpenses') {
        if (f.length < 3) continue;
        const description = f[0];
        const amount = parseFloat(f[1]);
        const frequency = f[2] as FixedExpense['frequency'];
        const isActive = f[3]?.toLowerCase() !== 'false';
        const categoryField = f[4];
        const category =
          categoryField && VALID_FIXED_CATEGORIES.includes(categoryField as FixedExpenseCategory)
            ? (categoryField as FixedExpenseCategory)
            : migrateFixedExpenseCategory(categoryField);
        const createdAt = f[5] || new Date().toISOString();

        if (description && !isNaN(amount)) {
          importedFixedExpenses.push({
            id: newId(),
            description,
            amount,
            frequency: frequency || 'monthly',
            isActive,
            category,
            createdAt,
          });
        }
      } else if (currentSection === 'goals') {
        const pushEmbeddedTasks = (goalId: string, preTasks: any[], postTasks: any[], postDreams: any[]) => {
          preTasks.forEach((task: any, i: number) => {
            importedTasks.push({
              id: task.id || newId(),
              goalId,
              parentId: null,
              taskType: 'pre',
              sortOrder: i,
              title: task.action || '',
              cost: task.cost || 0,
              timeCost: task.timeCost || '',
              deadline: task.deadline || '',
              isMagicWand: !!task.isMagicWand,
              completed: !!task.completed,
              linkedExpenseId: task.linkedExpenseId || undefined,
              createdAt: new Date().toISOString(),
            });
          });
          postTasks.forEach((task: any, i: number) => {
            importedTasks.push({
              id: task.id || newId(),
              goalId,
              parentId: null,
              taskType: 'post',
              sortOrder: i,
              title: task.action || '',
              cost: task.cost || 0,
              timeCost: task.timeCost || '',
              deadline: task.deadline || '',
              isMagicWand: !!task.isMagicWand,
              completed: !!task.completed,
              linkedExpenseId: task.linkedExpenseId || undefined,
              createdAt: new Date().toISOString(),
            });
          });
          postDreams.forEach((dream: any, i: number) => {
            importedTasks.push({
              id: dream.id || newId(),
              goalId,
              parentId: null,
              taskType: 'dream',
              sortOrder: i,
              title: dream.title || '',
              cost: dream.cost || 0,
              timeCost: dream.timeCost || '',
              deadline: dream.deadline || '',
              isMagicWand: !!dream.isMagicWand,
              completed: false,
              linkedExpenseId: dream.linkedExpenseId || undefined,
              createdAt: new Date().toISOString(),
            });
          });
        };

        if (goalsFormat === 'old') {
          const title = f[0];
          const deadline = f[1] || '';
          const completed = f[2]?.toLowerCase() === 'true';
          const isMagicWand = f[3]?.toLowerCase() === 'true';
          const categoryField = f[4];
          const category =
            categoryField && VALID_EXPENSE_CATEGORIES.includes(categoryField as ExpenseCategory)
              ? (categoryField as ExpenseCategory)
              : 'misc';
          const constraint = f[5] || '';
          const createdAt = f[6] || new Date().toISOString();
          const urlPack = parseJsonField<string[]>(f[7], []);
          const preTasks = parseJsonField<any[]>(f[8], []);
          const postTasks = parseJsonField<any[]>(f[9], []);
          const postDreams = parseJsonField<any[]>(f[10], []);
          const ideations = parseJsonField(f[11], []);

          if (title) {
            const goalId = newId();
            importedGoals.push({
              id: goalId,
              title,
              deadline,
              completed,
              isMagicWand,
              category,
              createdAt,
              constraint,
              urlPack,
              ideations,
              budget: 0,
              timeCost: '',
            });
            pushEmbeddedTasks(goalId, preTasks, postTasks, postDreams);
          }
        } else {
          const goalId = goalsNewHasId ? f[0] || newId() : newId();
          const title = goalsNewHasId ? f[1] : f[0];
          const deadline = goalsNewHasId ? f[2] || '' : f[1] || '';
          const completed = (goalsNewHasId ? f[3] : f[2])?.toLowerCase() === 'true';
          const isMagicWand = (goalsNewHasId ? f[4] : f[3])?.toLowerCase() === 'true';
          const categoryField = goalsNewHasId ? f[5] : f[4];
          const category =
            categoryField && VALID_EXPENSE_CATEGORIES.includes(categoryField as ExpenseCategory)
              ? (categoryField as ExpenseCategory)
              : 'misc';
          const constraint = (goalsNewHasId ? f[6] : f[5]) || '';
          const createdAt = (goalsNewHasId ? f[7] : f[6]) || new Date().toISOString();
          const urlPack = parseJsonField<string[]>(goalsNewHasId ? f[8] : f[7], []);
          const ideations = parseJsonField(goalsNewHasId ? f[9] : f[8], []);
          const budget = parseFloat(goalsNewHasId ? f[10] : f[9]) || 0;
          const preTasks = goalsNewHasId ? parseJsonField<any[]>(f[11], []) : [];
          const postTasks = goalsNewHasId ? parseJsonField<any[]>(f[12], []) : [];
          const postDreams = goalsNewHasId ? parseJsonField<any[]>(f[13], []) : [];

          if (title) {
            importedGoals.push({
              id: goalId,
              title,
              deadline,
              completed,
              isMagicWand,
              category,
              createdAt,
              constraint,
              urlPack,
              ideations,
              budget,
              timeCost: '',
            });
            pushEmbeddedTasks(goalId, preTasks, postTasks, postDreams);
          }
        }
      } else if (currentSection === 'tasks') {
        if (f.length < 11) continue;
        const id = f[0];
        const goalId = f[1];
        const parentId = f[2] || null;
        const taskType = f[3] as TaskType;
        const sortOrder = parseInt(f[4]) || 0;
        const title = f[5];
        const cost = parseFloat(f[6]) || 0;
        const timeCost = f[7] || '';
        const deadline = f[8] || '';
        const isMagicWand = f[9]?.toLowerCase() === 'true';
        const completed = f[10]?.toLowerCase() === 'true';
        const linkedExpenseId = f[11] || undefined;
        const createdAt = f[12] || new Date().toISOString();

        if (id && goalId && ['pre', 'post', 'dream'].includes(taskType)) {
          importedTasks.push({
            id,
            goalId,
            parentId,
            taskType,
            sortOrder,
            title,
            cost,
            timeCost,
            deadline,
            isMagicWand,
            completed,
            linkedExpenseId,
            createdAt,
          });
        }
      } else if (currentSection === 'targets') {
        if (f.length < 4) continue;
        const type = f[0] as FinancialTarget['type'];
        const amount = parseFloat(f[1]);
        const period = f[2] as FinancialTarget['period'];
        const cur = f[3] as 'NTD' | 'USD' | 'CAD';
        const createdAt = f[4] || new Date().toISOString();
        const updatedAt = f[5] || createdAt;

        if (
          ['income', 'expense', 'savings'].includes(type) &&
          !isNaN(amount) &&
          ['weekly', 'monthly', 'quarterly', 'yearly'].includes(period) &&
          ['NTD', 'USD', 'CAD'].includes(cur)
        ) {
          importedTargets.push({
            id: newId(),
            type,
            amount,
            period,
            currency: cur,
            createdAt,
            updatedAt,
          });
        }
      } else if (currentSection === 'longTermFinGoal') {
        if (f.length < 5) continue;
        const targetAmount = parseFloat(f[0]);
        const endYear = parseInt(f[1], 10);
        const presetKey = f[3]?.trim() || undefined;
        const updatedAt =
          f.length >= 6 ? f[5] || new Date().toISOString() : f[4] || new Date().toISOString();

        if (!isNaN(targetAmount) && targetAmount > 0 && !isNaN(endYear)) {
          importedLongTermFinGoal = {
            targetAmount,
            endYear,
            horizonYears: LONG_TERM_FIN_GOAL_HORIZON_YEARS,
            presetKey,
            updatedAt,
          };
        }
      } else if (currentSection === 'expenses') {
        if (f.length < 3) continue;
        const date = f[0];
        const description = f[1];
        const amount = parseFloat(f[2]);
        if (!date || !description || isNaN(amount)) continue;

        const category =
          f[3] && VALID_EXPENSE_CATEGORIES.includes(f[3] as ExpenseCategory)
            ? (f[3] as ExpenseCategory)
            : 'misc';
        const needsCheck = f[4]?.toLowerCase() === 'true';
        const reviewCount = f[5] ? parseInt(f[5]) : undefined;
        const linkedGoalId = f[6] || undefined;
        const linkedTaskId = f[7] || undefined;
        const linkedTaskType =
          f[8] === 'pre' || f[8] === 'post' || f[8] === 'dream'
            ? (f[8] as 'pre' | 'post' | 'dream')
            : undefined;

        importedExpenses.push({
          id: newId(),
          date,
          description,
          amount,
          timeCost: '',
          category,
          needsCheck,
          reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : undefined,
          linkedGoalId,
          linkedTaskId,
          linkedTaskType,
        });
      } else if (currentSection === 'incomes') {
        if (f.length < 3) continue;
        const date = f[0];
        const source = f[1];
        const amount = parseFloat(f[2]);
        if (!date || !source || isNaN(amount)) continue;

        importedIncomes.push({
          id: newId(),
          date,
          source,
          amount,
          incomeType: f[4] === 'accrued' ? 'accrued' : 'cash',
          note: f[3] || undefined,
          reviewCount: f[5] && !isNaN(parseInt(f[5])) ? parseInt(f[5]) : undefined,
          linkedAccruedIncomeId: f[6]?.trim() || undefined,
        });
      } else if (currentSection === 'savings') {
        if (f.length < 3) continue;
        const date = f[0];
        const note = f[1] || undefined;
        const amount = parseFloat(f[2]);
        if (!date || isNaN(amount)) continue;

        importedSavings.push({
          id: newId(),
          date,
          amount,
          note,
          savingType: f[3] === 'goal' ? 'goal' : 'balance',
          reviewCount: f[4] && !isNaN(parseInt(f[4])) ? parseInt(f[4]) : undefined,
        });
      }
    }

    const dedupedTasks = Array.from(new Map(importedTasks.map((t) => [t.id, t])).values());

    const hasData =
      importedExpenses.length > 0 ||
      importedIncomes.length > 0 ||
      importedSavings.length > 0 ||
      importedGoals.length > 0 ||
      dedupedTasks.length > 0 ||
      importedFixedExpenses.length > 0 ||
      importedTargets.length > 0 ||
      importedLongTermFinGoal !== null;

    if (!hasData) {
      return { success: false, error: 'No data found in CSV. Check the file format.' };
    }

    const goals: Goal[] = importedGoals.map((goal) => {
      const shadowExpense = importedExpenses.find(
        (e) => e.linkedGoalId === goal.id && !e.linkedTaskId
      );
      return {
        ...goal,
        timeCost: goal.timeCost || '',
        ideations: goal.ideations || [],
        urlPack: goal.urlPack || [],
        constraint: goal.constraint || '',
        linkedExpenseId: shadowExpense?.id ?? goal.linkedExpenseId,
      };
    });

    const data: FinanceStateV2 = {
      version: 2,
      expenses: importedExpenses,
      incomes: importedIncomes,
      savings: importedSavings,
      fixedExpenses: importedFixedExpenses,
      targets: importedTargets,
      longTermFinGoal: importedLongTermFinGoal,
      goals,
      tasks: dedupedTasks,
    };

    return {
      success: true,
      data,
      counts: {
        expenses: data.expenses.length,
        incomes: data.incomes.length,
        savings: data.savings.length,
        fixedExpenses: data.fixedExpenses.length,
        targets: data.targets.length,
        longTermFinGoal: data.longTermFinGoal ? 1 : 0,
        goals: data.goals.length,
        tasks: data.tasks.length,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse CSV',
    };
  }
}

export function csvToExportPayload(csvText: string): { success: boolean; payload?: ExportPayload; error?: string } {
  const result = parseCsvToFinanceState(csvText);
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const now = new Date().toISOString();
  return {
    success: true,
    payload: {
      meta: {
        app: 'cash-flow-cfo',
        schemaVersion: 2,
        exportedAt: now,
        counts: result.counts ?? {},
      },
      data: result.data,
    },
  };
}