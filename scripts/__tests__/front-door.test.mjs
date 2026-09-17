/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Front-door contract: what a first-time reviewer, npm, and GitHub read before
 * they open any source file.
 *
 * Seams under test:
 *   1. Package metadata — the root LICENSE file and package.json fields that
 *      npm and GitHub's license detection read.
 *   2. README claims — every count, command, and status line in README.md must
 *      match the repo as it is, so the front door cannot drift into a claim a
 *      reviewer disproves by opening one file.
 *   3. Figma claims in the core docs — no Figma command, script, or automatic
 *      sync is described unless the repo actually has it, and the ADR trail
 *      records which Figma decision is current (ADR-025).
 *
 * Reads repo files only; writes nothing; spawns nothing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

// ── Repo facts (the independent source the docs are checked against) ─────────
/** Component modules re-exported by the public barrel (`src/index.ts`). */
function countBarrelComponentModules() {
  return read('src/index.ts')
    .split('\n')
    .filter((line) => /^export \* from '\.\/app\/components\//.test(line)).length;
}

/** DTCG leaf tokens (objects carrying `$value`) in hirobius.tokens.json. */
function countTokens() {
  let n = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      n++;
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child);
  };
  walk(JSON.parse(read('hirobius.tokens.json')));
  return n;
}

/** CSF story files under src/ and the named story exports inside them. */
function countStories() {
  const files = readdirSync(join(ROOT, 'src'), { recursive: true })
    .map(String)
    .filter((p) => p.endsWith('.stories.tsx'));
  const stories = files.reduce(
    (sum, rel) =>
      sum +
      readFileSync(join(ROOT, 'src', rel), 'utf8')
        .split('\n')
        .filter((l) => /^export const [A-Z]/.test(l)).length,
    0,
  );
  return { files: files.length, stories };
}

/** README prose with markdown emphasis stripped, so `**108**` reads as `108`. */
const readmeText = () => read('README.md').replace(/\*\*|__/g, '');

/** A number the README states immediately before `phrase`, or null. */
function claimedCount(text, phrase) {
  const m = text.match(new RegExp(`(\\d[\\d,]*)\\s+${phrase}`));
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

const PNPM_BUILTINS = new Set(['install', 'exec', 'add', 'dlx']);

// ── 1. Package metadata ───────────────────────────────────────────────────────
describe('package metadata', () => {
  it('ships the license as a root LICENSE file, not a directory', () => {
    expect(statSync(join(ROOT, 'LICENSE')).isFile()).toBe(true);
  });

  it('LICENSE carries the MIT text GitHub license detection matches', () => {
    const text = read('LICENSE');
    expect(text.startsWith('MIT License')).toBe(true);
    expect(text).toContain('Permission is hereby granted, free of charge');
    expect(text).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it('package.json declares the same license', () => {
    expect(pkg.license).toBe('MIT');
  });

  it('package.json points npm at this repository', () => {
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/hirobius/hds.git',
    });
    expect(pkg.homepage).toBe('https://github.com/hirobius/hds#readme');
    expect(pkg.bugs).toEqual({ url: 'https://github.com/hirobius/hds/issues' });
  });
});

// ── 2. README claims ──────────────────────────────────────────────────────────
describe('README claims', () => {
  it('does not describe the project as stalled', () => {
    expect(readmeText()).not.toMatch(/\bstall(ed|ing)?\b/i);
  });

  it('states the public component count from the barrel, not the file count', () => {
    expect(claimedCount(readmeText(), 'public component modules')).toBe(
      countBarrelComponentModules(),
    );
  });

  it('states the DTCG token count from hirobius.tokens.json', () => {
    expect(claimedCount(readmeText(), 'DTCG tokens')).toBe(countTokens());
  });

  it('states the Storybook story and story-file counts from src/', () => {
    const { files, stories } = countStories();
    expect(claimedCount(readmeText(), 'Storybook stories')).toBe(stories);
    expect(claimedCount(readmeText(), 'story files')).toBe(files);
  });

  it('only names pnpm commands that exist and are not retired', () => {
    const named = [...readmeText().matchAll(/\bpnpm (?:run )?([a-z][\w:.-]*)/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    const broken = named.filter((name) => {
      if (PNPM_BUILTINS.has(name)) return false;
      const script = pkg.scripts[name];
      return script === undefined || /\bRETIRED\b/.test(script);
    });
    expect(broken).toEqual([]);
  });

  it('does not describe the retired Playwright browser suite as live', () => {
    expect(readmeText()).not.toMatch(/Playwright/);
  });

  it('does not claim live Figma Code Connect mappings', () => {
    expect(readmeText()).not.toMatch(/\d+\s+(Figma\s+)?Code Connect mappings/i);
  });
});

// ── 3. Figma claims in the core docs ─────────────────────────────────────────
/** Docs agents and reviewers read as current truth (ADRs are history, so excluded). */
const CORE_DOCS = [
  'README.md',
  'CLAUDE.md',
  'DESIGN-HANDOFF.md',
  'SYSTEMS_REGISTRY.md',
  'docs/rules/MANIFEST_SYNC.md',
];

/** Workflow YAML with comment lines removed, so an "archived: figma-sync" note does not count. */
function activeWorkflowsRunFigma() {
  const dir = join(ROOT, '.github', 'workflows');
  return readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .some((f) =>
      readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !l.trim().startsWith('#'))
        .some((l) => /figma/i.test(l)),
    );
}

/** The `**Status:**` line of an ADR, by number. */
function adrStatus(number) {
  const file = readdirSync(join(ROOT, 'docs', 'adr')).find((f) => f.startsWith(`${number}-`));
  if (!file) return null;
  const line = read(`docs/adr/${file}`)
    .split('\n')
    .find((l) => l.includes('**Status:**'));
  return { file, line: line ?? '' };
}

describe('Figma claims in the core docs', () => {
  it('names only pnpm Figma commands that exist', () => {
    const missing = CORE_DOCS.flatMap((doc) =>
      [...read(doc).matchAll(/\bpnpm (?:run )?([\w:.-]*figma[\w:.-]*)/gi)]
        .map((m) => m[1])
        .filter((name) => pkg.scripts[name] === undefined)
        .map((name) => `${doc}: pnpm ${name}`),
    );
    expect(missing).toEqual([]);
  });

  it('names only Figma scripts that exist in scripts/', () => {
    const missing = CORE_DOCS.flatMap((doc) =>
      [...read(doc).matchAll(/`(?:scripts\/)?([\w.-]*figma[\w.-]*\.(?:mjs|ts))`/gi)]
        .map((m) => m[1])
        .filter((name) => {
          try {
            return !statSync(join(ROOT, 'scripts', name)).isFile();
          } catch {
            return true;
          }
        })
        .map((name) => `${doc}: ${name}`),
    );
    expect(missing).toEqual([]);
  });

  // Skipped (not silently passed) once an active workflow really runs a Figma step.
  it.skipIf(activeWorkflowsRunFigma())(
    'lists no automatic Figma trigger while no active workflow runs one',
    () => {
      const registry = read('SYSTEMS_REGISTRY.md');
      const triggers = registry.slice(
        registry.indexOf('## Triggers'),
        registry.indexOf('### Prepare step'),
      );
      const figmaRows = triggers.split('\n').filter((l) => l.startsWith('|') && /figma/i.test(l));
      expect(figmaRows).toEqual([]);
    },
  );

  it('does not say Figma native import reads the token file or its mode extension', () => {
    const handoff = read('DESIGN-HANDOFF.md');
    expect(handoff).not.toMatch(/native import reads/i);
    expect(handoff).not.toMatch(/Import\s*(->|→)\s*`hirobius\.tokens\.json`/);
  });

  it('records ADR-025 as the Figma sync architecture, superseding ADR-019 §2', () => {
    const adr025 = adrStatus('025');
    expect(adr025).not.toBeNull();
    const body = read(`docs/adr/${adr025.file}`);
    expect(body).toMatch(/^# ADR-025: /);
    for (const heading of ['## Context', '## Decision', '## Rationale', '## Consequences']) {
      expect(body).toContain(heading);
    }
    expect(body).toMatch(/Supersedes[^\n]*ADR-019 §2/);
    expect(body).toMatch(/\|\s*Capability\s*\|\s*Pro\s*\|\s*Organization\s*\|\s*Enterprise\s*\|/);
    expect(adrStatus('019').line).toMatch(/§2[^\n]*superseded by[^\n]*ADR-025/i);
  });

  it('marks ADR-004 (the retired in-house plugin) as superseded', () => {
    expect(adrStatus('004').line).toMatch(/Superseded by ADR-019/);
  });
});
