import { describe, it, expect } from 'vitest';
import {
  buildStoredAmountFields,
  DEFAULT_DISPLAY_CURRENCY,
  formatOriginalAmount,
  getEditAmountAndCurrency,
  shouldShowOriginalCurrencyBadge,
} from './currencyEntry';

const convertToNTD = (amount: number, from: 'NTD' | 'USD' | 'CAD') => {
  const rates = { NTD: 1, USD: 32.26, CAD: 23.26 };
  return amount * rates[from];
};

const convertFromNTD = (amount: number, to: 'NTD' | 'USD' | 'CAD') => {
  const rates = { NTD: 1, USD: 0.031, CAD: 0.043 };
  return amount * rates[to];
};

describe('currencyEntry', () => {
  it('uses USD as default display currency', () => {
    expect(DEFAULT_DISPLAY_CURRENCY).toBe('USD');
  });

  it('stores original fields when input is not USD', () => {
    const result = buildStoredAmountFields(1200, 'NTD', convertToNTD);
    expect(result.originalAmount).toBe(1200);
    expect(result.originalCurrency).toBe('NTD');
    expect(result.amount).toBe(1200);
  });

  it('omits original fields when input is USD', () => {
    const result = buildStoredAmountFields(50, 'USD', convertToNTD);
    expect(result.originalAmount).toBeUndefined();
    expect(result.originalCurrency).toBeUndefined();
    expect(result.amount).toBeCloseTo(1613, 0);
  });

  it('shows badge only for non-USD original currency', () => {
    expect(shouldShowOriginalCurrencyBadge('NTD')).toBe(true);
    expect(shouldShowOriginalCurrencyBadge('CAD')).toBe(true);
    expect(shouldShowOriginalCurrencyBadge('USD')).toBe(false);
    expect(shouldShowOriginalCurrencyBadge(undefined)).toBe(false);
  });

  it('formats original amounts with symbols', () => {
    expect(formatOriginalAmount(1200, 'NTD')).toBe('NT$1,200');
    expect(formatOriginalAmount(12.5, 'CAD')).toBe('CA$12.50');
  });

  it('prefers stored original values in edit mode', () => {
    const edit = getEditAmountAndCurrency(
      { amount: 1200, originalAmount: 1200, originalCurrency: 'NTD' },
      'USD',
      convertFromNTD
    );
    expect(edit.currency).toBe('NTD');
    expect(edit.amount).toBe('1200');
  });
});