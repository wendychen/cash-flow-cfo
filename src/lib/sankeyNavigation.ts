export type SankeyDrillLevel =
  | 'overview'
  | 'income-detail'
  | 'savings-detail'
  | 'goal-detail'
  | 'expense-detail'
  | 'fixed-expense-categories'
  | 'onetime-expense-categories';

export interface SankeyBreadcrumbStep {
  level: SankeyDrillLevel;
  label: string;
}

const PARENT: Partial<Record<SankeyDrillLevel, SankeyDrillLevel>> = {
  'income-detail': 'overview',
  'savings-detail': 'overview',
  'goal-detail': 'overview',
  'expense-detail': 'overview',
  'fixed-expense-categories': 'expense-detail',
  'onetime-expense-categories': 'expense-detail',
};

const LABELS: Record<SankeyDrillLevel, string> = {
  overview: 'Overview',
  'income-detail': 'Income',
  'savings-detail': 'Savings',
  'goal-detail': 'Goals',
  'expense-detail': 'Expenses',
  'fixed-expense-categories': 'Fixed Categories',
  'onetime-expense-categories': 'One-Time Categories',
};

/** Clickable overview nodes and their drill-down targets. */
export const SANKEY_OVERVIEW_DRILL: Partial<Record<string, SankeyDrillLevel>> = {
  income: 'income-detail',
  savings: 'savings-detail',
  goals: 'goal-detail',
  expenses: 'expense-detail',
};

export const SANKEY_EXPENSE_DETAIL_DRILL: Partial<Record<string, SankeyDrillLevel>> = {
  fixed: 'fixed-expense-categories',
  onetime: 'onetime-expense-categories',
};

export function getSankeyBreadcrumb(level: SankeyDrillLevel): SankeyBreadcrumbStep[] {
  const trail: SankeyBreadcrumbStep[] = [];
  let current: SankeyDrillLevel | undefined = level;

  while (current) {
    trail.unshift({ level: current, label: LABELS[current] });
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