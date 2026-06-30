import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readBool, readString } from './useSettings';

// localStorage stub for node environment
let store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { store = {}; },
});

describe('readBool', () => {
  beforeEach(() => { store = {}; });

  it('returns default true when key absent', () => {
    expect(readBool('missing', true)).toBe(true);
  });

  it('returns default false when key absent', () => {
    expect(readBool('missing', false)).toBe(false);
  });

  it('returns true when stored value is "true"', () => {
    localStorage.setItem('k', 'true');
    expect(readBool('k', false)).toBe(true);
  });

  it('returns false when stored value is "false"', () => {
    localStorage.setItem('k', 'false');
    expect(readBool('k', true)).toBe(false);
  });
});

describe('readString', () => {
  beforeEach(() => { store = {}; });

  it('returns default when key absent', () => {
    expect(readString('missing', 'USD')).toBe('USD');
  });

  it('returns stored value when present', () => {
    localStorage.setItem('k', 'EUR');
    expect(readString('k', 'USD')).toBe('EUR');
  });

  it('returns default for empty string key', () => {
    expect(readString('nope', 'en')).toBe('en');
  });
});
