import { format, parseISO, isValid } from 'date-fns';
import { getDateFnsLocale } from '@/lib/dateLocale';
import type { TranslationKey } from '@/i18n';
import type { Goal } from '@/types/goal';
import { isRepeatingGoal, normalizeRepeatInterval } from '@/types/goalRepeat';
import type { TaskNode, TaskType } from '@/types/task';
import type { Income } from '@/types/income';
import type { FinanceStateV2 } from '@/stores/finance/financeStore';
import type { AutoBackupEntry } from '@/lib/autoBackup';
import { migrateExpenseCategory } from '@/types/expenseCategory';
import { getExpenseCategoryLabel } from '@/lib/categoryLabels';
import { getGoalRepeatLabel } from '@/lib/goalRepeatLabels';
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

export type PrintTranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

const TASK_SECTION_KEYS: Record<TaskType, TranslationKey> = {
  pre: 'printReport.taskSection.pre',
  post: 'printReport.taskSection.post',
  dream: 'printReport.taskSection.dream',
};

const DOMAIN_KEYS: Record<string, TranslationKey> = {
  expenses: 'printReport.domains.expenses',
  incomes: 'printReport.domains.incomes',
  incomeCollections: 'printReport.domains.incomeCollections',
  savings: 'printReport.domains.savings',
  fixedExpenses: 'printReport.domains.fixedExpenses',
  targets: 'printReport.domains.targets',
  longTermFinGoal: 'printReport.domains.longTermFinGoal',
  goals: 'printReport.domains.goals',
  tasks: 'printReport.domains.tasks',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeadline(deadline: string, locale?: string): string {
  if (!deadline) return '—';
  try {
    const parsed = parseISO(deadline);
    return isValid(parsed)
      ? format(parsed, 'MMM d, yyyy', { locale: getDateFnsLocale(locale) })
      : deadline;
  } catch {
    return deadline;
  }
}

function renderTaskList(
  tasks: TaskNode[],
  goalId: string,
  taskType: TaskType,
  t: PrintTranslateFn
): string {
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
      <h4>${t(TASK_SECTION_KEYS[taskType])}</h4>
      <ul>${items}</ul>
    </div>
  `;
}

function renderGoalCard(
  goal: Goal,
  tasks: TaskNode[],
  formatAmount: AmountFormatter,
  t: PrintTranslateFn,
  locale?: string
): string {
  const categoryKey = migrateExpenseCategory(goal.category);
  const categoryLabel = getExpenseCategoryLabel(categoryKey, t);
  const budget = goal.budget > 0 ? formatAmount(goal.budget) : '—';
  const constraint = goal.constraint
    ? `<p class="meta"><strong>${t('printReport.goal.constraint')}</strong> ${escapeHtml(goal.constraint)}</p>`
    : '';
  const urls =
    goal.urlPack.length > 0
      ? `<p class="meta"><strong>${t('printReport.goal.links')}</strong> ${goal.urlPack.map((u) => escapeHtml(u)).join(', ')}</p>`
      : '';
  const ideations =
    goal.ideations.length > 0
      ? `<div class="ideations"><strong>${t('printReport.goal.ideations')}</strong><ul>${goal.ideations
          .map((i) => `<li>${escapeHtml(i.content)}</li>`)
          .join('')}</ul></div>`
      : '';

  const taskSections = (['pre', 'post', 'dream'] as TaskType[])
    .map((type) => renderTaskList(tasks, goal.id, type, t))
    .filter(Boolean)
    .join('');

  const milestoneSection =
    goal.milestones && goal.milestones.length > 0
      ? `<div class="task-section"><h4>${t('printReport.goal.milestones')}</h4><ul>${goal.milestones
          .map((m) => {
            const status = m.completed ? '✓' : '○';
            return `<li>${status} ${escapeHtml(m.title)} — ${formatDeadline(m.targetDate, locale)}</li>`;
          })
          .join('')}</ul></div>`
      : '';

  const repeatInterval = normalizeRepeatInterval(goal.repeatInterval);
  const repeatMeta = isRepeatingGoal(repeatInterval)
    ? `<span><strong>${t('printReport.goal.repeat')}</strong> ${escapeHtml(getGoalRepeatLabel(repeatInterval, t))}${goal.repeatCycle && goal.repeatCycle > 1 ? ` ${t('printReport.goal.cycle', { n: goal.repeatCycle })}` : ''}</span>
        <span><strong>${t('printReport.goal.duplicateTasks')}</strong> ${goal.repeatDuplicateTasks === false ? t('printReport.goal.no') : t('printReport.goal.yes')}</span>`
    : '';

  return `
    <article class="goal-card ${goal.completed ? 'completed' : ''}">
      <h3>${escapeHtml(goal.title)}${goal.isMagicWand ? ' ★' : ''}${goal.completed ? ` ${t('printReport.goals.completed')}` : ''}</h3>
      <p class="meta">
        <span><strong>${t('printReport.goal.deadline')}</strong> ${formatDeadline(goal.deadline, locale)}</span>
        <span><strong>${t('printReport.goal.budget')}</strong> ${budget}</span>
        <span><strong>${t('printReport.goal.category')}</strong> ${escapeHtml(categoryLabel)}</span>
        ${goal.timeCost ? `<span><strong>${t('printReport.goal.time')}</strong> ${escapeHtml(goal.timeCost)}</span>` : ''}
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
  t: PrintTranslateFn;
  locale?: string;
  longTermFinGoal?: LongTermFinGoal | null;
  currentSavings?: number;
  printedAt?: Date;
}

export function buildGoalsPrintHtml({
  goals,
  tasks,
  formatAmount,
  displayCurrency,
  t,
  locale,
  longTermFinGoal,
  currentSavings = 0,
  printedAt = new Date(),
}: GoalsPrintInput): string {
  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);
  const finGoalSection = renderFinGoalPrintSection(
    longTermFinGoal,
    currentSavings,
    formatAmount,
    t
  );

  const activeHtml =
    active.length > 0
      ? active.map((g) => renderGoalCard(g, tasks, formatAmount, t, locale)).join('')
      : `<p class="empty">${t('printReport.goals.noActiveGoals')}</p>`;

  const completedHtml =
    completed.length > 0
      ? `<section class="section"><h2>${t('printReport.goals.completedGoals', { count: completed.length })}</h2>${completed
          .map((g) => renderGoalCard(g, tasks, formatAmount, t, locale))
          .join('')}</section>`
      : '';

  const dateFnsLocale = getDateFnsLocale(locale);
  const printedDate = format(printedAt, 'PPpp', { locale: dateFnsLocale });

  return `
    <header class="report-header">
      <h1>${t('printReport.goals.title')}</h1>
      <p class="subtitle">${t('printReport.goals.printedAt', { date: printedDate, currency: escapeHtml(displayCurrency) })}</p>
      <p class="subtitle">${t('printReport.goals.summary', { active: active.length, completed: completed.length, tasks: tasks.length })}</p>
    </header>
    ${finGoalSection}
    <section class="section">
      <h2>${t('printReport.goals.activeGoals', { count: active.length })}</h2>
      ${activeHtml}
    </section>
    ${completedHtml}
  `;
}

export interface BackupPrintInput {
  backups: AutoBackupEntry[];
  currentState: FinanceStateV2;
  t: PrintTranslateFn;
  locale?: string;
  printedAt?: Date;
}

function getLatestSavingsBalanceFromState(savings: Saving[] = []): number {
  const balanceSavings = savings.filter((s) => s.savingType === 'balance');
  if (balanceSavings.length === 0) return 0;
  return balanceSavings.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0].amount;
}

function formatFinGoalTargetLabel(
  goal: LongTermFinGoal,
  formatAmount: AmountFormatter,
  t: PrintTranslateFn
): string {
  const preset =
    (goal.presetKey && getFinGoalPresetByKey(goal.presetKey)) ||
    getFinGoalPresetByAmount(goal.targetAmount);
  if (preset) return t(preset.labelKey);
  return formatAmount(goal.targetAmount);
}

function renderFinGoalPrintSection(
  goal: LongTermFinGoal | null | undefined,
  currentSavings: number,
  formatAmount: AmountFormatter,
  t: PrintTranslateFn
): string {
  if (!goal || goal.targetAmount <= 0) return '';

  const progress = computeFinGoalProgress(currentSavings, goal.targetAmount);
  const yearsLeft = getFinGoalYearsRemaining(goal.endYear);
  const targetLabel = formatFinGoalTargetLabel(goal, formatAmount, t);
  const presetLabel = goal.presetKey
    ? formatFinGoalTargetLabel(goal, formatAmount, t)
    : t('printReport.finGoal.custom');

  return `
    <section class="section">
      <h2>${t('printReport.finGoal.title')}</h2>
      <table class="counts-table fin-goal-table">
        <tbody>
          <tr><td>${t('printReport.finGoal.target')}</td><td class="num">${escapeHtml(targetLabel)} (${formatAmount(goal.targetAmount)})</td></tr>
          <tr><td>${t('printReport.finGoal.endYear')}</td><td class="num">${goal.endYear}</td></tr>
          <tr><td>${t('printReport.finGoal.yearsRemaining')}</td><td class="num">${yearsLeft}</td></tr>
          <tr><td>${t('printReport.finGoal.currentSavings')}</td><td class="num">${formatAmount(currentSavings)}</td></tr>
          <tr><td>${t('printReport.finGoal.progress')}</td><td class="num">${progress}%</td></tr>
          <tr><td>${t('printReport.finGoal.preset')}</td><td>${escapeHtml(presetLabel)}</td></tr>
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

function formatIncomeDate(dateStr: string, locale?: string): string {
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed)
      ? format(parsed, 'MMM d, yyyy', { locale: getDateFnsLocale(locale) })
      : dateStr;
  } catch {
    return dateStr;
  }
}

function renderIncomePrintSection(
  incomes: Income[],
  formatAmount: AmountFormatter,
  t: PrintTranslateFn,
  locale?: string
): string {
  if (incomes.length === 0) return '';

  const split = computeSankeyIncomeSplit(incomes);
  const accruedEntries = incomes
    .filter((inc) => inc.incomeType === 'accrued')
    .sort((a, b) => b.date.localeCompare(a.date));
  const collectionEntries = incomes
    .filter((inc) => isAccruedCollection(inc))
    .sort((a, b) => b.date.localeCompare(a.date));

  const summaryRows = [
    [t('printReport.income.directCash'), split.directCash],
    [t('printReport.income.collections'), split.collections],
    [t('printReport.income.outstandingAccrued'), split.accruedOutstanding],
    [t('printReport.income.total'), split.total],
  ]
    .map(
      ([label, amount]) =>
        `<tr><td>${escapeHtml(label as string)}</td><td class="num">${formatAmount(amount as number)}</td></tr>`
    )
    .join('');

  const accruedRows =
    accruedEntries.length > 0
      ? accruedEntries
          .map((accrued) => {
            const status = getAccruedCollectionStatus(accrued, incomes);
            const statusLabel = status.isFullyCollected
              ? t('printReport.income.fullyCollected')
              : t('printReport.income.percentCollected', { percent: status.percentCollected });
            return `<tr>
              <td>${formatIncomeDate(accrued.date, locale)}</td>
              <td>${escapeHtml(accrued.source)}</td>
              <td class="num">${formatAmount(accrued.amount)}</td>
              <td class="num">${formatAmount(status.collected)}</td>
              <td class="num">${formatAmount(status.outstanding)}</td>
              <td>${statusLabel}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="6" class="empty">${t('printReport.income.noAccrued')}</td></tr>`;

  const collectionRows =
    collectionEntries.length > 0
      ? collectionEntries
          .map((collection) => {
            const linked = collection.linkedAccruedIncomeId
              ? incomes.find((inc) => inc.id === collection.linkedAccruedIncomeId)
              : undefined;
            const linkedLabel = linked ? escapeHtml(linked.source) : '—';
            return `<tr>
              <td>${formatIncomeDate(collection.date, locale)}</td>
              <td>${escapeHtml(collection.source)}</td>
              <td>${linkedLabel}</td>
              <td class="num">${formatAmount(collection.amount)}</td>
              <td>${escapeHtml(collection.note ?? '')}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="5" class="empty">${t('printReport.income.noCollections')}</td></tr>`;

  return `
    <section class="section">
      <h2>${t('printReport.income.title')}</h2>
      <table class="counts-table income-summary-table">
        <thead><tr><th>${t('printReport.income.category')}</th><th>${t('printReport.income.amount')}</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>

      <h3>${t('printReport.income.accruedIncome')}</h3>
      <table class="income-table">
        <thead>
          <tr>
            <th>${t('printReport.income.date')}</th>
            <th>${t('printReport.income.source')}</th>
            <th>${t('printReport.income.accrued')}</th>
            <th>${t('printReport.income.collected')}</th>
            <th>${t('printReport.income.outstanding')}</th>
            <th>${t('printReport.income.status')}</th>
          </tr>
        </thead>
        <tbody>${accruedRows}</tbody>
      </table>

      <h3>${t('printReport.income.cashCollections')}</h3>
      <table class="income-table">
        <thead>
          <tr>
            <th>${t('printReport.income.date')}</th>
            <th>${t('printReport.income.source')}</th>
            <th>${t('printReport.income.fromAccrued')}</th>
            <th>${t('printReport.income.amount')}</th>
            <th>${t('printReport.income.note')}</th>
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
    t,
    locale,
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
    formatAmount,
    t
  );
  const incomeSection = renderIncomePrintSection(
    currentState.incomes ?? [],
    formatAmount,
    t,
    locale
  );

  const dateFnsLocale = getDateFnsLocale(locale);
  const backupRows =
    backups.length > 0
      ? backups
          .map((entry, index) => {
            const counts = countState(entry.data);
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const saved = format(new Date(entry.savedAt), 'PPpp', { locale: dateFnsLocale });
            const slotLabel =
              index === 0 ? t('printReport.backup.latest') : t('printReport.backup.slotNumber', { n: index + 1 });
            return `<tr>
              <td>${slotLabel}</td>
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
      : `<tr><td colspan="8" class="empty">${t('printReport.backup.noBackups')}</td></tr>`;

  const printedDate = format(printedAt, 'PPpp', { locale: dateFnsLocale });
  const snapshotInfo =
    backups.length === 1
      ? t('printReport.backup.snapshotInfoOne')
      : t('printReport.backup.snapshotInfoPlural', { count: backups.length });

  return `
    <header class="report-header">
      <h1>${t('printReport.backup.title')}</h1>
      <p class="subtitle">${t('printReport.backup.printedAt', { date: printedDate })}</p>
      <p class="subtitle">${snapshotInfo}</p>
    </header>

    <section class="section">
      <h2>${t('printReport.backup.currentData')}</h2>
      <table class="counts-table">
        <thead><tr><th>${t('printReport.backup.domain')}</th><th>${t('printReport.backup.records')}</th></tr></thead>
        <tbody>
          ${Object.entries(currentCounts)
            .map(([key, value]) => {
              const labelKey = DOMAIN_KEYS[key];
              const label = labelKey ? t(labelKey) : escapeHtml(key);
              return `<tr><td>${escapeHtml(label)}</td><td class="num">${value}</td></tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </section>

    ${finGoalSection}

    ${incomeSection}

    <section class="section">
      <h2>${t('printReport.backup.history')}</h2>
      <table class="backup-table">
        <thead>
          <tr>
            <th>${t('printReport.backup.slot')}</th>
            <th>${t('printReport.backup.savedAt')}</th>
            <th>${t('printReport.backup.goals')}</th>
            <th>${t('printReport.backup.tasks')}</th>
            <th>${t('printReport.backup.expenses')}</th>
            <th>${t('printReport.backup.income')}</th>
            <th>${t('printReport.backup.savings')}</th>
            <th>${t('printReport.backup.total')}</th>
          </tr>
        </thead>
        <tbody>${backupRows}</tbody>
      </table>
    </section>

    <section class="section notes">
      <h2>${t('printReport.backup.notesTitle')}</h2>
      <ul>
        <li>${t('printReport.backup.noteExportJson')}</li>
        <li>${t('printReport.backup.noteLocalStorage')}</li>
        <li>${t('printReport.backup.noteRestore')}</li>
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

function resolveHtmlLang(locale?: string): string {
  if (locale === 'zh-TW') return 'zh-Hant';
  if (locale === 'ja') return 'ja';
  return 'en';
}

export function wrapPrintDocument(title: string, bodyHtml: string, locale?: string): string {
  const lang = resolveHtmlLang(locale);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** Open a print-friendly document in a new window and trigger the browser print dialog. */
export function openPrintDocument(
  title: string,
  bodyHtml: string,
  options: { locale?: string; popUpBlocked?: string } = {}
): void {
  const html = wrapPrintDocument(title, bodyHtml, options.locale);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) {
    alert(options.popUpBlocked ?? 'Please allow pop-ups to print this report.');
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
  openPrintDocument(input.t('printReport.goals.title'), body, {
    locale: input.locale,
    popUpBlocked: input.t('printReport.popUpBlocked'),
  });
}

export function printBackupReport(
  input: BackupPrintInput,
  options: BackupPrintOptions = {}
): void {
  const body = buildBackupPrintHtml(input, options);
  openPrintDocument(input.t('printReport.backup.title'), body, {
    locale: input.locale,
    popUpBlocked: input.t('printReport.popUpBlocked'),
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    str
  );
}

/** Resolve English labels for unit tests. */
export function createTestPrintT(messages: Record<string, unknown> = {}): PrintTranslateFn {
  return (key, params) => {
    const value = getNestedValue(messages as Record<string, unknown>, key);
    return value ? interpolate(value, params) : key;
  };
}

// Exported for tests
export const _test = { escapeHtml, formatDeadline, createTestPrintT };