/**
 * Storybook front door (#308). The public Storybook is the first thing a
 * reviewer opens, so this pins what it promises without needing a build:
 *
 *   - retitling keeps every story id that existed before (links in the wild),
 *   - no kebab-case leaf titles reach the sidebar,
 *   - exactly the internal components (none since 0.20.0) are hidden from it,
 *   - the landing page, brand theme and share tags exist and stay honest.
 *
 * Ids are derived from source (scripts/lib/story-link.mjs) so this runs with no
 * build; the story-link parity test checks that derivation against a real
 * index.json whenever one is present.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveStoryId,
  findStoryFiles,
  parseMetaTitle,
  parseStoryExports,
  sanitize,
} from '../lib/story-link.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// None left: five hidden internals were deleted in 0.20.0 (hds#389) and the
// last, HistoryCard, in the same release (hds#394).
const HIDDEN_FILES = [];

const files = findStoryFiles(ROOT).map((p) => ({ path: p, source: read(p) }));
const isHidden = (source) => /^\s*tags:\s*\[[^\]]*['"]!dev['"][^\]]*\]/m.test(source);

const derived = new Set();
const hiddenTitles = new Set();
for (const { source } of files) {
  const title = parseMetaTitle(source);
  if (!title) continue;
  if (isHidden(source)) hiddenTitles.add(sanitize(title));
  for (const key of parseStoryExports(source)) derived.add(deriveStoryId(title, key));
  if (/tags:\s*\[[^\]]*['"]autodocs['"]/.test(source)) derived.add(`${sanitize(title)}--docs`);
}

describe('retitled stories keep their ids', () => {
  const { ids } = JSON.parse(read('scripts/__tests__/fixtures/storybook-baseline-ids.json'));

  it('every pre-retitle id is still derivable, except the hidden internals', () => {
    const visible = ids.filter((id) => ![...hiddenTitles].some((t) => id.startsWith(`${t}--`)));
    const missing = visible.filter((id) => !derived.has(id));
    expect(missing).toEqual([]);
  });

  it('adds no ids beyond the landing page', () => {
    const extra = [...derived].filter((id) => !ids.includes(id));
    expect(extra).toEqual([]);
  });
});

describe('sidebar titles', () => {
  it('has no kebab-case or all-lowercase leaf titles', () => {
    const bad = files
      .map(({ path: p, source }) => [p, parseMetaTitle(source)])
      .filter(([, t]) => t && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.split('/').pop()))
      .map(([p, t]) => `${p}: ${t}`);
    expect(bad).toEqual([]);
  });
});

describe('hidden internals', () => {
  it('hides exactly the internal components', () => {
    const hidden = files.filter(({ source }) => isHidden(source)).map(({ path: p }) => p);
    expect(hidden.sort()).toEqual([...HIDDEN_FILES].sort());
  });
});

describe('published build', () => {
  it('leaves the same internals out of the production stories glob', () => {
    const main = read('.storybook/main.ts');
    const list = /INTERNAL_STORY_FILES\s*=\s*\[([^\]]*)\]/.exec(main)[1];
    const names = [...list.matchAll(/'([^']+)'/g)].map((m) => `src/stories/${m[1]}.stories.tsx`);
    expect(names.sort()).toEqual([...HIDDEN_FILES].sort());
  });
});

describe('published build gating', () => {
  it('drops the internals only when HDS_STORYBOOK_PUBLIC=1, so docs-site and Chromatic builds keep them', () => {
    const main = read('.storybook/main.ts');
    expect(main).toMatch(/process\.env\.HDS_STORYBOOK_PUBLIC\s*===\s*'1'/);
    expect(main).not.toMatch(/configType\s*===\s*'PRODUCTION'/);
  });

  it('sets the flag in the Vercel build command only', () => {
    const vercel = JSON.parse(read('vercel.json'));
    expect(vercel.buildCommand).toMatch(/HDS_STORYBOOK_PUBLIC=1\s+pnpm build-storybook/);
    for (const wf of ['chromatic.yml', 'ci.yml']) {
      expect(read(`.github/workflows/${wf}`)).not.toContain('HDS_STORYBOOK_PUBLIC');
    }
  });

  it('has no nested story files the flat production listing would miss', () => {
    const nested = findStoryFiles(ROOT).filter((p) =>
      p.replace(/\\/g, '/').split('src/stories/')[1]?.includes('/'),
    );
    expect(nested).toEqual([]);
  });
});

describe('brand assets', () => {
  it('pins the wordmark width so a fallback font cannot clip it', () => {
    const logo = read('.storybook/static/hds-logo.svg');
    expect(logo).toMatch(/<text[^>]*textLength="\d+"[^>]*lengthAdjust="spacingAndGlyphs"/);
    const vb = /viewBox="0 0 (\d+) \d+"/.exec(logo);
    const x = /<text[^>]*\bx="(\d+)"/.exec(logo);
    const len = /textLength="(\d+)"/.exec(logo);
    expect(Number(x[1]) + Number(len[1])).toBeLessThanOrEqual(Number(vb[1]));
  });

  it('pins the share-image title width inside the canvas', () => {
    const og = read('.storybook/static/og-image.svg');
    const title =
      /<text[^>]*textLength="(\d+)"[^>]*lengthAdjust="spacingAndGlyphs"[^>]*>Hirobius Design System</.exec(
        og,
      );
    const x = /<text[^>]*\bx="(\d+)"[^>]*textLength/.exec(og);
    expect(title).not.toBeNull();
    expect(Number(x[1]) + Number(title[1])).toBeLessThanOrEqual(1200 - 96);
  });
});

describe('landing page and brand', () => {
  it('has an Introduction docs page that makes no untrue CI claims', () => {
    const mdx = read('src/stories/Introduction.mdx');
    expect(mdx).toMatch(/<Meta title="Introduction"/);
    expect(mdx).not.toMatch(/chromatic/i);
    expect(mdx).not.toMatch(/axe/i);
    expect(mdx).not.toMatch(/Each component page has[^.]*Design tab/);
    expect(mdx).toMatch(/Components with a Figma node\s+have a Design tab/);
    expect(mdx).not.toMatch(/switch them here/);
    expect(mdx).toMatch(/switch theme, density and brand here/);
    expect(mdx).toMatch(/npmjs\.com/);
    expect(mdx).toMatch(/github\.com\/hirobius\/hds/);
  });

  it('sorts Introduction, Foundations, Primitives, Patterns first', () => {
    const preview = read('.storybook/preview.tsx');
    expect(preview).toMatch(
      /storySort[\s\S]*order:\s*\[\s*'Introduction',\s*'Foundations',\s*'Primitives'[\s\S]*'Patterns'/,
    );
    expect(preview).toMatch(/'Primitives',\s*\[\s*'Button'/);
  });

  it('themes the manager with the HDS brand', () => {
    const manager = read('.storybook/manager.ts');
    expect(manager).toMatch(/brandTitle:\s*'Hirobius Design System'/);
    expect(manager).toMatch(/brandUrl:/);
    expect(manager).toMatch(/brandImage:/);
    expect(existsSync(path.join(ROOT, '.storybook/static/hds-logo.svg'))).toBe(true);
  });

  it('sets share metadata in manager-head.html', () => {
    const head = read('.storybook/manager-head.html');
    for (const p of ['og:title', 'og:description', 'og:image']) expect(head).toContain(p);
  });
});
