import type { Currency } from '@/hooks/use-currency';
import {
  formatOriginalAmount,
  shouldShowOriginalCurrencyBadge,
} from '@/lib/currencyEntry';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface OriginalCurrencyBadgeProps {
  originalAmount?: number;
  originalCurrency?: Currency;
  className?: string;
}

/**
 * Shows the amount as originally entered (NTD/CAD) in the top-right of an entry card.
 */
export function OriginalCurrencyBadge({
  originalAmount,
  originalCurrency,
  className,
}: OriginalCurrencyBadgeProps) {
  const { t } = useI18n();

  if (
    !shouldShowOriginalCurrencyBadge(originalCurrency) ||
    originalAmount === undefined
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute top-1.5 right-2 z-10 text-[10px] leading-tight font-medium',
        'text-muted-foreground bg-muted/70 border border-border/50 rounded px-1.5 py-0.5',
        'tabular-nums pointer-events-none',
        className
      )}
      title={t('nav.originalCurrencyTitle', { currency: originalCurrency })}
    >
      {formatOriginalAmount(originalAmount, originalCurrency)}
    </div>
  );
}