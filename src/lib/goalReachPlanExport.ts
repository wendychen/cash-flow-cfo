import type { GoalReachPlanSnapshot, PlannerConflictType } from '@/lib/goalReachPlanner';

export type GoalReachPlanTranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

function esc(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escCsv(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

const CONFLICT_PRINT_KEYS: Record<PlannerConflictType, string> = {
  over_allocated_budgets: 'printReport.goalReach.conflictTypes.overAllocated',
  task_cost_exceeds_budget: 'printReport.goalReach.conflictTypes.taskCostExceedsBudget',
  deadline_cluster: 'printReport.goalReach.conflictTypes.deadlineCluster',
  funding_gap: 'printReport.goalReach.conflictTypes.fundingGap',
  overdue: 'printReport.goalReach.conflictTypes.overdue',
  simulation_shortfall: 'printReport.goalReach.conflictTypes.simulationShortfall',
};

export function buildGoalReachPlanPrintSection(
  plan: GoalReachPlanSnapshot,
  formatAmount: (amount: number) => string,
  t: GoalReachPlanTranslateFn
): string {
  if (plan.activeGoalCount === 0) return '';

  const atRiskCount = plan.goalRows.filter((r) => r.atRisk).length;
  const conflictItems =
    plan.conflicts.length > 0
      ? plan.conflicts
          .map((c) => {
            const label = t(CONFLICT_PRINT_KEYS[c.type] ?? 'printReport.goalReach.conflictTypes.unknown');
            const titles = c.goalIds
              .map((id) => plan.goalRows.find((r) => r.goalId === id)?.title)
              .filter(Boolean)
              .join(', ');
            return `<li><strong>${esc(label)}</strong>${titles ? ` — ${esc(titles)}` : ''}</li>`;
          })
          .join('')
      : `<li>${esc(t('printReport.goalReach.noConflicts'))}</li>`;

  const fundingRows = plan.monthlyFunding
    .slice(0, 12)
    .flatMap((slice) =>
      Object.entries(slice.byGoalId)
        .filter(([, amount]) => amount > 0)
        .map(([goalId, amount]) => {
          const title = plan.goalRows.find((r) => r.goalId === goalId)?.title ?? goalId;
          return `<tr><td>${esc(slice.month)}</td><td>${esc(title)}</td><td class="num">${formatAmount(amount)}</td></tr>`;
        })
    )
    .join('');

  const weeklyItems =
    plan.weeklyFocus.length > 0
      ? plan.weeklyFocus
          .map(
            (w) =>
              `<li>${esc(w.title)} (${esc(w.goalTitle)}) — ${esc(w.targetDate)}</li>`
          )
          .join('')
      : `<li>${esc(t('printReport.goalReach.noWeeklyFocus'))}</li>`;

  return `
    <section class="section">
      <h2>${esc(t('printReport.goalReach.title'))}</h2>
      <table class="counts-table">
        <tbody>
          <tr><td>${esc(t('printReport.goalReach.feasibility'))}</td><td class="num">${plan.feasibility}%</td></tr>
          <tr><td>${esc(t('printReport.goalReach.atRisk'))}</td><td class="num">${atRiskCount}</td></tr>
          <tr><td>${esc(t('printReport.goalReach.savingsGap'))}</td><td class="num">${formatAmount(plan.savingsGap)}</td></tr>
        </tbody>
      </table>
      <h3>${esc(t('printReport.goalReach.conflicts'))}</h3>
      <ul>${conflictItems}</ul>
      <h3>${esc(t('printReport.goalReach.weeklyFocus'))}</h3>
      <ul>${weeklyItems}</ul>
      <h3>${esc(t('printReport.goalReach.monthlyFunding'))}</h3>
      <table class="counts-table">
        <thead><tr><th>${esc(t('printReport.goalReach.month'))}</th><th>${esc(t('printReport.goalReach.goal'))}</th><th>${esc(t('printReport.goalReach.amount'))}</th></tr></thead>
        <tbody>${fundingRows || `<tr><td colspan="3">${esc(t('printReport.goalReach.noFunding'))}</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

export function buildGoalReachPlanCsvSection(plan: GoalReachPlanSnapshot): string {
  if (plan.activeGoalCount === 0) return '';

  let out = '### GOAL REACH PLAN ###\n';
  out += `Feasibility,${plan.feasibility}\n`;
  out += `ActiveGoals,${plan.activeGoalCount}\n`;
  out += `SavingsGap,${plan.savingsGap.toFixed(2)}\n`;
  out += `TotalFundingNeed,${plan.totalFundingNeed.toFixed(2)}\n`;

  out += '\nConflicts,Type,GoalIds\n';
  if (plan.conflicts.length === 0) {
    out += ',none,\n';
  } else {
    plan.conflicts.forEach((c, i) => {
      out += `${i + 1},${c.type},${escCsv(c.goalIds.join(';'))}\n`;
    });
  }

  out += '\nMonthlyFunding,Month,GoalId,GoalTitle,Amount\n';
  plan.monthlyFunding.slice(0, 12).forEach((slice) => {
    for (const [goalId, amount] of Object.entries(slice.byGoalId)) {
      if (amount <= 0) continue;
      const title = plan.goalRows.find((r) => r.goalId === goalId)?.title ?? '';
      out += `,${slice.month},${goalId},${escCsv(title)},${amount.toFixed(2)}\n`;
    }
  });

  out += '\nWeeklyFocus,GoalTitle,ItemTitle,Kind,TargetDate\n';
  plan.weeklyFocus.forEach((w) => {
    out += `,${escCsv(w.goalTitle)},${escCsv(w.title)},${w.kind},${w.targetDate}\n`;
  });

  return out;
}