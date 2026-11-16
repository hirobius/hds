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

describe('ParityBadge', () => {
  let html = '';
  beforeAll(async () => {
    // The docs site is its own package: a computed URL keeps it out of the scripts' import graph.
    const badge = join(ROOT, 'docs-site/components/parity-badge.tsx');
    const { ParityBadge } = await import(pathToFileURL(badge).href);
    html = renderToStaticMarkup(createElement(ParityBadge));
  });

  it('renders the score and the template count the stats hold', () => {
    const { percent, passed, total, readOn } = stats.figmaParity;
    expect(html).toContain(`>${percent}%<`);
    expect(html).toContain(`${passed}/${total} checks`);
    expect(html).toContain(readOn);
    expect(html).toContain(`${stats.codeConnect.templates} templates`);
  });

  it('is a labelled description list, so a reader hears the term and its value', () => {
    expect(html).toMatch(/<dl[^>]*aria-label="Figma and code"/);
    expect(html).toContain('<dt>Figma parity</dt>');
  });

  it('has no figure typed into its source', () => {
    const source = readFileSync(join(ROOT, 'docs-site/components/parity-badge.tsx'), 'utf8');
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\d/);
  });
});
