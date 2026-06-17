export type SankeyDrillLevel =
  | 'overview'
  | 'income-detail'
  | 'savings-detail'
  | 'goal-detail'
  | 'expense-detail'
  | 'expense-categories-split'
  | 'fixed-expense-categories'
  | 'onetime-expense-categories';

import type { TranslationKey } from '@/i18n';

export interface SankeyBreadcrumbStep {
  level: SankeyDrillLevel;
  labelKey: TranslationKey;
}

const PARENT: Partial<Record<SankeyDrillLevel, SankeyDrillLevel>> = {
  'income-detail': 'overview',
  'savings-detail': 'overview',
  'goal-detail': 'overview',
  'expense-detail': 'overview',
  'expense-categories-split': 'expense-detail',
  'fixed-expense-categories': 'expense-detail',
  'onetime-expense-categories': 'expense-detail',
};

export const SANKEY_BREADCRUMB_KEYS: Record<SankeyDrillLevel, TranslationKey> = {
  overview: 'sankey.breadcrumb.overview',
  'income-detail': 'sankey.breadcrumb.income',
  'savings-detail': 'sankey.breadcrumb.savings',
  'goal-detail': 'sankey.breadcrumb.goals',
  'expense-detail': 'sankey.breadcrumb.expenses',
  'expense-categories-split': 'sankey.breadcrumb.categories',
  'fixed-expense-categories': 'sankey.breadcrumb.fixedCategories',
  'onetime-expense-categories': 'sankey.breadcrumb.onetimeCategories',
};

/** Clickable overview nodes and their drill-down targets. */
export const SANKEY_OVERVIEW_DRILL: Partial<Record<string, SankeyDrillLevel>> = {
  income: 'income-detail',
  savings: 'savings-detail',
  goals: 'goal-detail',
  expenses: 'expense-detail',
};

export const SANKEY_EXPENSE_DETAIL_DRILL: Partial<Record<string, SankeyDrillLevel>> = {
  fixed: 'expense-categories-split',
  onetime: 'expense-categories-split',
};

export function getSankeyBreadcrumb(level: SankeyDrillLevel): SankeyBreadcrumbStep[] {
  const trail: SankeyBreadcrumbStep[] = [];
  let current: SankeyDrillLevel | undefined = level;

  while (current) {
    trail.unshift({ level: current, labelKey: SANKEY_BREADCRUMB_KEYS[current] });
    current = PARENT[current];
  }

  return trail;
}

export function getSankeyParentLevel(level: SankeyDrillLevel): SankeyDrillLevel {
  return PARENT[level] ?? 'overview';
}

export function resolveSankeyDrill(
  currentLevel: SankeyDrillLevel,
  nodeId: string
): SankeyDrillLevel | null {
  if (currentLevel === 'overview') {
    return SANKEY_OVERVIEW_DRILL[nodeId] ?? null;
  }
  if (currentLevel === 'expense-detail') {
    return SANKEY_EXPENSE_DETAIL_DRILL[nodeId] ?? null;
  }
  return null;
}