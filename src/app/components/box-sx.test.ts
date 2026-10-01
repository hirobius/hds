import { readFileSync } from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { __resetDeprecationWarnings } from '../../lib/deprecation';
import {
  resolveSx,
  resolveSpacingValue,
  sxClassName,
  injectSx,
  __resetBoxSxForTests,
  LAYOUT_GAP,
  LAYOUT_GAP_NAMES,
  SPACE_SCALE,
  type SxObject,
} from './box-sx';
import { Stack } from './stack';
import { Cluster } from './cluster';
import { Grid } from './grid';
import { Sidebar, type SidebarProps } from './sidebar';
import { Cover } from './cover';
import { Switcher } from './switcher';
import { Bleed } from './bleed';
import { Center } from './center';
import { Card } from './card';

afterEach(() => {
  __resetBoxSxForTests();
});

describe('resolveSx — spacing shorthands', () => {
  // tier-ok: this whole file pins resolveSx()'s literal CSS-declaration output —
  // the primitive-tier bridge (box-sx.ts) IS the thing under test, so asserting
  // its exact resolved primitive-var strings is the point, not a bypass. hds#186
  it('maps a numeric value on the existing scale to --primitive-space-<n>', () => {
    const rules = resolveSx({ p: 2 }, 'cls');
    expect(rules).toEqual(['.cls{padding:var(--primitive-space-2)}']); // tier-ok: pins bridge output, hds#186
  });

  it('falls back to calc() for a numeric value off the existing scale', () => {
    const rules = resolveSx({ p: 9 }, 'cls');
    expect(rules).toEqual(['.cls{padding:calc(var(--primitive-space-1) * 9)}']); // tier-ok: pins bridge output, hds#186
  });

  it('supports negative numeric values via calc()', () => {
    const rules = resolveSx({ mt: -2 }, 'cls');
    expect(rules).toEqual(['.cls{margin-top:calc(var(--primitive-space-1) * -2)}']); // tier-ok: pins bridge output, hds#186
  });

  it.each(['xs', 'sm', 'md', 'lg', 'xl'])(
    'maps the t-shirt step %s to --semantic-space-scale-<step> (hds#206)',
    (step) => {
      expect(resolveSx({ p: step }, 'cls')).toEqual([
        `.cls{padding:var(--semantic-space-scale-${step})}`,
      ]);
      expect(resolveSx({ gap: step }, 'cls')).toEqual([
        `.cls{gap:var(--semantic-space-scale-${step})}`,
      ]);
    },
  );

  // Frozen until the 1.0 removal: layout.* is fixed px, and the scale step
  // would tighten under compact density (spacing-computed-lock.test.mjs).
  it.each([
    ['tight', 'var(--semantic-space-layout-tight)'],
    ['normal', 'var(--semantic-space-layout-normal)'],
    ['inset', 'var(--semantic-space-layout-inset)'],
    ['spacious', 'var(--semantic-space-layout-spacious)'],
  ])('keeps the deprecated step %s on %s, as before hds#206', (name, layoutVar) => {
    expect(resolveSx({ m: name }, 'cls')).toEqual([`.cls{margin:${layoutVar}}`]);
  });

  it('takes a t-shirt step inside a responsive map', () => {
    expect(resolveSx({ p: { xs: 'sm', md: 'lg' } }, 'cls')).toEqual([
      '@media (min-width:375px){.cls{padding:var(--semantic-space-scale-sm)}}',
      '@media (min-width:768px){.cls{padding:var(--semantic-space-scale-lg)}}',
    ]);
  });

  it('expands axis shorthands (mx/my/px/py) to two declarations', () => {
    expect(resolveSx({ mx: 2 }, 'cls')).toEqual([
      '.cls{margin-left:var(--primitive-space-2);margin-right:var(--primitive-space-2)}', // tier-ok: pins bridge output, hds#186
    ]);
    expect(resolveSx({ py: 'md' }, 'cls')).toEqual([
      '.cls{padding-top:var(--semantic-space-scale-md);padding-bottom:var(--semantic-space-scale-md)}',
    ]);
  });

  it('does not resolve an inherited object key as a spacing name', () => {
    expect(resolveSx({ p: 'constructor' }, 'cls')).toEqual(['.cls{padding:constructor}']);
  });

  it('passes a raw string spacing value through unchanged', () => {
    const rules = resolveSx({ p: 'auto' }, 'cls');
    expect(rules).toEqual(['.cls{padding:auto}']);
  });

  it('resolves gap/rowGap/columnGap the same way', () => {
    expect(resolveSx({ gap: 4 }, 'cls')).toEqual(['.cls{gap:var(--primitive-space-4)}']); // tier-ok: pins bridge output, hds#186
    expect(resolveSx({ rowGap: 4 }, 'cls')).toEqual(['.cls{row-gap:var(--primitive-space-4)}']); // tier-ok: pins bridge output, hds#186
    const columnGapInput = { columnGap: 4 }; // spacing-ok: token-scale index, not a raw px value
    expect(resolveSx(columnGapInput, 'cls')).toEqual(['.cls{column-gap:var(--primitive-space-4)}']); // tier-ok: pins bridge output, hds#186
  });
});

// ADR-014 step 1: a deprecated name warns once at runtime (dev builds only).
describe("resolveSx — deprecated 'tight'..'spacious' warn once (hds#206, ADR-014)", () => {
  beforeEach(() => __resetDeprecationWarnings());
  afterEach(() => vi.restoreAllMocks());

  it('warns once per name, naming the scale step that replaces it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveSx({ m: 'tight' }, 'a');
    resolveSx({ p: { md: 'tight' }, '&:hover': { gap: 'tight' } }, 'b');
    resolveSx({ gap: 'spacious' }, 'c');
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      expect.stringMatching(/Box sx spacing name 'tight' is deprecated.*1\.0\.0.*'sm'/),
      expect.stringMatching(/Box sx spacing name 'spacious' is deprecated.*1\.0\.0.*'xl'/),
    ]);
  });

  it('does not warn for steps, numbers, vars, or the same word on a non-spacing key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveSx({ p: 'md', m: 2, gap: 'var(--x)', fontWeight: 'normal', whiteSpace: 'normal' }, 'a');
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for Stack's own 'tight'..'spacious', which share the resolver", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const gap of ['tight', 'normal', 'inset', 'spacious'] as const) {
      renderToStaticMarkup(createElement(Stack, { gap }, 'x'));
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

// hds#404: one copy of the layout-gap names, here, for every layout component.
describe('LAYOUT_GAP — the one layout-gap vocabulary (hds#404)', () => {
  it("maps the four names to the scale steps Stack's gap reads", () => {
    expect(LAYOUT_GAP_NAMES).toEqual({
      tight: SPACE_SCALE.sm,
      normal: SPACE_SCALE.md,
      inset: SPACE_SCALE.lg,
      spacious: SPACE_SCALE.xl,
    });
  });

  it.each(Object.entries(LAYOUT_GAP_NAMES))('resolves %s to %s', (name, css) => {
    expect(resolveSpacingValue(name, LAYOUT_GAP)).toBe(css);
  });

  it('is closed: anything else resolves to undefined, so the prop sets no style', () => {
    for (const value of [0, 12, 'sm', 'xl', '1rem', 'gap', 'px16', 'constructor', 'var(--x)']) {
      expect(resolveSpacingValue(value, LAYOUT_GAP)).toBeUndefined();
    }
  });

  const LAYOUT_FILES = [
    'cluster',
    'grid',
    'sidebar',
    'cover',
    'switcher',
    'bleed',
    'center',
    'card',
    'stack',
  ];

  it.each(LAYOUT_FILES)('%s.tsx has no gap map of its own: it resolves through box-sx', (name) => {
    const source = readFileSync(join(__dirname, `${name}.tsx`), 'utf8');
    expect(source).toMatch(/import \{[^}]*\bresolveSpacingValue\b[^}]*\} from '\.\/box-sx'/);
    expect(source).toMatch(/import \{[^}]*\bLAYOUT_GAP(_NAMES)?\b[^}]*\} from '\.\/box-sx'/);
    expect(source).not.toMatch(/var\(--semantic-space-scale-/);
    expect(source).not.toMatch(/\b(tight|normal|inset|spacious): SPACE_SCALE\./);
  });

  it("the layout components' names do not warn: only Box sx's are deprecated", () => {
    __resetDeprecationWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const two = [createElement('i', { key: 'a' }), createElement('i', { key: 'b' })];
    for (const gap of Object.keys(LAYOUT_GAP_NAMES) as (keyof typeof LAYOUT_GAP_NAMES)[]) {
      renderToStaticMarkup(createElement(Cluster, { gap }, 'x'));
      renderToStaticMarkup(createElement(Grid, { gap }, 'x'));
      renderToStaticMarkup(createElement(Sidebar, { gap } as SidebarProps, ...two));
      renderToStaticMarkup(createElement(Cover, { gap }, 'x'));
      renderToStaticMarkup(createElement(Switcher, { gap }, 'x'));
      renderToStaticMarkup(createElement(Bleed, { amount: gap }, 'x'));
      renderToStaticMarkup(createElement(Center, { gutter: gap }, 'x'));
      renderToStaticMarkup(createElement(Card, { gap }, 'x'));
    }
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

/**
 * Type-checks `source` as a module beside box-sx.ts, under the repo's
 * tsconfig, and returns that module's own errors. Test files sit outside
 * `pnpm typecheck`, so this is how a test pins a signature.
 */
function typeErrorsBesideBoxSx(source: string): string[] {
  const root = join(__dirname, '..', '..', '..');
  const { config } = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const file = join(__dirname, '__resolve-spacing-value-types.ts');
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists } = host;
  host.fileExists = (name) => name === file || fileExists.call(host, name);
  host.getSourceFile = (name, language, ...rest) =>
    name === file
      ? ts.createSourceFile(name, source, language)
      : getSourceFile.call(host, name, language, ...rest);
  const program = ts.createProgram([file], options, host);
  return ts
    .getPreEmitDiagnostics(program, program.getSourceFile(file))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('resolveSpacingValue — its return type follows the vocabulary (hds#404)', () => {
  it('is never undefined for an open vocabulary and never a number for a closed one', () => {
    const errors = typeErrorsBesideBoxSx(`
      import { resolveSpacingValue, LAYOUT_GAP, type SpacingVocabulary } from './box-sx';
      type Equals<A, B> =
        (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
      declare const value: string | number;
      declare const either: SpacingVocabulary;
      const units = resolveSpacingValue(value, { names: { sm: 'a' }, numbers: 'units' });
      const raw = resolveSpacingValue(value, { names: {}, numbers: 'raw' });
      const closed = resolveSpacingValue(value, LAYOUT_GAP);
      const unknown = resolveSpacingValue(value, either);
      export const unitsIsStringOrNumber: Equals<typeof units, string | number> = true;
      export const rawIsStringOrNumber: Equals<typeof raw, string | number> = true;
      export const closedIsStringOrUndefined: Equals<typeof closed, string | undefined> = true;
      export const eitherIsAnyOfThem: Equals<typeof unknown, string | number | undefined> = true;
    `);
    expect(errors).toEqual([]);
  }, 60_000);
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
      '@media (min-width:640px){.cls{padding:var(--primitive-space-2)}}', // tier-ok: pins bridge output, hds#186
      '@media (min-width:1024px){.cls{padding:var(--primitive-space-6)}}', // tier-ok: pins bridge output, hds#186
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
      '.cls > *{margin-top:var(--primitive-space-2)}', // tier-ok: pins bridge output, hds#186
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
