import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFinance } from './useFinance';
import { useFinanceStore } from './financeStore';
import { resetFinanceStore } from '@/test/helpers/storeTestUtils';
import { buildMonthPeriod } from '@/lib/date';
import type { TimePeriod } from '@/types/timePeriod';

function april2026Period(): TimePeriod {
  const bounds = buildMonthPeriod(2026, 3);
  return {
    type: 'month',
    year: 2026,
    quarter: 2,
    month: 4,
    label: 'April 2026',
    startDate: bounds.startDate,
    endDate: bounds.endDate,
  };
}

describe('useFinance', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
    useFinanceStore.getState().addExpense({
      date: '2026-04-30',
      description: 'End of April',
      amount: 100,
      timeCost: '',
      needsCheck: false,
      category: 'misc',
    });
  });

  it('includes 4/30 expense when period is selected', () => {
    const { result } = renderHook(() => useFinance(april2026Period()));
    expect(result.current.filteredExpenses.some((e) => e.date === '2026-04-30')).toBe(true);
  });

  it('updates filtered expenses when period changes without remounting', () => {
    const { result, rerender } = renderHook(
      ({ period }: { period: TimePeriod | null }) => useFinance(period),
      { initialProps: { period: null as TimePeriod | null } }
    );

    expect(result.current.filteredExpenses.some((e) => e.date === '2026-04-30')).toBe(true);

    const march = buildMonthPeriod(2026, 2);
    const marchPeriod: TimePeriod = {
      type: 'month',
      year: 2026,
      quarter: 1,
      month: 3,
      label: 'March 2026',
      startDate: march.startDate,
      endDate: march.endDate,
    };

    rerender({ period: marchPeriod });
    expect(result.current.filteredExpenses.some((e) => e.date === '2026-04-30')).toBe(false);

    rerender({ period: april2026Period() });
    expect(result.current.filteredExpenses.some((e) => e.date === '2026-04-30')).toBe(true);
  });
});