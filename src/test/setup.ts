import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Stable UUIDs for deterministic tests
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => {
    uuidCounter += 1;
    return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
  },
});

beforeEach(() => {
  uuidCounter = 0;
  localStorage.clear();
});