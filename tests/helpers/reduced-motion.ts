/**
 * Stub `matchMedia` so `prefers-reduced-motion` matches, for tests of the
 * useReducedMotion path. The caller owns unstubbing (vi.unstubAllGlobals).
 */
import { vi } from 'vitest';

export function stubReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}
