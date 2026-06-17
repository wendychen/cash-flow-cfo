export const en = {
  app: {
    title: 'Cash Flow CFO',
    subtitle: 'Personal cash flow and goal planning',
  },
  nav: {
    guide: 'Guide',
    exportJson: 'Export JSON',
    importData: 'Import JSON/CSV',
    reload: 'Reload',
    reset: 'Reset All Data',
    displayCurrency: 'Display currency',
  },
  summary: {
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    savings: 'Savings',
    activeGoals: 'Active Goals',
    totalTasks: '{count} total tasks',
  },
  tabs: {
    income: 'Income',
    expenses: 'Expenses',
    savings: 'Savings',
    goals: 'Goals & Tasks',
  },
  charts: {
    visualizations: 'Cash Flow Visualizations',
    visualizationsHint: 'Sankey and overview charts update when you change the period on the left',
    overview: 'Overview Charts (Summary)',
    simulator: 'Cash Flow Simulator',
    simulatorHint: 'What-if scenario based on monthly averages',
  },
  simulator: {
    incomeChange: 'Monthly income change',
    expenseChange: 'Monthly expense change',
    horizon: 'Projection horizon',
    months: '{count} months',
    endingSavings: 'Projected savings',
    vsBaseline: 'vs baseline',
  },
  timeNav: {
    title: 'Time Navigator',
    expandAll: 'Expand All',
    selected: 'Selected:',
    clear: 'Clear selection',
    yearRange: '{start}–{end}',
  },
  goals: {
    export: 'Export goal',
    import: 'Import goal',
    importSuccess: 'Goal imported successfully.',
    importFailed: 'Import failed: {error}',
  },
  language: {
    label: 'Language',
    en: 'English',
    zh: '繁體中文',
    ja: '日本語',
  },
} as const;

export type Messages = typeof en;