import { Currency } from '@/hooks/use-currency';
import { Saving } from '@/types/saving';
import { FinancialTarget } from '@/types/target';

const EXCHANGE_RATES: Record<Currency, number> = {
  NTD: 1,
  USD: 0.031,
  CAD: 0.043,
};

const TO_NTD_RATES: Record<Currency, number> = {
  NTD: 1,
  USD: 32.26,
  CAD: 23.26,
};

export function convertToNTD(amount: number, fromCurrency: Currency): number {
  return amount * TO_NTD_RATES[fromCurrency];
}

export function convertFromNTD(amountInNTD: number, toCurrency: Currency): number {
  return amountInNTD * EXCHANGE_RATES[toCurrency];
}

export function syncSavingsGoalFromTarget(
  savings: Saving[],
  amountInDisplayCurrency: number,
  currency: Currency
): Saving[] {
  const amountInNTD = convertToNTD(amountInDisplayCurrency, currency);
  const today = new Date().toISOString().split('T')[0];
  const goalSavings = savings.filter((s) => s.savingType === 'goal');
  const latestGoal = goalSavings.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  if (latestGoal) {
    return savings.map((s) =>
      s.id === latestGoal.id ? { ...s, amount: amountInNTD } : s
    );
  }

  return [
    {
      id: crypto.randomUUID(),
      date: today,
      amount: amountInNTD,
      savingType: 'goal' as const,
      note: 'Savings goal',
    },
    ...savings,
  ];
}

export function shouldSyncTargetFromSaving(
  existing: Saving | undefined,
  updates: Partial<Omit<Saving, 'id'>>
): boolean {
  const newType = updates.savingType ?? existing?.savingType;
  const newAmount = updates.amount ?? existing?.amount;
  const wasGoal = existing?.savingType === 'goal';
  const isGoal = newType === 'goal';

  return (
    isGoal &&
    newAmount !== undefined &&
    (updates.amount !== undefined || (!wasGoal && isGoal))
  );
}

export function targetAmountFromSaving(
  saving: Pick<Saving, 'amount'>,
  currency: Currency
): number {
  return convertFromNTD(saving.amount, currency);
}

export type TargetSetter = (
  type: FinancialTarget['type'],
  amount: number,
  period: FinancialTarget['period'],
  currency: Currency,
  skipSavingSync?: boolean
) => void;