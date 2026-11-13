/**
 * Docs page polish (Adrian's phone review, 2026-10-22). One rule per block:
 *   1. every collapsible row on a docs page has one label style (the .hds-fold summary);
 *   2. every link in docs prose is the HDS InlineLink, one look: external keeps the icon;
 *   3. token tables keep mono for code only, show composites readably, and stack on a phone.
 * The phone-width checks (title never breaks mid-word, tables fit 390) run in the browser:
 * tests/visual/docs-phone-fit.spec.ts.
 */
import type { FC, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MdxLink } from '../../docs-site/components/mdx-link';
import { TokenRows } from '../../docs-site/components/token-table';
import { tokenRow } from '../../docs-site/lib/token-tables';
import { loadTokens } from '../../docs-site/lib/site-data';
import { titleWordEm } from '../../docs-site/lib/title-fit';

const ROOT = join(__dirname, '..', '..');
const CSS = readFileSync(join(ROOT, 'docs-site/app/globals.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** Every `selector { body }` rule, media queries flattened. */
const rules = () =>
  [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    selectors: sel!
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    body: body!,
  }));

describe('1. one disclosure label style', () => {
  const LABEL_PROPS = /(?:^|[;\s])(font-size|font-weight|font-family|font|color|line-height)\s*:/;

  it('styles the fold label in exactly one rule, from the ui type role', () => {
    const labelRules = rules().filter(
      (r) => r.selectors.some((s) => /summary(?!::)/.test(s)) && LABEL_PROPS.test(r.body),
    );
    expect(labelRules.map((r) => r.selectors.join(', '))).toEqual(['.hds-fold > summary']);
    const body = labelRules[0]!.body;
    for (const prop of ['font-family', 'font-size', 'font-weight', 'line-height'])
      expect(body).toContain(`${prop}: var(--semantic-typography-ui-${prop})`);
    expect(body).toContain('color: var(--semantic-color-content-primary)');
  });

  it('draws one chevron for every fold', () => {
    const chevrons = rules().filter((r) =>
      r.selectors.some((s) => /summary::(before|after)/.test(s)),
    );
    expect(chevrons.length).toBeGreaterThan(0);
    for (const r of chevrons)
      for (const s of r.selectors.filter((x) => /summary::/.test(x)))
        expect(s).toMatch(/^\.hds-fold(\[open\])? > summary::after$/);
  });

  it('uses the shared fold in every docs component that renders a <details>', () => {
    for (const f of ['token-table.tsx', 'upgrade-ledger.tsx']) {
      const src = readFileSync(join(ROOT, 'docs-site/components', f), 'utf8');
      for (const m of src.matchAll(/<details\b[^>]*>/g)) expect(m[0]).toContain('"hds-fold"');
      expect(src).not.toMatch(/<summary\s+(className|style)=/);
    }
  });
});

describe('2. docs links are InlineLink', () => {
  const A = MdxLink as FC<{ href: string; children: ReactNode }>;
  const html = (href: string) => renderToStaticMarkup(<A href={href}>Button</A>);

  it('is what MDX renders for every prose link', () => {
    const src = readFileSync(join(ROOT, 'docs-site/mdx-components.tsx'), 'utf8');
    expect(src).toMatch(/^\s+a: MdxLink,$/m);
  });

  it('renders an internal link as InlineLink, without the external icon', () => {
    const out = html('/docs/components/button');
    expect(out).toContain('class="hds-focus hds-link"');
    expect(out).toContain('href="/docs/components/button"');
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('opens in new tab');
  });

  it('renders an external link as InlineLink, with the icon and the new-tab notice', () => {
    const out = html('https://example.com/');
    expect(out).toContain('class="hds-ext hds-focus hds-link"');
    expect(out).toContain('<svg');
    expect(out).toContain('(opens in new tab)');
  });

  it('keeps Fumadocs prose link styles off it (one look in and out of prose)', () => {
    expect(html('/docs/x')).toMatch(/^<span class="not-prose">/);
  });

  it('gives .hds-link no docs-only overrides', () => {
    const overrides = rules().filter((r) => r.selectors.some((s) => /hds-link/.test(s)));
    expect(overrides).toEqual([]);
  });
});

describe('3. token table typography', () => {
  const tokens = loadTokens();

  it('shows a motion composite as duration · easing, the curve as detail', () => {
    const row = tokenRow(tokens, 'semantic.motion.productive')!;
    expect(row.value).toBe('150 ms · ease-out');
    expect(row.detail).toBe('cubic-bezier(0, 0, 0.2, 1)');
    expect(row.literal).toBe(false);
  });

  it('shows a typography composite as family weight · size / line height', () => {
    const row = tokenRow(tokens, 'semantic.typography.display')!;
    expect(row.value).toMatch(/^Sora 700 · \d+px \/ [\d.]+( · -?[\d.]+(px|em) tracking)?$/);
    expect(row.detail).toBeNull();
    expect(row.literal).toBe(false);
  });

  it('keeps a hex value as a literal (code)', () => {
    const row = tokenRow(tokens, 'semantic.color.content.primary')!;
    expect(row.literal ?? true).toBe(true);
  });

  const table = () =>
    renderToStaticMarkup(
      <TokenRows
        rows={[
          tokenRow(tokens, 'semantic.color.content.primary')!,
          { ...tokenRow(tokens, 'semantic.motion.productive')!, description: 'Motion' },
        ]}
        descriptionLabel="Role"
      />,
    );

  it('sets the composite in the UI font and its curve as code', () => {
    const out = table();
    expect(out).toContain('<span class="hds-token-text">150 ms · ease-out</span>');
    expect(out).toContain('<code class="hds-token-detail">cubic-bezier(0, 0, 0.2, 1)</code>');
    expect(out).not.toContain('timingFunction');
    expect(out).toMatch(/<code>#[0-9a-f]{3,8}<\/code>/i);
  });

  it('labels each cell with its column, so the phone layout can stack rows', () => {
    const out = table();
    expect(out).toContain('data-label="Light"');
    expect(out).toContain('data-label="Dark"');
    expect(out).toContain('data-label="Role"');
    const phone = CSS.match(/@media \(width < 40rem\)\s*\{([\s\S]*?\n)\}/g)?.join('\n') ?? '';
    expect(phone).toMatch(/\.hds-token-table td::before\s*\{[^}]*content: attr\(data-label\)/);
  });
});

describe('5. long titles fit without breaking a word', () => {
  // A 390px phone leaves a 358px column; the display size is 56px.
  const fitsAtDisplay = (title: string) => 358 / titleWordEm(title) >= 56;

  it('measures the widest word, not the whole title', () => {
    expect(titleWordEm('An overview')).toBe(titleWordEm('overview'));
  });

  it('steps a long component name down and keeps a short one at the display size', () => {
    expect(fitsAtDisplay('DataTableSection')).toBe(false);
    expect(fitsAtDisplay('Typography')).toBe(true);
    expect(fitsAtDisplay('Button')).toBe(true);
  });

  it('feeds the measure to the title, sized against its column in CSS', () => {
    const page = readFileSync(join(ROOT, 'docs-site/app/docs/[[...slug]]/page.tsx'), 'utf8');
    expect(page.match(/<DocsTitle style=\{titleFit\(/g)?.length).toBe(2);
    expect(CSS).toContain('calc(100cqi / var(--hds-title-em, 1))');
    expect(CSS).not.toMatch(/#nd-page h1[^{]*\{[^}]*overflow-wrap:\s*(break-word|anywhere)/);
  });
});

// Adrian 2026-11-05: the sidebar search trigger had no visible box (surface.raised is the
// sidebar's own fill), and the gear read darker than the sidebar's drawer toggle.
describe('sidebar search box and icon controls', () => {
  const bodyOf = (selector: string) =>
    rules()
      .filter((r) => r.selectors.includes(selector))
      .map((r) => r.body)
      .join(';');

  it('draws the search trigger as a field: page fill and a default border', () => {
    const body = bodyOf('.hds-docs-search');
    expect(body).toContain('background: var(--semantic-color-surface-page)');
    expect(body).toMatch(/border: 1px solid var\(--semantic-color-border-default\)/);
    expect(body).not.toContain('surface-raised');
  });

  it('gives the gear and the drawer toggle the same subdued secondary tone', () => {
    const iconSelectors = [
      '.hds-docs-display [data-docs-switch-trigger]',
      "#nd-sidebar button[aria-label='Collapse Sidebar']",
      '#nd-sidebar-mobile [data-docs-switch-trigger]',
      '#nd-sidebar-mobile div:has(> .hds-docs-display) > button',
    ];
    for (const sel of iconSelectors) {
      const colors = [...bodyOf(sel).matchAll(/(?:^|[;\s])color:\s*([^;]+)/g)].map((m) =>
        m[1]!.trim(),
      );
      expect(colors, sel).toEqual(['var(--semantic-color-content-secondary)']);
    }
  });
});
