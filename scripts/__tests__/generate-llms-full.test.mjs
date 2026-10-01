/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLlmsTxt } from '../generate-llms-txt.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const normalize = (t) => t.replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g, '<date>');

describe('committed llms output is fresh', () => {
  it('matches what the generator would write now', () => {
    const outputs = generateLlmsTxt({ write: false });
    expect(Object.keys(outputs)).toEqual(
      expect.arrayContaining([
        'public/llms.txt',
        'public/llms-full.txt',
        'public/llms/layout.txt',
        'public/llms/components.txt',
      ]),
    );
    const stale = Object.entries(outputs)
      .filter(([rel, text]) => normalize(read(rel)) !== normalize(text))
      .map(([rel]) => rel);
    expect(stale, 'run pnpm llms:generate').toEqual([]);
  });
});

describe('llms-full.txt and slices', () => {
  it('names every componentInventory entry that is not deprecated', () => {
    const manifest = JSON.parse(read('public/hds-manifest.json'));
    const full = read('public/llms-full.txt');
    const absent = manifest.componentInventory
      .filter((n) => !manifest.componentSpecs[n]?.deprecated)
      .filter((n) => !full.includes(`### ${n}\n`));
    expect(absent).toEqual([]);
  });

  it('leaves the deprecated hds#232 docs/lab internals out of the props digest (hds#390)', () => {
    const components = read('public/llms/components.txt');
    const full = read('public/llms-full.txt');
    for (const name of [
      'CinematicLink',
      'ComponentInstanceMatrix',
      'FoundationSwatch',
      'Sketch',
      'Token',
    ]) {
      expect(components).not.toContain(`### ${name}\n`);
      expect(full).not.toContain(`### ${name}\n`);
    }
    expect(components).toContain('### Tooltip\n');
  });

  it('embeds DESIGN.md in full', () => {
    expect(read('public/llms-full.txt')).toContain(read('DESIGN.md').trim().slice(0, 200));
  });

  it('writes non-empty slices', () => {
    for (const s of ['layout', 'tokens', 'scroll', 'components']) {
      const p = join(ROOT, 'public', 'llms', `${s}.txt`);
      expect(existsSync(p), s).toBe(true);
      expect(statSync(p).size, s).toBeGreaterThan(200);
    }
  });

  it('shares text between llms.txt and its slices', () => {
    expect(read('public/llms.txt')).toContain('## How To Build A Scroll-Driven Section');
    expect(read('public/llms/scroll.txt')).toContain('## How To Build A Scroll-Driven Section');
    expect(read('public/llms/layout.txt')).toContain('## Elevation roles');
    expect(read('public/llms/tokens.txt')).toContain('## Quick Token Reference');
    expect(read('public/llms/components.txt')).toContain('## Component Inventory');
  });

  it('indexes the slices and the repo-only paths in llms.txt and llms-full.txt', () => {
    for (const f of ['public/llms.txt', 'public/llms-full.txt']) {
      expect(read(f)).toContain('llms/components.txt');
    }
    expect(read('public/llms.txt')).toMatch(/only in the source repo/);
  });

  it('never mentions the old personal domain', () => {
    const files = ['llms.txt', 'public/llms.txt', 'public/llms-full.txt'];
    for (const f of readdirSync(join(ROOT, 'public', 'llms'))) files.push(`public/llms/${f}`);
    for (const f of files) expect(read(f), f).not.toContain('adrianmilsap.com');
  });
});

describe('manifest agent URLs', () => {
  it('points at the current host and the shipped entrypoint', () => {
    const m = JSON.parse(read('public/hds-manifest.json'));
    expect(m.llmsTxt).toBe('https://hirobius-design-system.vercel.app/llms.txt');
    expect(m.docs).toBe('https://hirobius-design-system.vercel.app/');
    expect(m.agentEntrypoint).toBe('llms.txt');
    expect(Array.isArray(m.componentInventory)).toBe(true);
    expect(m.componentInventory.length).toBeGreaterThan(0);
  });
});
