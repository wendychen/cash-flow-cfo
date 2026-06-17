import type { TranslationKey } from '@/i18n';
import type {
  ExpenseCategory,
  FixedExpenseCategory,
  FixedExpenseParentKey,
} from '@/types/expenseCategory';
import { EXPENSE_CATEGORIES, FIXED_EXPENSE_CATEGORIES } from '@/types/expenseCategory';

type TranslateFn = (key: TranslationKey) => string;

export const EXPENSE_CATEGORY_I18N_KEYS: Record<ExpenseCategory, TranslationKey> = {
  food: 'categories.expense.food',
  necessities: 'categories.expense.necessities',
  lifestyle: 'categories.expense.lifestyle',
  family: 'categories.expense.family',
  misc: 'categories.expense.misc',
  opex: 'categories.expense.opex',
  capex: 'categories.expense.capex',
  gna: 'categories.expense.gna',
};

export const FIXED_EXPENSE_CATEGORY_I18N_KEYS: Record<FixedExpenseCategory, TranslationKey> = {
  housing: 'categories.fixed.housing',
  'utilities-water-electric': 'categories.fixed.utilitiesWaterElectric',
  'utilities-gas': 'categories.fixed.utilitiesGas',
  'utilities-telecom': 'categories.fixed.utilitiesTelecom',
  transport: 'categories.fixed.transport',
  health: 'categories.fixed.health',
  'liabilities-debt': 'categories.fixed.liabilitiesDebt',
  'liabilities-loans': 'categories.fixed.liabilitiesLoans',
  'liabilities-installments': 'categories.fixed.liabilitiesInstallments',
  taxes: 'categories.fixed.taxes',
};

export function getExpenseCategoryLabel(
  category: ExpenseCategory,
  t: TranslateFn
): string {
  const key = EXPENSE_CATEGORY_I18N_KEYS[category];
  return key ? t(key) : EXPENSE_CATEGORIES[category]?.label ?? category;
}

export function getFixedExpenseCategoryLabel(
  category: FixedExpenseCategory,
  t: TranslateFn
): string {
  const key = FIXED_EXPENSE_CATEGORY_I18N_KEYS[category];
  return key ? t(key) : FIXED_EXPENSE_CATEGORIES[category]?.label ?? category;
}

export const FIXED_EXPENSE_GROUP_I18N_KEYS: Record<FixedExpenseParentKey, TranslationKey> = {
  utilities: 'categories.fixed.groups.utilities',
  liabilities: 'categories.fixed.groups.liabilities',
};

export function getFixedExpenseGroupLabel(
  parentKey: FixedExpenseParentKey,
  t: TranslateFn
): string {
  const key = FIXED_EXPENSE_GROUP_I18N_KEYS[parentKey];
  return key ? t(key) : parentKey;
}