/**
 * Unit tests for src/app/context/* providers
 *
 * Unit: 12p-test-state-store-context-tests
 *
 * Tests cover:
 *   ThemeContext  — system mode responds to matchMedia change events
 *   LanguageContext — RTL direction flips html[dir] attribute
 *   FontContext   — CSS var applied on mount
 *
 * @testing-library/react is not installed; tests use act + createRoot directly.
 * Each test creates its own container and unmounts after to avoid state leaks.
 */

// Tell React that this test environment supports act() so the
// "act not configured" warning is suppressed (jsdom environment).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeContainer(): HTMLDivElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  return c;
}

function cleanup(container: HTMLDivElement, root: Root) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

// ── ThemeContext ──────────────────────────────────────────────────────────────

describe('ThemeContext', () => {
  let container: HTMLDivElement;
  let root: Root;

  // matchMedia mock — default: light mode (matches = false)
  let mqListeners: Array<(e: { matches: boolean }) => void> = [];

  // Returns both the matchMedia mock fn and the mutable mqObject so tests can
  // update mqObject.matches before firing listeners (the onChange handler reads
  // mq.matches directly, not from the MediaQueryListEvent argument).
  function buildMatchMedia(defaultMatches: boolean): {
    mockFn: ReturnType<typeof vi.fn>;
    mqObject: { matches: boolean };
  } {
    const mqObject = { matches: defaultMatches };
    const mockFn = vi.fn().mockReturnValue({
      get matches() {
        return mqObject.matches;
      },
      addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        mqListeners.push(cb);
      }),
      removeEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
        mqListeners = mqListeners.filter((l) => l !== cb);
      }),
    });
    return { mockFn, mqObject };
  }

  beforeEach(() => {
    mqListeners = [];
    container = makeContainer();
    root = createRoot(container);
  });

  afterEach(() => {
    cleanup(container, root);
    vi.restoreAllMocks();
  });

  // Installs the matchMedia mock on window and returns the mutable mqObject.
  function installMatchMedia(defaultMatches: boolean): { matches: boolean } {
    const { mockFn, mqObject } = buildMatchMedia(defaultMatches);
    Object.defineProperty(window, 'matchMedia', {
      value: mockFn,
      writable: true,
      configurable: true,
    });
    return mqObject;
  }

  // Simulates the OS switching colour scheme:
  // 1. Update the mutable matches property so mq.matches returns the new value
  // 2. Fire the listeners (ThemeContext's onChange reads mq.matches directly)
  async function fireOsChange(mqObject: { matches: boolean }, matches: boolean) {
    await act(async () => {
      mqObject.matches = matches;
      for (const listener of mqListeners) {
        listener({ matches });
      }
    });
  }

  // Renders ThemeProvider around a consumer and returns a live view of its context.
  // Imported dynamically to pick up the mocked matchMedia.
  async function renderTheme() {
    const { ThemeProvider, useTheme } = await import('../ThemeContext');
    let ctx: ReturnType<typeof useTheme> | undefined;
    function Consumer() {
      ctx = useTheme();
      return null;
    }
    await act(async () => {
      root.render(
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>,
      );
    });
    return () => ctx!;
  }

  it('system mode: switching OS preference to dark flips isDark to true', async () => {
    // Mock matchMedia with light preference initially
    const mqObject = installMatchMedia(false);
    const theme = await renderTheme();

    // In system mode with matches=false → isDark should be false
    expect(theme().isDark).toBe(false);

    await fireOsChange(mqObject, true);

    expect(theme().isDark).toBe(true);
  });

  it('light mode: OS change events do not affect isDark', async () => {
    const mqObject = installMatchMedia(false);
    const theme = await renderTheme();

    // Switch to explicit light mode
    await act(async () => {
      theme().setMode('light');
    });
    expect(theme().isDark).toBe(false);

    // Simulate OS switching to dark — should NOT change isDark in light mode
    await fireOsChange(mqObject, true);

    // Still false — OS events are ignored in non-system mode
    expect(theme().isDark).toBe(false);
  });
});

// ── LanguageContext ───────────────────────────────────────────────────────────

describe('LanguageContext', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // Reset html dir to ltr before each test
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('data-reading-direction');
    container = makeContainer();
    root = createRoot(container);
    // Clear localStorage direction
    try {
      localStorage.removeItem('hds-direction');
    } catch {}
  });

  afterEach(() => {
    cleanup(container, root);
    vi.restoreAllMocks();
  });

  it('mounts with ltr direction and sets html[dir="ltr"]', async () => {
    const { LanguageProvider } = await import('../LanguageContext');

    await act(async () => {
      root.render(
        <LanguageProvider>
          <div />
        </LanguageProvider>,
      );
    });

    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  // Renders LanguageProvider around a consumer and returns a live view of its context.
  async function renderLanguage() {
    const { LanguageProvider, useLanguage } = await import('../LanguageContext');
    let ctx: ReturnType<typeof useLanguage> | undefined;
    function Consumer() {
      ctx = useLanguage();
      return null;
    }
    await act(async () => {
      root.render(
        <LanguageProvider>
          <Consumer />
        </LanguageProvider>,
      );
    });
    return () => ctx!;
  }

  it('toggleDirection flips html[dir] from ltr to rtl', async () => {
    const language = await renderLanguage();

    expect(document.documentElement.getAttribute('dir')).toBe('ltr');

    await act(async () => {
      language().toggleDirection();
    });

    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('data-reading-direction')).toBe('rtl');
  });

  it('setDirection("rtl") sets html[dir="rtl"] and isRtl=true', async () => {
    const language = await renderLanguage();

    await act(async () => {
      language().setDirection('rtl');
    });

    expect(language().isRtl).toBe(true);
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('toggleDirection from rtl back to ltr resets html[dir]', async () => {
    const language = await renderLanguage();

    // toggle to rtl, then back to ltr
    await act(async () => {
      language().toggleDirection();
    });
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');

    await act(async () => {
      language().toggleDirection();
    });
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});

// ── FontContext ───────────────────────────────────────────────────────────────

describe('FontContext', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.documentElement.style.removeProperty('--primitive-typography-family-primary');
    container = makeContainer();
    root = createRoot(container);
  });

  afterEach(() => {
    cleanup(container, root);
  });

  // FontProvider is a passthrough since 12t-typography-truth-up removed the
  // Atkinson injection (Atkinson had no @font-face, so the override silently
  // degraded body text to system-ui). The cascade in tokens.generated.css now
  // resolves --primitive-typography-family-primary to Clash Grotesk directly.
  it('renders children and does not override the typography family CSS var', async () => {
    const { FontProvider } = await import('../FontContext');

    await act(async () => {
      root.render(
        <FontProvider>
          <div data-testid="child" />
        </FontProvider>,
      );
    });

    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    const inlineOverride = document.documentElement.style.getPropertyValue(
      '--primitive-typography-family-primary',
    );
    expect(inlineOverride).toBe('');
  });
});

// ── HdsThemeProvider (ADR-020 §4 — brand/theme/density dials) ──────────────────

describe('HdsThemeProvider', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = makeContainer();
    root = createRoot(container);
  });

  afterEach(() => {
    cleanup(container, root);
  });

  async function renderProvider(props: Record<string, unknown>) {
    const { HdsThemeProvider } = await import('../hds-theme');
    await act(async () => {
      root.render(
        <HdsThemeProvider {...props}>
          <div data-testid="child" />
        </HdsThemeProvider>,
      );
    });
    return container.querySelector('[data-hds]') as HTMLElement;
  }

  it('writes the brand slug onto BOTH data-brand and the data-tenant alias (#62)', async () => {
    const scope = await renderProvider({ brand: 'brutalist-demo' });
    expect(scope.getAttribute('data-brand')).toBe('brutalist-demo');
    // data-tenant is mirrored for back-compat with today's compiled overlays.
    expect(scope.getAttribute('data-tenant')).toBe('brutalist-demo');
  });

  it('omits the brand attributes when no brand is given (base brand)', async () => {
    const scope = await renderProvider({});
    expect(scope.getAttribute('data-brand')).toBeNull();
    expect(scope.getAttribute('data-tenant')).toBeNull();
  });

  it('sets data-theme/data-density only for the non-default values', async () => {
    const dark = await renderProvider({ theme: 'dark', density: 'compact' });
    expect(dark.getAttribute('data-theme')).toBe('dark');
    expect(dark.getAttribute('data-density')).toBe('compact');

    const light = await renderProvider({ theme: 'light', density: 'comfortable' });
    // light/comfortable are the defaults — the attributes stay unset.
    expect(light.getAttribute('data-theme')).toBeNull();
    expect(light.getAttribute('data-density')).toBeNull();
  });

  it('exposes font-family overrides as CSS vars on the scope', async () => {
    const scope = await renderProvider({ fontFamily: 'Inter', fontFamilyMono: 'Fira Code' });
    expect(scope.style.getPropertyValue('--hds-font-family')).toBe('Inter');
    expect(scope.style.getPropertyValue('--hds-font-family-mono')).toBe('Fira Code');
  });
});
