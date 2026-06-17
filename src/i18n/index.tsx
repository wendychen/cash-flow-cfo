import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { en, type Messages } from './locales/en';
import { zhTW } from './locales/zh-TW';
import { ja } from './locales/ja';

export type Locale = 'en' | 'zh-TW' | 'ja';

const LOCALE_STORAGE_KEY = 'cash-flow-cfo-locale';

const MESSAGES: Record<Locale, Messages> = {
  en,
  'zh-TW': zhTW,
  ja,
};

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Messages>;

function readStoredLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-TW' || saved === 'ja') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.documentElement.lang = next === 'zh-TW' ? 'zh-Hant' : next;
    } catch {
      // ignore
    }
  };

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const value = getNestedValue(MESSAGES[locale] as unknown as Record<string, unknown>, key);
      if (value) return interpolate(value, params);
      const fallback = getNestedValue(en as unknown as Record<string, unknown>, key);
      return fallback ? interpolate(fallback, params) : key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}