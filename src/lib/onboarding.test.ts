import { describe, expect, it, beforeEach } from 'vitest';
import {
  hasSeenUserGuide,
  markUserGuideSeen,
  resetUserGuideSeen,
  USER_GUIDE_STORAGE_KEY,
} from './onboarding';

describe('onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unseen', () => {
    expect(hasSeenUserGuide()).toBe(false);
  });

  it('marks guide as seen', () => {
    markUserGuideSeen();
    expect(hasSeenUserGuide()).toBe(true);
    expect(localStorage.getItem(USER_GUIDE_STORAGE_KEY)).toBe('true');
  });

  it('resets seen state', () => {
    markUserGuideSeen();
    resetUserGuideSeen();
    expect(hasSeenUserGuide()).toBe(false);
  });
});