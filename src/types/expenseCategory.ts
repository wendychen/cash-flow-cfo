export type ExpenseCategory =
  | 'food'
  | 'lifestyle'
  | 'family'
  | 'misc'
  | 'opex'
  | 'capex'
  | 'gna';

export type FixedExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'transportation'
  | 'health'
  | 'financial-obligations'
  | 'taxes';

export interface CategoryMetadata {
  label: string;
  color: string;
  icon: string;
  description: string;
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
  utilities: {
    label: 'Utilities',
    color: 'yellow-600',
    icon: 'Zap',
    description: 'Electricity, water, gas, and internet',
  },
  transportation: {
    label: 'Transportation',
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
  'financial-obligations': {
    label: 'Financial Obligations',
    color: 'orange-600',
    icon: 'CreditCard',
    description: 'Loans, credit cards, and debt payments',
  },
  taxes: {
    label: 'Taxes',
    color: 'gray-600',
    icon: 'FileText',
    description: 'Income tax, property tax, and other taxes',
  },
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
