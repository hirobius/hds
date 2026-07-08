import { describe, it, expect, afterEach } from 'vitest';
import { resolveSx, sxClassName, injectSx, __resetBoxSxForTests, type SxObject } from './box-sx';

afterEach(() => {
  __resetBoxSxForTests();
});

describe('resolveSx — spacing shorthands', () => {
  it('maps a numeric value on the existing scale to --primitive-space-<n>', () => {
    const rules = resolveSx({ p: 2 }, 'cls');
    expect(rules).toEqual(['.cls{padding:var(--primitive-space-2)}']);
  });

  it('falls back to calc() for a numeric value off the existing scale', () => {
    const rules = resolveSx({ p: 9 }, 'cls');
    expect(rules).toEqual(['.cls{padding:calc(var(--primitive-space-1) * 9)}']);
  });

  it('supports negative numeric values via calc()', () => {
    const rules = resolveSx({ mt: -2 }, 'cls');
    expect(rules).toEqual(['.cls{margin-top:calc(var(--primitive-space-1) * -2)}']);
  });

  it('maps a named semantic step to --semantic-space-layout-<step>', () => {
    const rules = resolveSx({ m: 'tight' }, 'cls');
    expect(rules).toEqual(['.cls{margin:var(--semantic-space-layout-tight)}']);
  });

  it('expands axis shorthands (mx/my/px/py) to two declarations', () => {
    expect(resolveSx({ mx: 2 }, 'cls')).toEqual([
      '.cls{margin-left:var(--primitive-space-2);margin-right:var(--primitive-space-2)}',
    ]);
    expect(resolveSx({ py: 'normal' }, 'cls')).toEqual([
      '.cls{padding-top:var(--semantic-space-layout-normal);padding-bottom:var(--semantic-space-layout-normal)}',
    ]);
  });

  it('passes a raw string spacing value through unchanged', () => {
    const rules = resolveSx({ p: 'auto' }, 'cls');
    expect(rules).toEqual(['.cls{padding:auto}']);
  });

  it('resolves gap/rowGap/columnGap the same way', () => {
    expect(resolveSx({ gap: 4 }, 'cls')).toEqual(['.cls{gap:var(--primitive-space-4)}']);
    expect(resolveSx({ rowGap: 4 }, 'cls')).toEqual(['.cls{row-gap:var(--primitive-space-4)}']);
    const columnGapInput = { columnGap: 4 }; // spacing-ok: token-scale index, not a raw px value
    expect(resolveSx(columnGapInput, 'cls')).toEqual(['.cls{column-gap:var(--primitive-space-4)}']);
  });
});

describe('resolveSx — token colors', () => {
  it('resolves content.* to --semantic-color-content-*', () => {
    expect(resolveSx({ color: 'content.primary' }, 'cls')).toEqual([
      '.cls{color:var(--semantic-color-content-primary)}',
    ]);
  });

  it('resolves bgcolor to background-color and surface.* tokens', () => {
    expect(resolveSx({ bgcolor: 'surface.raised' }, 'cls')).toEqual([
      '.cls{background-color:var(--semantic-color-surface-raised)}',
    ]);
  });

  it('resolves borderColor to border-color and border.* tokens', () => {
    expect(resolveSx({ borderColor: 'border.subtle' }, 'cls')).toEqual([
      '.cls{border-color:var(--semantic-color-border-subtle)}',
    ]);
  });

  it('resolves bare "accent" to --semantic-accent-rest', () => {
    expect(resolveSx({ color: 'accent' }, 'cls')).toEqual([
      '.cls{color:var(--semantic-accent-rest)}',
    ]);
  });

  it('resolves accent.hover/pressed/subtle/content to --semantic-accent-*', () => {
    expect(resolveSx({ bgcolor: 'accent.hover' }, 'cls')).toEqual([
      '.cls{background-color:var(--semantic-accent-hover)}',
    ]);
    expect(resolveSx({ color: 'accent.content' }, 'cls')).toEqual([
      '.cls{color:var(--semantic-accent-content)}',
    ]);
  });

  it('resolves feedback.* tokens', () => {
    expect(resolveSx({ color: 'feedback.success' }, 'cls')).toEqual([
      '.cls{color:var(--semantic-color-feedback-success)}',
    ]);
  });

  it('resolves fill/stroke without renaming the property', () => {
    expect(resolveSx({ fill: 'content.accent' }, 'cls')).toEqual([
      '.cls{fill:var(--semantic-color-content-accent)}',
    ]);
    expect(resolveSx({ stroke: 'border.strong' }, 'cls')).toEqual([
      '.cls{stroke:var(--semantic-color-border-strong)}',
    ]);
  });

  it('passes through an unrecognized/raw color value', () => {
    expect(resolveSx({ color: 'rebeccapurple' }, 'cls')).toEqual(['.cls{color:rebeccapurple}']);
    expect(resolveSx({ color: 'content.bogus' }, 'cls')).toEqual(['.cls{color:content.bogus}']);
  });
});

describe('resolveSx — generic CSS properties', () => {
  it('converts camelCase to kebab-case', () => {
    expect(resolveSx({ borderRadius: 8 }, 'cls')).toEqual(['.cls{border-radius:8px}']);
  });

  it('appends px to numeric values by default', () => {
    expect(resolveSx({ width: 100 }, 'cls')).toEqual(['.cls{width:100px}']);
  });

  it('leaves unitless-allowlisted properties bare', () => {
    expect(resolveSx({ opacity: 0.5 }, 'cls')).toEqual(['.cls{opacity:0.5}']);
    expect(resolveSx({ zIndex: 10 }, 'cls')).toEqual(['.cls{z-index:10}']);
    expect(resolveSx({ fontWeight: 600 }, 'cls')).toEqual(['.cls{font-weight:600}']);
    expect(resolveSx({ lineHeight: 1.4 }, 'cls')).toEqual(['.cls{line-height:1.4}']);
    expect(resolveSx({ flexGrow: 1 }, 'cls')).toEqual(['.cls{flex-grow:1}']);
    expect(resolveSx({ aspectRatio: 1.5 }, 'cls')).toEqual(['.cls{aspect-ratio:1.5}']);
  });

  it('passes a raw string value through unchanged', () => {
    expect(resolveSx({ display: 'grid' }, 'cls')).toEqual(['.cls{display:grid}']);
  });
});

describe('resolveSx — responsive values', () => {
  it('compiles a responsive object to ascending min-width media queries', () => {
    const rules = resolveSx({ width: { xs: 100, md: 200 } }, 'cls');
    expect(rules).toEqual([
      '@media (min-width:375px){.cls{width:100px}}',
      '@media (min-width:768px){.cls{width:200px}}',
    ]);
  });

  it('supports responsive spacing and color values', () => {
    const rules = resolveSx({ p: { sm: 2, lg: 6 } }, 'cls');
    expect(rules).toEqual([
      '@media (min-width:640px){.cls{padding:var(--primitive-space-2)}}',
      '@media (min-width:1024px){.cls{padding:var(--primitive-space-6)}}',
    ]);
  });
});

describe('resolveSx — & nested selectors', () => {
  it('composes a &-selector into a class-scoped rule', () => {
    const rules = resolveSx({ '&:hover': { color: 'accent' } }, 'cls');
    expect(rules).toEqual(['.cls:hover{color:var(--semantic-accent-rest)}']);
  });

  it('supports combinator and attribute selectors', () => {
    expect(resolveSx({ '& > *': { mt: 2 } }, 'cls')).toEqual([
      '.cls > *{margin-top:var(--primitive-space-2)}',
    ]);
    expect(resolveSx({ '&[data-state=open]': { opacity: 1 } }, 'cls')).toEqual([
      '.cls[data-state=open]{opacity:1}',
    ]);
  });

  it('composes & selectors with responsive values inside them', () => {
    const rules = resolveSx({ '&:hover': { width: { xs: 100, md: 200 } } }, 'cls');
    expect(rules).toEqual([
      '@media (min-width:375px){.cls:hover{width:100px}}',
      '@media (min-width:768px){.cls:hover{width:200px}}',
    ]);
  });

  it('preserves base declarations alongside a & selector (regression guard for the insertRule bug)', () => {
    const sx: SxObject = {
      color: 'content.primary',
      '&:hover': { color: 'accent' },
      width: { xs: 100, md: 200 },
    };
    const rules = resolveSx(sx, 'cls');
    expect(rules).toEqual([
      '.cls{color:var(--semantic-color-content-primary)}',
      '.cls:hover{color:var(--semantic-accent-rest)}',
      '@media (min-width:375px){.cls{width:100px}}',
      '@media (min-width:768px){.cls{width:200px}}',
    ]);
  });
});

describe('sxClassName — hash determinism', () => {
  it('produces the same class name for two structurally-identical objects', () => {
    const a = sxClassName({ p: 2, color: 'content.primary' });
    const b = sxClassName({ color: 'content.primary', p: 2 });
    expect(a).toBe(b);
  });

  it('produces different class names for different objects', () => {
    const a = sxClassName({ p: 2 });
    const b = sxClassName({ p: 4 });
    expect(a).not.toBe(b);
  });

  it('produces a stable, CSS-safe class name prefix', () => {
    expect(sxClassName({ p: 2 })).toMatch(/^hds-sx-[a-z0-9-]+$/);
  });
});

describe('injectSx — insertRule regression (base decls + &-selector + responsive)', () => {
  afterEach(() => {
    document.querySelectorAll('style[data-hds-sx]').forEach((el) => el.remove());
  });

  it('demonstrates the underlying bug: concatenating multiple top-level rules in one insertRule() call throws', () => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    const sheet = style.sheet as CSSStyleSheet;
    const combined = '.a{color:red}.a:hover{color:blue}';
    expect(() => sheet.insertRule(combined, 0)).toThrow();
    style.remove();
  });

  it('injects base + &:hover + responsive rules without dropping the base declarations', () => {
    const sx: SxObject = {
      color: 'content.primary',
      '&:hover': { color: 'accent' },
      width: { xs: 100, md: 200 },
    };

    const className = injectSx(sx);
    expect(className).toMatch(/^hds-sx-/);

    const styleEl = document.querySelector<HTMLStyleElement>('style[data-hds-sx]');
    expect(styleEl).not.toBeNull();

    const sheet = styleEl!.sheet as CSSStyleSheet;
    // Browsers/jsdom re-serialize cssText with their own whitespace and a
    // trailing `;` before `}` — normalize both away before comparing.
    const cssTexts = Array.from(sheet.cssRules).map((r) =>
      r.cssText.replace(/\s+/g, '').replace(/;}/g, '}'),
    );

    // The base declaration MUST survive — this is exactly what the bug drops.
    expect(
      cssTexts.some((t) => t === `.${className}{color:var(--semantic-color-content-primary)}`),
    ).toBe(true);
    expect(
      cssTexts.some((t) => t === `.${className}:hover{color:var(--semantic-accent-rest)}`),
    ).toBe(true);
    expect(cssTexts.some((t) => t.includes('@media') && t.includes('375px'))).toBe(true);
    expect(cssTexts.some((t) => t.includes('@media') && t.includes('768px'))).toBe(true);
    expect(sheet.cssRules.length).toBe(4);
  });

  it('injects an identical sx object only once (shared class/rule set)', () => {
    const sxA: SxObject = { p: 2, color: 'content.primary' };
    const sxB: SxObject = { color: 'content.primary', p: 2 };

    const classA = injectSx(sxA);
    const classB = injectSx(sxB);
    expect(classA).toBe(classB);

    const styleEl = document.querySelector<HTMLStyleElement>('style[data-hds-sx]');
    const sheet = styleEl!.sheet as CSSStyleSheet;
    expect(sheet.cssRules.length).toBe(1);
  });

  it('is a no-op class-name-only call when document is unavailable (SSR safety smoke)', () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error — simulate an SSR environment where `document` is undefined.
    delete globalThis.document;
    try {
      const className = sxClassName({ p: 2 });
      expect(className).toMatch(/^hds-sx-/);
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
