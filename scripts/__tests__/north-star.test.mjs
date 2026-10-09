/**
 * North Star: one source (content/docs/north-star.mdx), derived everywhere.
 * Seams: parseNorthStar / voiceMarkdown / avoidedPhrases, and check-docs run
 * against a throwaway content root.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  avoidedPhrases,
  parseNorthStar,
  readNorthStar,
  voiceMarkdown,
} from '../lib/north-star.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

const SOURCE = `---
title: 'North Star'
description: 'How the docs speak.'
status: 'experimental'
---

## Voice

- Short sentences.
- Plain words.

## Words we don't use

- systems-first
- "seamless"
`;

describe('parseNorthStar', () => {
  it('reads the description, the Voice bullets and the avoid list', () => {
    expect(parseNorthStar(SOURCE)).toEqual({
      description: 'How the docs speak.',
      voice: ['Short sentences.', 'Plain words.'],
      avoid: ['systems-first', 'seamless'],
    });
  });

  it('reads the real brief', () => {
    const ns = readNorthStar(ROOT);
    expect(ns.description).not.toBe('');
    expect(ns.voice.length).toBeGreaterThan(0);
  });
});

describe('voiceMarkdown', () => {
  it('names the source and lists voice rules and words to avoid', () => {
    const md = voiceMarkdown(parseNorthStar(SOURCE));
    expect(md).toContain('content/docs/north-star.mdx');
    expect(md).toContain('- Short sentences.');
    expect(md).toContain(`- Don't use: "systems-first", "seamless".`);
  });
});

describe('avoidedPhrases', () => {
  it('matches whole phrases, any case', () => {
    expect(avoidedPhrases('A clean, Systems-First language.', ['systems-first'])).toEqual([
      'systems-first',
    ]);
    expect(avoidedPhrases('A first system.', ['systems-first'])).toEqual([]);
    expect(avoidedPhrases('seamlessly', ['seamless'])).toEqual([]);
  });
});

describe('the generated files carry the brief', () => {
  it('AGENTS.md and llms.txt both print the same Voice block', () => {
    const block = voiceMarkdown(readNorthStar(ROOT));
    expect(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')).toContain(block);
    expect(readFileSync(join(ROOT, 'llms.txt'), 'utf8')).toContain(block);
  });
});

describe('check-docs voice rule', () => {
  it('fails a page that uses a word the North Star rules out', () => {
    const root = mkdtempSync(join(tmpdir(), 'hds-ns-'));
    mkdirSync(join(root, 'content/docs'), { recursive: true });
    writeFileSync(
      join(root, 'content/docs/page.mdx'),
      "---\ntitle: 'Page'\ndescription: 'A page.'\nstatus: 'stable'\n---\n\nA systems-first page.\n",
    );
    let out = '';
    try {
      execFileSync('node', ['scripts/check-docs.mjs', '--root', root], {
        cwd: ROOT,
        stdio: 'pipe',
      });
    } catch (e) {
      out = String(e.stdout) + String(e.stderr);
    }
    expect(out).toContain('systems-first');
    expect(out).toContain('voice');
  });
});
