import { describe, expect, it, beforeEach } from 'vitest';
import { GOAL_COACH_SETTINGS_STORAGE_KEY } from '@/lib/goalCoachProviders';
import {
  isByokProvider,
  isCoachReadyForRequest,
  normalizeGoalCoachSettings,
  readGoalCoachSettings,
  resolvedModelLabel,
  toProviderSettingsPayload,
  writeGoalCoachSettings,
} from '@/lib/goalCoachSettings';

describe('goalCoachSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes invalid input to server defaults', () => {
    expect(normalizeGoalCoachSettings({ provider: 'invalid', apiKey: '  ', model: '' })).toEqual({
      provider: 'server',
    });
  });

  it('trims api key and model', () => {
    expect(
      normalizeGoalCoachSettings({
        provider: 'openai',
        apiKey: '  sk-test  ',
        model: ' gpt-4o-mini ',
      })
    ).toEqual({
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    });
  });

  it('persists settings in localStorage', () => {
    writeGoalCoachSettings({ provider: 'groq', apiKey: 'gsk_test', model: 'llama-3.3-70b-versatile' });
    const raw = localStorage.getItem(GOAL_COACH_SETTINGS_STORAGE_KEY);
    expect(raw).toContain('groq');
    expect(readGoalCoachSettings()).toEqual({
      provider: 'groq',
      apiKey: 'gsk_test',
      model: 'llama-3.3-70b-versatile',
    });
  });

  it('detects BYOK readiness', () => {
    expect(isByokProvider('server')).toBe(false);
    expect(isByokProvider('gemini')).toBe(true);
    expect(isCoachReadyForRequest({ provider: 'server' })).toBe(true);
    expect(isCoachReadyForRequest({ provider: 'openai' })).toBe(false);
    expect(isCoachReadyForRequest({ provider: 'openai', apiKey: 'sk-test' })).toBe(true);
  });

  it('builds provider payload without empty fields', () => {
    expect(toProviderSettingsPayload({ provider: 'server' })).toEqual({ provider: 'server' });
    expect(
      toProviderSettingsPayload({ provider: 'gemini', apiKey: 'abc', model: 'gemini-2.0-flash' })
    ).toEqual({
      provider: 'gemini',
      apiKey: 'abc',
      model: 'gemini-2.0-flash',
    });
  });

  it('resolves model label from defaults', () => {
    expect(resolvedModelLabel({ provider: 'openai' })).toBe('gpt-4o-mini');
    expect(resolvedModelLabel({ provider: 'openai', model: 'gpt-4o' })).toBe('gpt-4o');
  });
});