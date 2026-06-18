import { describe, expect, it } from 'vitest';
import { en } from './locales/en';
import { zhTW } from './locales/zh-TW';
import { ja } from './locales/ja';
import { collectMessageKeys, findMissingKeys } from '@/lib/i18nParity';

describe('locale parity', () => {
  it('zh-TW has all en keys', () => {
    const missing = findMissingKeys(en as Record<string, unknown>, zhTW as Record<string, unknown>);
    expect(missing).toEqual([]);
  });

  it('ja has all en keys', () => {
    const missing = findMissingKeys(en as Record<string, unknown>, ja as Record<string, unknown>);
    expect(missing).toEqual([]);
  });

  it('goalReach namespace is present in all locales', () => {
    for (const messages of [en, zhTW, ja]) {
      const keys = collectMessageKeys(messages as Record<string, unknown>).filter((k) =>
        k.startsWith('goalReach.')
      );
      expect(keys).toContain('goalReach.title');
      expect(keys).toContain('goalReach.aiCoach.title');
      expect(keys).toContain('goalReach.aiCoach.settings.title');
      expect(keys).toContain('goalReach.export.print');
      expect(keys).toContain('goalReach.conflicts.simulationShortfall');
    }
  });
});