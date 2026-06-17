import { format, parseISO, isValid } from 'date-fns';
import type { Goal } from '@/types/goal';
import { isRepeatingGoal, normalizeRepeatInterval } from '@/types/goalRepeat';
import type { TaskNode, TaskType } from '@/types/task';
import type { Income } from '@/types/income';
import type { FinanceStateV2 } from '@/stores/finance/financeStore';
import type { AutoBackupEntry } from '@/lib/autoBackup';
import { EXPENSE_CATEGORIES, migrateExpenseCategory } from '@/types/expenseCategory';
import { buildTree, flattenTree } from '@/features/goals/hooks/use-task-tree';
import { computeSankeyIncomeSplit } from '@/lib/incomeBreakdown';
import { getAccruedCollectionStatus, isAccruedCollection } from '@/lib/incomeConversion';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';
import {
  computeFinGoalProgress,
  getFinGoalPresetByAmount,
  getFinGoalPresetByKey,
  getFinGoalYearsRemaining,
} from '@/lib/finGoalPresets';
import type { Saving } from '@/types/saving';

export type AmountFormatter = (amountInNTD: number) => string;

const TASK_SECTION_LABELS: Record<TaskType, string> = {
  pre: 'Pre-Tasks',
  post: 'Post-Tasks',
  dream: 'Post-Dreams',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeadline(deadline: string): string {
  if (!deadline) return '—';
  try {
    const parsed = parseISO(deadline);
    return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : deadline;
  } catch {
    return deadline;
  }
}

function renderTaskList(tasks: TaskNode[], goalId: string, taskType: TaskType): string {
  const tree = buildTree(tasks, goalId, taskType);
  const flat = flattenTree(tree);
  if (flat.length === 0) return '';

  const items = flat
    .map(({ task, depth }) => {
      const indent = '&nbsp;'.repeat(depth * 4);
      const status = task.completed ? '✓' : '○';
      const magic = task.isMagicWand ? ' ★' : '';
      const cost = task.cost > 0 ? ` — ${task.cost}` : '';
      const time = task.timeCost ? ` (${escapeHtml(task.timeCost)})` : '';
      return `<li>${indent}${status} ${escapeHtml(task.title)}${magic}${cost}${time}</li>`;
    })
    .join('');

  return `
    <div class="task-section">
      <h4>${TASK_SECTION_LABELS[taskType]}</h4>
      <ul>${items}</ul>
    </div>
  `;
}

function renderGoalCard(goal: Goal, tasks: TaskNode[], formatAmount: AmountFormatter): string {
  const categoryKey = migrateExpenseCategory(goal.category);
  const categoryLabel = EXPENSE_CATEGORIES[categoryKey]?.label ?? categoryKey;
  const budget = goal.budget > 0 ? formatAmount(goal.budget) : '—';
  const constraint = goal.constraint
    ? `<p class="meta"><strong>Constraint:</strong> ${escapeHtml(goal.constraint)}</p>`
    : '';
  const urls =
    goal.urlPack.length > 0
      ? `<p class="meta"><strong>Links:</strong> ${goal.urlPack.map((u) => escapeHtml(u)).join(', ')}</p>`
      : '';
  const ideations =
    goal.ideations.length > 0
      ? `<div class="ideations"><strong>Ideations</strong><ul>${goal.ideations
          .map((i) => `<li>${escapeHtml(i.content)}</li>`)
          .join('')}</ul></div>`
      : '';

  const taskSections = (['pre', 'post', 'dream'] as TaskType[])
    .map((type) => renderTaskList(tasks, goal.id, type))
    .filter(Boolean)
    .join('');

  const milestoneSection =
    goal.milestones && goal.milestones.length > 0
      ? `<div class="task-section"><h4>Milestones</h4><ul>${goal.milestones
          .map((m) => {
            const status = m.completed ? '✓' : '○';
            return `<li>${status} ${escapeHtml(m.title)} — ${formatDeadline(m.targetDate)}</li>`;
          })
          .join('')}</ul></div>`
      : '';

  const repeatInterval = normalizeRepeatInterval(goal.repeatInterval);
  const repeatMeta = isRepeatingGoal(repeatInterval)
    ? `<span><strong>Repeat:</strong> ${escapeHtml(repeatInterval)}${goal.repeatCycle && goal.repeatCycle > 1 ? ` (cycle ${goal.repeatCycle})` : ''}</span>
        <span><strong>Duplicate tasks:</strong> ${goal.repeatDuplicateTasks === false ? 'No' : 'Yes'}</span>`
    : '';

  return `
    <article class="goal-card ${goal.completed ? 'completed' : ''}">
      <h3>${escapeHtml(goal.title)}${goal.isMagicWand ? ' ★' : ''}${goal.completed ? ' (Completed)' : ''}</h3>
      <p class="meta">
        <span><strong>Deadline:</strong> ${formatDeadline(goal.deadline)}</span>
        <span><strong>Budget:</strong> ${budget}</span>
        <span><strong>Category:</strong> ${escapeHtml(categoryLabel)}</span>
        ${goal.timeCost ? `<span><strong>Time:</strong> ${escapeHtml(goal.timeCost)}</span>` : ''}
        ${repeatMeta}
      </p>
      ${constraint}
      ${urls}
      ${milestoneSection}
      ${taskSections}
      ${ideations}
    </article>
  `;
}

export interface GoalsPrintInput {
  goals: Goal[];
  tasks: TaskNode[];
  formatAmount: AmountFormatter;
  displayCurrency: string;
  longTermFinGoal?: LongTermFinGoal | null;
  currentSavings?: number;
  printedAt?: Date;
}

export function buildGoalsPrintHtml({
  goals,
  tasks,
  formatAmount,
  displayCurrency,
  longTermFinGoal,
  currentSavings = 0,
  printedAt = new Date(),
}: GoalsPrintInput): string {
  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);
  const finGoalSection = renderFinGoalPrintSection(
    longTermFinGoal,
    currentSavings,
    formatAmount
  );

  const activeHtml =
    active.length > 0
      ? active.map((g) => renderGoalCard(g, tasks, formatAmount)).join('')
      : '<p class="empty">No active goals.</p>';

  const completedHtml =
    completed.length > 0
      ? `<section class="section"><h2>Completed Goals (${completed.length})</h2>${completed
          .map((g) => renderGoalCard(g, tasks, formatAmount))
          .join('')}</section>`
      : '';

  return `
    <header class="report-header">
      <h1>Cash Flow CFO — Goals Report</h1>
      <p class="subtitle">Printed ${format(printedAt, 'MMMM d, yyyy h:mm a')} · Display currency: ${escapeHtml(displayCurrency)}</p>
      <p class="subtitle">${active.length} active · ${completed.length} completed · ${tasks.length} tasks</p>
    </header>
    ${finGoalSection}
    <section class="section">
      <h2>Active Goals (${active.length})</h2>
      ${activeHtml}
    </section>
    ${completedHtml}
  `;
}

export interface BackupPrintInput {
  backups: AutoBackupEntry[];
  currentState: FinanceStateV2;
  printedAt?: Date;
}

function getLatestSavingsBalanceFromState(savings: Saving[] = []): number {
  const balanceSavings = savings.filter((s) => s.savingType === 'balance');
  if (balanceSavings.length === 0) return 0;
  return balanceSavings.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0].amount;
}

function formatFinGoalTargetLabel(goal: LongTermFinGoal, formatAmount: AmountFormatter): string {
  const preset =
    (goal.presetKey && getFinGoalPresetByKey(goal.presetKey)) ||
    getFinGoalPresetByAmount(goal.targetAmount);
  if (preset) return preset.key;
  return formatAmount(goal.targetAmount);
}

function renderFinGoalPrintSection(
  goal: LongTermFinGoal | null | undefined,
  currentSavings: number,
  formatAmount: AmountFormatter
): string {
  if (!goal || goal.targetAmount <= 0) return '';

  const progress = computeFinGoalProgress(currentSavings, goal.targetAmount);
  const yearsLeft = getFinGoalYearsRemaining(goal.endYear);
  const targetLabel = formatFinGoalTargetLabel(goal, formatAmount);

  return `
    <section class="section">
      <h2>20-Year Fin Goal</h2>
      <table class="counts-table fin-goal-table">
        <tbody>
          <tr><td>Target</td><td class="num">${escapeHtml(targetLabel)} (${formatAmount(goal.targetAmount)})</td></tr>
          <tr><td>End year</td><td class="num">${goal.endYear}</td></tr>
          <tr><td>Years remaining</td><td class="num">${yearsLeft}</td></tr>
          <tr><td>Current savings</td><td class="num">${formatAmount(currentSavings)}</td></tr>
          <tr><td>Progress</td><td class="num">${progress}%</td></tr>
          <tr><td>Preset</td><td>${goal.presetKey ? escapeHtml(goal.presetKey) : 'Custom'}</td></tr>
        </tbody>
      </table>
    </section>
  `;
}

function countState(state: FinanceStateV2) {
  const incomes = state.incomes ?? [];
  return {
    expenses: state.expenses?.length ?? 0,
    incomes: incomes.length,
    incomeCollections: incomes.filter((inc) => isAccruedCollection(inc)).length,
    savings: state.savings?.length ?? 0,
    fixedExpenses: state.fixedExpenses?.length ?? 0,
    targets: state.targets?.length ?? 0,
    longTermFinGoal: state.longTermFinGoal ? 1 : 0,
    goals: state.goals?.length ?? 0,
    tasks: state.tasks?.length ?? 0,
  };
}

function formatIncomeDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

function renderIncomePrintSection(incomes: Income[], formatAmount: AmountFormatter): string {
  if (incomes.length === 0) return '';

  const split = computeSankeyIncomeSplit(incomes);
  const accruedEntries = incomes
    .filter((inc) => inc.incomeType === 'accrued')
    .sort((a, b) => b.date.localeCompare(a.date));
  const collectionEntries = incomes
    .filter((inc) => isAccruedCollection(inc))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summaryRows = [
    ['Direct cash', split.directCash],
    ['Collections', split.collections],
    ['Outstanding accrued', split.accruedOutstanding],
    ['Total (cash + outstanding)', split.total],
  ]
    .map(
      ([label, amount]) =>
        `<tr><td>${escapeHtml(label)}</td><td class="num">${formatAmount(amount as number)}</td></tr>`
    )
    .join('');

  const accruedRows =
    accruedEntries.length > 0
      ? accruedEntries
          .map((accrued) => {
            const status = getAccruedCollectionStatus(accrued, incomes);
            const statusLabel = status.isFullyCollected
              ? 'Fully collected'
              : `${status.percentCollected}% collected`;
            return `<tr>
              <td>${formatIncomeDate(accrued.date)}</td>
              <td>${escapeHtml(accrued.source)}</td>
              <td class="num">${formatAmount(accrued.amount)}</td>
              <td class="num">${formatAmount(status.collected)}</td>
              <td class="num">${formatAmount(status.outstanding)}</td>
              <td>${statusLabel}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="6" class="empty">No accrued income records.</td></tr>';

  const collectionRows =
    collectionEntries.length > 0
      ? collectionEntries
          .map((collection) => {
            const linked = collection.linkedAccruedIncomeId
              ? incomes.find((inc) => inc.id === collection.linkedAccruedIncomeId)
              : undefined;
            const linkedLabel = linked ? escapeHtml(linked.source) : '—';
            return `<tr>
              <td>${formatIncomeDate(collection.date)}</td>
              <td>${escapeHtml(collection.source)}</td>
              <td>${linkedLabel}</td>
              <td class="num">${formatAmount(collection.amount)}</td>
              <td>${escapeHtml(collection.note ?? '')}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="5" class="empty">No collection entries recorded.</td></tr>';

  return `
    <section class="section">
      <h2>Income &amp; Collections</h2>
      <table class="counts-table income-summary-table">
        <thead><tr><th>Category</th><th>Amount</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>

      <h3>Accrued Income</h3>
      <table class="income-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Accrued</th>
            <th>Collected</th>
            <th>Outstanding</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${accruedRows}</tbody>
      </table>

      <h3>Cash Collections</h3>
      <table class="income-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>From accrued</th>
            <th>Amount</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>${collectionRows}</tbody>
      </table>
    </section>
  `;
}

export interface BackupPrintOptions {
  formatAmount?: AmountFormatter;
}

export function buildBackupPrintHtml(
  {
    backups,
    currentState,
    printedAt = new Date(),
  }: BackupPrintInput,
  options: BackupPrintOptions = {}
): string {
  const currentCounts = countState(currentState);
  const formatAmount = options.formatAmount ?? ((n: number) => String(n));
  const currentSavings = getLatestSavingsBalanceFromState(currentState.savings ?? []);
  const finGoalSection = renderFinGoalPrintSection(
    currentState.longTermFinGoal,
    currentSavings,
    formatAmount
  );
  const incomeSection = renderIncomePrintSection(currentState.incomes ?? [], formatAmount);

  const backupRows =
    backups.length > 0
      ? backups
          .map((entry, index) => {
            const counts = countState(entry.data);
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const saved = format(new Date(entry.savedAt), 'MMM d, yyyy h:mm a');
            return `<tr>
              <td>${index === 0 ? 'Latest' : `#${index + 1}`}</td>
              <td>${saved}</td>
              <td class="num">${counts.goals}</td>
              <td class="num">${counts.tasks}</td>
              <td class="num">${counts.expenses}</td>
              <td class="num">${counts.incomes}</td>
              <td class="num">${counts.savings}</td>
              <td class="num">${total}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="8" class="empty">No auto-backups stored yet.</td></tr>';

  return `
    <header class="report-header">
      <h1>Cash Flow CFO — Backup Report</h1>
      <p class="subtitle">Printed ${format(printedAt, 'MMMM d, yyyy h:mm a')}</p>
      <p class="subtitle">Auto-backup keeps the last ${backups.length} snapshot${backups.length === 1 ? '' : 's'} locally in your browser.</p>
    </header>

    <section class="section">
      <h2>Current Data (Live)</h2>
      <table class="counts-table">
        <thead><tr><th>Domain</th><th>Records</th></tr></thead>
        <tbody>
          ${Object.entries(currentCounts)
            .map(
              ([key, value]) =>
                `<tr><td>${escapeHtml(key)}</td><td class="num">${value}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>

    ${finGoalSection}

    ${incomeSection}

    <section class="section">
      <h2>Auto-Backup History</h2>
      <table class="backup-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Saved At</th>
            <th>Goals</th>
            <th>Tasks</th>
            <th>Expenses</th>
            <th>Income</th>
            <th>Savings</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${backupRows}</tbody>
      </table>
    </section>

    <section class="section notes">
      <h2>Notes</h2>
      <ul>
        <li>Use <strong>Export JSON</strong> in the app for a full portable backup file.</li>
        <li>Auto-backups are stored only in this browser's local storage.</li>
        <li>Restore from the latest auto-backup via the Dashboard when needed.</li>
      </ul>
    </section>
  `;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #111;
    line-height: 1.5;
    margin: 0;
    padding: 24px;
    font-size: 12pt;
  }
  h1 { font-size: 20pt; margin: 0 0 8px; }
  h2 { font-size: 14pt; margin: 24px 0 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 13pt; margin: 0 0 8px; }
  h3 { font-size: 12pt; margin: 16px 0 8px; color: #222; }
  h4 { font-size: 11pt; margin: 12px 0 6px; color: #333; }
  .subtitle { color: #555; margin: 4px 0; font-size: 10pt; }
  .section { margin-bottom: 20px; }
  .goal-card {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .goal-card.completed { opacity: 0.85; }
  .meta { color: #444; font-size: 10pt; margin: 6px 0; }
  .meta span { display: inline-block; margin-right: 16px; }
  .task-section ul, .ideations ul { margin: 4px 0 8px; padding-left: 20px; }
  .task-section li, .ideations li { margin: 2px 0; font-size: 10pt; }
  .empty { color: #666; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .income-table { margin-bottom: 12px; }
  .income-summary-table { margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .notes ul { padding-left: 20px; font-size: 10pt; }
  @media print {
    body { padding: 0; }
    .goal-card { break-inside: avoid; }
  }
`;

export function wrapPrintDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** Open a print-friendly document in a new window and trigger the browser print dialog. */
export function openPrintDocument(title: string, bodyHtml: string): void {
  const html = wrapPrintDocument(title, bodyHtml);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) {
    alert('Please allow pop-ups to print this report.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
}

export function printGoalsReport(input: GoalsPrintInput): void {
  const body = buildGoalsPrintHtml(input);
  openPrintDocument('Cash Flow CFO — Goals Report', body);
}

export function printBackupReport(
  input: BackupPrintInput,
  options: BackupPrintOptions = {}
): void {
  const body = buildBackupPrintHtml(input, options);
  openPrintDocument('Cash Flow CFO — Backup Report', body);
}

// Exported for tests
export const _test = { escapeHtml, formatDeadline };