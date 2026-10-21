/**
 * Guard: IBM Plex Mono is only for code, token names and token values (Adrian's type rule).
 * Headings, eyebrows, captions and meta lines in the docs site take the HDS ramp instead
 * (Sora 700 headings, Plus Jakarta Sans captions). Every docs-site CSS rule that sets a mono
 * font-family must be on the allowlist below, with what it shows; anything new fails here.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MONO = /mono|monospace/i;

/** Selectors allowed to set a mono font-family, and the code or token value each shows. */
const MONO_SELECTORS: Record<string, string> = {
  code: 'code',
  kbd: 'code',
  samp: 'code',
  pre: 'code',
  '.hds-swatch-value': 'a colour token value (hex)',
  '.hds-step-value': 'a spacing, radius or shadow token value',
  '.hds-specimen-values': 'the size / line-height / tracking values in a spec line',
};

/** Selectors that are names, labels or headings and must never be mono. */
const NEVER_MONO = /(^|[\s>+~,(])h[1-6]\b|title|heading|eyebrow|label|caption|meta|desc|note|nav/i;

function monoRules(css: string): { selector: string; family: string }[] {
  const rules: { selector: string; family: string }[] = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors, body] of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // `font-family:` declarations only; custom properties like --font-mono are definitions.
    for (const [, family] of body!.matchAll(/(?:^|[;\s])font-family\s*:\s*([^;]+)/g)) {
      if (!MONO.test(family!)) continue;
      for (const selector of selectors!.split(',')) {
        rules.push({ selector: selector.trim(), family: family!.trim() });
      }
    }
  }
  return rules;
}

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((d) => d.isFile() && ext.test(d.name) && !d.parentPath.includes('node_modules'))
    .map((d) => join(d.parentPath, d.name));
}

describe('docs-site mono scope', () => {
  const css = readFileSync('docs-site/app/globals.css', 'utf8');
  const rules = monoRules(css);

  it('finds the code rule, so the parser is reading the stylesheet', () => {
    expect(rules.map((r) => r.selector)).toContain('code');
  });

  it('sets mono only on allowlisted code and token-value selectors', () => {
    const stray = rules.filter((r) => !(r.selector in MONO_SELECTORS));
    expect(stray, 'mono is for code, token names and token values only').toEqual([]);
  });

  it('never sets mono on a heading, eyebrow, caption or meta selector', () => {
    const named = rules.filter((r) => NEVER_MONO.test(r.selector));
    expect(named).toEqual([]);
  });

  it('keeps headings on the display face', () => {
    const headings = [
      ...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*\bh[1-6]\b[^{}]*)\{([^{}]*)\}/g),
    ];
    for (const [, selector, body] of headings) {
      const family = /(?:^|[;\s])font-family\s*:\s*([^;]+)/.exec(body!)?.[1];
      if (family) expect(family, selector!.trim()).not.toMatch(MONO);
    }
  });

  it('uses no mono utility class or Text mono variant outside the type-role demo', () => {
    const MONO_CLASS =
      /(?<![-\w])font-mono\b|hds-type-mono|typography-mono-font-family|variant="mono"/;
    // component-demos.tsx renders <Text variant="mono"> to demo the mono role itself.
    const allowed = new Set(['docs-site/components/component-demos.tsx']);
    const hits = [
      ...files('docs-site/components', /\.tsx?$/),
      ...files('docs-site/app', /\.tsx?$/),
      ...files('content/docs', /\.mdx$/),
    ]
      .filter((f) => !allowed.has(f))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .flatMap((line, i) => (MONO_CLASS.test(line) ? [`${f}:${i + 1}`] : [])),
      );
    expect(hits).toEqual([]);
  });
});
