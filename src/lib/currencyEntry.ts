import type { Currency } from '@/hooks/use-currency';

/** Default display currency for the app UI */
export const DEFAULT_DISPLAY_CURRENCY: Currency = 'USD';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NTD: 'NT$',
  USD: '$',
  CAD: 'CA$',
};

export interface StoredAmountFields {
  amount: number;
  originalAmount?: number;
  originalCurrency?: Currency;
}

/**
 * Convert user input to NTD storage amount.
 * Preserves original amount/currency when entry was not in the display default (USD).
 */
export function buildStoredAmountFields(
  parsedAmount: number,
  inputCurrency: Currency,
  convertToNTD: (amount: number, fromCurrency: Currency) => number
): StoredAmountFields {
  const amount = convertToNTD(parsedAmount, inputCurrency);

  if (inputCurrency === DEFAULT_DISPLAY_CURRENCY) {
    return {
      amount,
      originalAmount: undefined,
      originalCurrency: undefined,
    };
  }

  return {
    amount,
    originalAmount: parsedAmount,
    originalCurrency: inputCurrency,
  };
}

/** Values for inline edit — prefer stored original when present. */
export function getEditAmountAndCurrency(
  entry: { amount: number; originalAmount?: number; originalCurrency?: Currency },
  displayCurrency: Currency,
  convertFromNTD: (amountInNTD: number, toCurrency: Currency) => number
): { amount: string; currency: Currency } {
  if (entry.originalAmount !== undefined && entry.originalCurrency) {
    const decimals = entry.originalCurrency === 'NTD' ? 0 : 2;
    return {
      amount: entry.originalAmount.toFixed(decimals),
      currency: entry.originalCurrency,
    };
  }

  const decimals = displayCurrency === 'NTD' ? 0 : 2;
  return {
    amount: convertFromNTD(entry.amount, displayCurrency).toFixed(decimals),
    currency: displayCurrency,
  };
}

export function shouldShowOriginalCurrencyBadge(
  originalCurrency?: Currency
): originalCurrency is Currency {
  return (
    !!originalCurrency &&
    originalCurrency !== DEFAULT_DISPLAY_CURRENCY &&
    originalCurrency !== undefined
  );
}

export function formatOriginalAmount(amount: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const decimals = currency === 'NTD' ? 0 : 2;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sym}${formatted}`;
}