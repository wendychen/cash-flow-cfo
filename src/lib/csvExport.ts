import type { FinanceStateV2 } from '@/stores/finance/financeStore';

function escCsv(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

function jsonCsv(val: unknown): string {
  return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
}

export function buildCsvExportFilename(date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `cashflow-${dateStr}.csv`;
}

export function buildFinanceCsv(state: FinanceStateV2): string {
  const {
    fixedExpenses,
    expenses,
    incomes,
    savings,
    goals,
    tasks,
    targets,
  } = state;

  const goalsWithContent = goals.filter((g) => g.title.trim());
  let csvContent = '';

  if (fixedExpenses.length > 0) {
    csvContent += '### FIXED EXPENSES ###\n';
    csvContent += 'Description,Amount,Frequency,IsActive,Category,CreatedAt\n';
    fixedExpenses.forEach((exp) => {
      csvContent += `${escCsv(exp.description)},${exp.amount.toFixed(2)},${exp.frequency},${exp.isActive},${exp.category},${exp.createdAt}\n`;
    });
  }

  if (expenses.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### EXPENSES ###\n';
    csvContent += 'Date,Description,Amount,Category,NeedsCheck,ReviewCount,LinkedGoalId,LinkedTaskId,LinkedTaskType\n';
    expenses.forEach((exp) => {
      csvContent += `${exp.date},${escCsv(exp.description)},${exp.amount.toFixed(2)},${exp.category},${exp.needsCheck},${exp.reviewCount ?? ''},${exp.linkedGoalId || ''},${exp.linkedTaskId || ''},${exp.linkedTaskType || ''}\n`;
    });
  }

  if (incomes.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### INCOMES ###\n';
    csvContent += 'Date,Source,Amount,Note,IncomeType,ReviewCount\n';
    incomes.forEach((inc) => {
      csvContent += `${inc.date},${escCsv(inc.source)},${inc.amount.toFixed(2)},${escCsv(inc.note || '')},${inc.incomeType || 'cash'},${inc.reviewCount ?? ''}\n`;
    });
  }

  if (savings.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### SAVINGS ###\n';
    csvContent += 'Date,Note,Amount,SavingType,ReviewCount\n';
    savings.forEach((sav) => {
      csvContent += `${sav.date},${escCsv(sav.note || '')},${sav.amount.toFixed(2)},${sav.savingType || 'balance'},${sav.reviewCount ?? ''}\n`;
    });
  }

  if (goalsWithContent.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### GOALS ###\n';
    csvContent +=
      'Id,Title,Deadline,Completed,IsMagicWand,Category,Constraint,CreatedAt,UrlPack,Ideations,Budget,TimeCost,Milestones,RepeatInterval,RepeatCycle,PreTasks,PostTasks,PostDreams\n';
    goalsWithContent.forEach((goal) => {
      const preTasks = tasks
        .filter((t) => t.goalId === goal.id && t.taskType === 'pre')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          id: t.id,
          action: t.title,
          cost: t.cost,
          timeCost: t.timeCost,
          deadline: t.deadline,
          isMagicWand: t.isMagicWand,
          completed: t.completed,
          linkedExpenseId: t.linkedExpenseId,
        }));
      const postTasks = tasks
        .filter((t) => t.goalId === goal.id && t.taskType === 'post')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          id: t.id,
          action: t.title,
          cost: t.cost,
          timeCost: t.timeCost,
          deadline: t.deadline,
          isMagicWand: t.isMagicWand,
          completed: t.completed,
          linkedExpenseId: t.linkedExpenseId,
        }));
      const postDreams = tasks
        .filter((t) => t.goalId === goal.id && t.taskType === 'dream')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          id: t.id,
          title: t.title,
          cost: t.cost,
          timeCost: t.timeCost,
          deadline: t.deadline,
          isMagicWand: t.isMagicWand,
          linkedExpenseId: t.linkedExpenseId,
        }));

      csvContent += `${goal.id},${escCsv(goal.title)},${goal.deadline || ''},${goal.completed},${goal.isMagicWand || false},${goal.category || 'misc'},${escCsv(goal.constraint || '')},${goal.createdAt},${jsonCsv(goal.urlPack || [])},${jsonCsv(goal.ideations || [])},${goal.budget || 0},${escCsv(goal.timeCost || '')},${jsonCsv(goal.milestones || [])},${goal.repeatInterval || ''},${goal.repeatCycle ?? ''},${jsonCsv(preTasks)},${jsonCsv(postTasks)},${jsonCsv(postDreams)}\n`;
    });
  }

  if (tasks.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### TASKS ###\n';
    csvContent +=
      'Id,GoalId,ParentId,TaskType,SortOrder,Title,Cost,TimeCost,Deadline,IsMagicWand,Completed,LinkedExpenseId,CreatedAt\n';
    tasks.forEach((t) => {
      csvContent += `${t.id},${t.goalId},${t.parentId || ''},${t.taskType},${t.sortOrder},${escCsv(t.title)},${t.cost},${escCsv(t.timeCost || '')},${t.deadline || ''},${t.isMagicWand},${t.completed},${t.linkedExpenseId || ''},${t.createdAt}\n`;
    });
  }

  if (targets.length > 0) {
    if (csvContent) csvContent += '\n';
    csvContent += '### TARGETS ###\n';
    csvContent += 'Type,Amount,Period,Currency,CreatedAt,UpdatedAt\n';
    targets.forEach((target) => {
      csvContent += `${target.type},${target.amount.toFixed(2)},${target.period},${target.currency},${target.createdAt},${target.updatedAt}\n`;
    });
  }

  return csvContent;
}

export function hasExportableData(state: FinanceStateV2): boolean {
  const goalsWithContent = state.goals.filter((g) => g.title.trim());
  return (
    state.expenses.length > 0 ||
    state.incomes.length > 0 ||
    state.savings.length > 0 ||
    goalsWithContent.length > 0 ||
    state.fixedExpenses.length > 0 ||
    state.targets.length > 0 ||
    state.tasks.length > 0
  );
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type CsvExportMethod = 'picker' | 'download' | 'cancelled';

export interface CsvExportResult {
  filename: string;
  success: boolean;
  method: CsvExportMethod;
  error?: string;
}

export async function saveFinanceCsvExport(state: FinanceStateV2): Promise<CsvExportResult> {
  if (!hasExportableData(state)) {
    return {
      filename: buildCsvExportFilename(),
      success: false,
      method: 'cancelled',
      error: 'No data to export',
    };
  }

  const filename = buildCsvExportFilename();
  const csv = buildFinanceCsv(state);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Cash Flow CFO CSV Backup',
            accept: { 'text/csv': ['.csv'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(csv);
      await writable.close();
      return { filename: handle.name, success: true, method: 'picker' };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { filename, success: false, method: 'cancelled' };
      }
    }
  }

  triggerDownload(filename, csv);
  return { filename, success: true, method: 'download' };
}