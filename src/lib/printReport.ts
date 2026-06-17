import { format, parseISO, isValid } from 'date-fns';
import type { Goal } from '@/types/goal';
import { isRepeatingGoal, normalizeRepeatInterval } from '@/types/goalRepeat';
import type { TaskNode, TaskType } from '@/types/task';
import type { FinanceStateV2 } from '@/stores/finance/financeStore';
import type { AutoBackupEntry } from '@/lib/autoBackup';
import { EXPENSE_CATEGORIES, migrateExpenseCategory } from '@/types/expenseCategory';
import { buildTree, flattenTree } from '@/features/goals/hooks/use-task-tree';

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
    ? `<span><strong>Repeat:</strong> ${escapeHtml(repeatInterval)}${goal.repeatCycle && goal.repeatCycle > 1 ? ` (cycle ${goal.repeatCycle})` : ''}</span>`
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
  printedAt?: Date;
}

export function buildGoalsPrintHtml({
  goals,
  tasks,
  formatAmount,
  displayCurrency,
  printedAt = new Date(),
}: GoalsPrintInput): string {
  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

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

function countState(state: FinanceStateV2) {
  return {
    expenses: state.expenses?.length ?? 0,
    incomes: state.incomes?.length ?? 0,
    savings: state.savings?.length ?? 0,
    fixedExpenses: state.fixedExpenses?.length ?? 0,
    targets: state.targets?.length ?? 0,
    goals: state.goals?.length ?? 0,
    tasks: state.tasks?.length ?? 0,
  };
}

export function buildBackupPrintHtml({
  backups,
  currentState,
  printedAt = new Date(),
}: BackupPrintInput): string {
  const currentCounts = countState(currentState);

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

export function printBackupReport(input: BackupPrintInput): void {
  const body = buildBackupPrintHtml(input);
  openPrintDocument('Cash Flow CFO — Backup Report', body);
}

// Exported for tests
export const _test = { escapeHtml, formatDeadline };