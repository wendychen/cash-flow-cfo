import { describe, expect, it } from 'vitest';
import {
  getSankeyBreadcrumb,
  getSankeyParentLevel,
  resolveSankeyDrill,
} from './sankeyNavigation';

describe('sankeyNavigation', () => {
  it('builds breadcrumb from overview to nested category', () => {
    expect(getSankeyBreadcrumb('fixed-expense-categories')).toEqual([
      { level: 'overview', label: 'Overview' },
      { level: 'expense-detail', label: 'Expenses' },
      { level: 'fixed-expense-categories', label: 'Fixed Categories' },
    ]);
  });

  it('returns parent level for back navigation', () => {
    expect(getSankeyParentLevel('onetime-expense-categories')).toBe('expense-detail');
    expect(getSankeyParentLevel('income-detail')).toBe('overview');
  });

  it('resolves overview node clicks', () => {
    expect(resolveSankeyDrill('overview', 'savings')).toBe('savings-detail');
    expect(resolveSankeyDrill('overview', 'income')).toBe('income-detail');
    expect(resolveSankeyDrill('overview', 'unknown')).toBeNull();
  });

  it('resolves expense detail node clicks to split category view', () => {
    expect(resolveSankeyDrill('expense-detail', 'fixed')).toBe('expense-categories-split');
    expect(resolveSankeyDrill('expense-detail', 'onetime')).toBe('expense-categories-split');
  });

  it('builds breadcrumb for split category view', () => {
    expect(getSankeyBreadcrumb('expense-categories-split')).toEqual([
      { level: 'overview', label: 'Overview' },
      { level: 'expense-detail', label: 'Expenses' },
      { level: 'expense-categories-split', label: 'Categories' },
    ]);
  });
});