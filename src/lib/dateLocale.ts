import type { Locale as DateFnsLocale } from 'date-fns';
import { enUS, ja, zhTW } from 'date-fns/locale';
import type { Locale } from '@/i18n';

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  en: enUS,
  'zh-TW': zhTW,
  ja,
};

export function getDateFnsLocale(locale?: string): DateFnsLocale {
  if (locale && locale in DATE_FNS_LOCALES) {
    return DATE_FNS_LOCALES[locale as Locale];
  }
  return enUS;
}