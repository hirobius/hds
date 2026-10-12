/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLMS_BASE_URL, buildLlmsIndex } from '../lib/llms-index.mjs';
import { generateLlmsTxt } from '../generate-llms-txt.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outputs = generateLlmsTxt({ write: false });
const index = outputs['public/llms.txt'];

describe('llms.txt is a conformant index', () => {
  it('opens with the H1, then a one-line > summary', () => {
    const lines = index.split('\n');
    expect(lines[0]).toBe('# Hirobius Design System');
    expect(lines[1]).toBe('');
    expect(lines[2]).toMatch(/^> \S.{20,}$/);
  });

  it('puts the start-here pointers first: AGENTS.md, npx hds-mcp, the ESLint plugin', () => {
    const first = index.split(/^## /m)[1];
    expect(first.startsWith('Start here')).toBe(true);
    expect(first).toContain('[AGENTS.md]');
    expect(first).toContain('npx hds-mcp');
    expect(first).toContain('eslint-plugin');
  });

  it('is H2 sections of `- [name](url): note` links and ends with ## Optional', () => {
    const sections = index.split(/^## /m).slice(1);
    const titles = sections.map((s) => s.split('\n')[0]);
    expect(titles.at(-1)).toBe('Optional');
    for (const t of ['Full bundle', 'Topic slices', 'Reference data', 'Docs']) {
      expect(titles).toContain(t);
    }
    for (const s of sections) {
      const items = s.split('\n').slice(1).filter(Boolean);
      for (const l of items) expect(l, l).toMatch(/^- \[[^\]]+\]\(https:\/\/[^)\s]+\): \S/);
    }
  });

  it('links every required target through the one base URL', () => {
    for (const p of [
      'public/llms-full.txt',
      'public/llms/layout.txt',
      'public/llms/tokens.txt',
      'public/llms/scroll.txt',
      'public/llms/components.txt',
      'public/hds-manifest.json',
      'src/app/data/component-api.json',
      'hirobius.tokens.json',
      'DESIGN.md',
      'CONSUMING.md',
      'UPGRADING.md',
    ]) {
      expect(index).toContain(`](${LLMS_BASE_URL}/${p})`);
    }
    const urls = [...index.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    for (const u of urls) expect(u.startsWith(`${LLMS_BASE_URL}/`), u).toBe(true);
  });

  it('carries no timestamp and is deterministic', () => {
    expect(index).not.toMatch(/Generated:|\d{4}-\d{2}-\d{2}T/);
    expect(generateLlmsTxt({ write: false })['public/llms.txt']).toBe(index);
  });

  it('mirrors to the package root', () => {
    expect(outputs['llms.txt']).toBe(index);
  });

  it('keeps the host in one constant', () => {
    const src = readFileSync(join(ROOT, 'scripts', 'generate-llms-txt.mjs'), 'utf8');
    expect(src).not.toMatch(/unpkg\.com|vercel\.app/);
    expect(buildLlmsIndex({ summary: 'x'.repeat(30), slices: [] })).toContain(LLMS_BASE_URL);
  });
});

describe('llms-full.txt keeps the body the old llms.txt had', () => {
  const full = outputs['public/llms-full.txt'];
  it('holds every section that moved out of the index', () => {
    for (const h of [
      '## Voice',
      '## Pick By Need',
      '## How To Lay Out A Screen',
      '## How To Build A Scroll-Driven Section',
      '## HDS Card Anatomy',
      '## Elevation roles',
      '## Quick Token Reference',
      '## Token Rules',
      '## Key Files',
      '## Component Props Digest',
      '# DESIGN.md (full)',
    ]) {
      expect(full, h).toContain(h);
    }
    expect(full).not.toMatch(/Generated:/);
  });
});
