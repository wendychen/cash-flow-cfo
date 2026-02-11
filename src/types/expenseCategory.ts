export type ExpenseCategory =
  | 'food'
  | 'lifestyle'
  | 'family'
  | 'misc'
  | 'opex'
  | 'capex'
  | 'gna';

/** Leaf categories for fixed expenses (2-level: some have parent grouping) */
export type FixedExpenseCategory =
  | 'housing'
  | 'utilities-water-electric'
  | 'utilities-gas'
  | 'utilities-telecom'
  | 'transport'
  | 'health'
  | 'liabilities-debt'
  | 'liabilities-loans'
  | 'liabilities-installments'
  | 'taxes';

export interface CategoryMetadata {
  label: string;
  color: string;
  icon: string;
  description: string;
}

/** Parent label for grouping (level 1) */
export type FixedExpenseParentKey = 'utilities' | 'liabilities';

export interface FixedExpenseCategoryGroup {
  parentLabel?: string;
  parentKey?: FixedExpenseParentKey;
  categories: { key: FixedExpenseCategory; meta: CategoryMetadata }[];
}

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, CategoryMetadata> = {
  food: {
    label: 'Food',
    color: 'text-emerald-500',
    icon: 'UtensilsCrossed',
    description: 'Meals, groceries, and dining expenses',
  },
  lifestyle: {
    label: 'Lifestyle',
    color: 'text-pink-500',
    icon: 'Sparkles',
    description: 'Entertainment, hobbies, and personal interests',
  },
  family: {
    label: 'Family',
    color: 'text-cyan-500',
    icon: 'Users',
    description: 'Family-related expenses and activities',
  },
  misc: {
    label: 'Misc',
    color: 'text-slate-500',
    icon: 'Package',
    description: 'Other uncategorized expenses',
  },
  opex: {
    label: 'OPEX',
    color: 'text-blue-500',
    icon: 'Repeat',
    description: 'Operating Expenses - recurring costs for business operations',
  },
  capex: {
    label: 'CAPEX',
    color: 'text-purple-500',
    icon: 'TrendingUp',
    description: 'Capital Expenditures - long-term assets and investments',
  },
  gna: {
    label: 'G&A',
    color: 'text-orange-500',
    icon: 'Building2',
    description: 'General & Administrative - overhead and support costs',
  },
};

export const FIXED_EXPENSE_CATEGORIES: Record<FixedExpenseCategory, CategoryMetadata> = {
  housing: {
    label: 'Housing',
    color: 'red-600',
    icon: 'Home',
    description: 'Rent, mortgage, and housing costs',
  },
  'utilities-water-electric': {
    label: 'Water & Electric',
    color: 'yellow-600',
    icon: 'Zap',
    description: 'Water and electricity bills',
  },
  'utilities-gas': {
    label: 'Gas',
    color: 'amber-600',
    icon: 'Flame',
    description: 'Gas utilities',
  },
  'utilities-telecom': {
    label: 'Telecom',
    color: 'lime-600',
    icon: 'Phone',
    description: 'Phone, internet, and telecom services',
  },
  transport: {
    label: 'Transport',
    color: 'blue-600',
    icon: 'Car',
    description: 'Car payments, fuel, and public transit',
  },
  health: {
    label: 'Health',
    color: 'green-600',
    icon: 'Heart',
    description: 'Insurance, medical bills, and wellness',
  },
  'liabilities-debt': {
    label: 'Debt',
    color: 'orange-600',
    icon: 'CreditCard',
    description: 'Credit card and debt payments',
  },
  'liabilities-loans': {
    label: 'Loans',
    color: 'orange-700',
    icon: 'Landmark',
    description: 'Loan repayments',
  },
  'liabilities-installments': {
    label: 'Installments',
    color: 'orange-800',
    icon: 'Calendar',
    description: 'Installment payments',
  },
  taxes: {
    label: 'Taxes',
    color: 'gray-600',
    icon: 'FileText',
    description: 'Income tax, property tax, and other taxes',
  },
};

/** Grouped structure for 2-level UI (parent headers + leaf items) */
export const FIXED_EXPENSE_CATEGORY_GROUPS: FixedExpenseCategoryGroup[] = [
  {
    categories: [{ key: 'housing', meta: FIXED_EXPENSE_CATEGORIES.housing }],
  },
  {
    parentLabel: 'Utilities',
    parentKey: 'utilities',
    categories: [
      { key: 'utilities-water-electric', meta: FIXED_EXPENSE_CATEGORIES['utilities-water-electric'] },
      { key: 'utilities-gas', meta: FIXED_EXPENSE_CATEGORIES['utilities-gas'] },
      { key: 'utilities-telecom', meta: FIXED_EXPENSE_CATEGORIES['utilities-telecom'] },
    ],
  },
  {
    categories: [{ key: 'transport', meta: FIXED_EXPENSE_CATEGORIES.transport }],
  },
  {
    categories: [{ key: 'health', meta: FIXED_EXPENSE_CATEGORIES.health }],
  },
  {
    parentLabel: 'Liabilities',
    parentKey: 'liabilities',
    categories: [
      { key: 'liabilities-debt', meta: FIXED_EXPENSE_CATEGORIES['liabilities-debt'] },
      { key: 'liabilities-loans', meta: FIXED_EXPENSE_CATEGORIES['liabilities-loans'] },
      { key: 'liabilities-installments', meta: FIXED_EXPENSE_CATEGORIES['liabilities-installments'] },
    ],
  },
  {
    categories: [{ key: 'taxes', meta: FIXED_EXPENSE_CATEGORIES.taxes }],
  },
];

/** Map old category values to new (for import/migration) */
export const FIXED_EXPENSE_CATEGORY_MIGRATION: Record<string, FixedExpenseCategory> = {
  housing: 'housing',
  utilities: 'utilities-water-electric',
  transportation: 'transport',
  transport: 'transport',
  health: 'health',
  'financial-obligations': 'liabilities-debt',
  taxes: 'taxes',
};

export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES[category].label;
}

export function getFixedExpenseCategoryLabel(category: FixedExpenseCategory): string {
  return FIXED_EXPENSE_CATEGORIES[category].label;
}

export function getExpenseCategoryColor(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES[category].color;
}

export function getFixedExpenseCategoryColor(category: FixedExpenseCategory): string {
  return FIXED_EXPENSE_CATEGORIES[category].color;
}

export function getExpenseCategoryIcon(category: ExpenseCategory): string {
  return EXPENSE_CATEGORIES[category].icon;
}

export function getFixedExpenseCategoryIcon(category: FixedExpenseCategory): string {
  return FIXED_EXPENSE_CATEGORIES[category].icon;
}

/** Migrate old category to new schema; returns valid FixedExpenseCategory */
export function migrateFixedExpenseCategory(category: string | undefined): FixedExpenseCategory {
  if (!category) return 'housing';
  const migrated = FIXED_EXPENSE_CATEGORY_MIGRATION[category];
  if (migrated) return migrated;
  if (Object.keys(FIXED_EXPENSE_CATEGORIES).includes(category)) return category as FixedExpenseCategory;
  return 'housing';
}
