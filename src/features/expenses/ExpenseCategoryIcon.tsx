import {
  UtensilsCrossed,
  Sparkles,
  Users,
  Package,
  Repeat,
  TrendingUp,
  Building2,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '@/types/expenseCategory';
import { migrateExpenseCategory } from '@/types/expenseCategory';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBasket,
  Sparkles,
  Users,
  Package,
  Repeat,
  TrendingUp,
  Building2,
};

interface ExpenseCategoryIconProps {
  category: ExpenseCategory | string | undefined;
  className?: string;
}

export function ExpenseCategoryIcon({ category, className }: ExpenseCategoryIconProps) {
  const key = migrateExpenseCategory(category);
  const meta = EXPENSE_CATEGORIES[key];
  const Icon = ICON_MAP[meta.icon] ?? Package;
  return <Icon className={cn('h-4 w-4', className)} />;
}