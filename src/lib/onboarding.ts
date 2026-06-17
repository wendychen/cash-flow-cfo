export const USER_GUIDE_STORAGE_KEY = 'cash-flow-cfo-user-guide-seen';

export function hasSeenUserGuide(): boolean {
  try {
    return localStorage.getItem(USER_GUIDE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markUserGuideSeen(): void {
  try {
    localStorage.setItem(USER_GUIDE_STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

export function resetUserGuideSeen(): void {
  try {
    localStorage.removeItem(USER_GUIDE_STORAGE_KEY);
  } catch {
    // ignore
  }
}