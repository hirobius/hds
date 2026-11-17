// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The docs site's parity badge (docs-site/components/parity-badge.tsx) shows the
 * figures of public/hds-stats.json and nothing typed: its markup carries exactly
 * the committed score and Code Connect count, and the component source holds no
 * literal figure.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const stats = JSON.parse(readFileSync(join(ROOT, 'public/hds-stats.json'), 'utf8'));

const complete = { percent: 100, passed: 1597, total: 1597, readOn: '2026-12-01', source: 'x' };
const partial = { percent: 89.9, passed: 1436, total: 1597, readOn: '2026-11-15', source: 'x' };
const codeConnect = { templates: 61, source: 'src/app/components/*.figma.ts' };

describe('ParityBadge', () => {
  let html = '';
  let ParityReadout;
  const view = (props) => renderToStaticMarkup(createElement(ParityReadout, props));
  beforeAll(async () => {
    // The docs site is its own package: a computed URL keeps it out of the scripts' import graph.
    const badge = join(ROOT, 'docs-site/components/parity-badge.tsx');
    const mod = await import(pathToFileURL(badge).href);
    ParityReadout = mod.ParityReadout;
    html = renderToStaticMarkup(createElement(mod.ParityBadge));
  });

  it('hides the parity score until every check passes, and keeps the Code Connect count', () => {
    const out = view({ figmaParity: partial, codeConnect });
    expect(out).not.toContain('Figma parity');
    expect(out).not.toContain('1436');
    expect(out).toContain('<dt>Code Connect</dt>');
    expect(out).toContain('61 templates');
  });

  it('shows the parity score once passed equals total, beside the Code Connect count', () => {
    const out = view({ figmaParity: complete, codeConnect });
    expect(out).toContain('<dt>Figma parity</dt>');
    expect(out).toContain('>100%<');
    expect(out).toContain('1597/1597 checks, read 2026-12-01');
    expect(out).toContain('61 templates');
  });

  it('renders nothing with no parity read and no Code Connect count', () => {
    expect(view({ figmaParity: partial, codeConnect: undefined })).toBe('');
    expect(view({})).toBe('');
  });

  it('renders the figures the stats hold: the count always, the score only at 100%', () => {
    const { percent, passed, total } = stats.figmaParity;
    expect(html).toContain(`${stats.codeConnect.templates} templates`);
    if (passed === total) expect(html).toContain(`>${percent}%<`);
    else expect(html).not.toContain('Figma parity');
    // The data and the gate stay: hds-stats.json still carries the score.
    expect(typeof percent).toBe('number');
  });

  it('is a labelled description list, so a reader hears the term and its value', () => {
    expect(view({ figmaParity: complete, codeConnect })).toMatch(
      /<dl[^>]*aria-label="Figma and code"/,
    );
  });

  it('has no figure typed into its source', () => {
    const source = readFileSync(join(ROOT, 'docs-site/components/parity-badge.tsx'), 'utf8');
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\d/);
  });
});
