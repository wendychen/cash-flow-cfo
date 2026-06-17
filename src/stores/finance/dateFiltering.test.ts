import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore } from './financeStore';
import { resetFinanceStore } from '@/test/helpers/storeTestUtils';
import { buildMonthPeriod, buildQuarterPeriod, getWeeksInMonth } from '@/lib/date';

describe('store date filtering (P0 date engine)', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
    useFinanceStore.getState().addExpense({
      date: '2026-03-27',
      description: 'Test 03/27',
      amount: 100,
      timeCost: '',
      needsCheck: false,
      category: 'misc',
    });
    useFinanceStore.getState().addExpense({
      date: '2026-03-28',
      description: 'Test 03/28',
      amount: 200,
      timeCost: '',
      needsCheck: false,
      category: 'misc',
    });
    useFinanceStore.getState().addExpense({
      date: '2026-04-30',
      description: 'Test 4/30',
      amount: 300,
      timeCost: '',
      needsCheck: false,
      category: 'misc',
    });
  });

  it('shows 03/27 and 03/28 in March 2026', () => {
    const march = buildMonthPeriod(2026, 2);
    const dates = useFinanceStore.getState().getFilteredExpenses(march).map((e) => e.date);
    expect(dates).toContain('2026-03-27');
    expect(dates).toContain('2026-03-28');
  });

  it('shows 03/28 in March W4', () => {
    const w4 = getWeeksInMonth(2026, 2).find((w) => w.week === 4)!;
    const dates = useFinanceStore.getState().getFilteredExpenses(w4).map((e) => e.date);
    expect(dates).toContain('2026-03-28');
  });

  it('shows 4/30 in April, Q2, and April W5', () => {
    const store = useFinanceStore.getState();
    const april = buildMonthPeriod(2026, 3);
    const q2 = buildQuarterPeriod(2026, 1);
    const w5 = getWeeksInMonth(2026, 3).find((w) => w.week === 5)!;

    expect(store.getFilteredExpenses(april).some((e) => e.date === '2026-04-30')).toBe(true);
    expect(store.getFilteredExpenses(q2).some((e) => e.date === '2026-04-30')).toBe(true);
    expect(store.getFilteredExpenses(w5).some((e) => e.date === '2026-04-30')).toBe(true);
  });
});