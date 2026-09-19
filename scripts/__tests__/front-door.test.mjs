/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Front-door contract: what a first-time reviewer, npm, and GitHub read before
 * they open any source file.
 *
 * Seams under test:
 *   1. Package metadata — the root LICENSE file, the license notice, and the
 *      package.json fields that npm and GitHub's license detection read. The
 *      license field has to describe the fonts the package embeds, not only the
 *      code.
 *   2. README claims — the generated count bullets never claim more than the
 *      source has, and every command and status line matches the repo. Counts
 *      are checked one way (claim <= source) so a PR that adds tokens, stories,
 *      or components never turns main red through merge order.
 *   3. Figma claims in the core docs — no Figma command, script, automatic sync,
 *      or Code Connect readiness is described unless the repo has it; the legacy
 *      variable export the docs still offer really carries what the model has
 *      (Dark values and the role tier); and a Proposed ADR is not presented as
 *      settled architecture.
 *
 * Reads repo files. The export check copies the exporter and the token file to
 * an OS temp directory and runs it there with `node`, so nothing in the repo is
 * written. Spawns no git.
 */

import { describe, it, expect } from 'vitest';
import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  cpSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  collectCounts,
  readClaims,
  findOverclaims,
  COUNTS_BLOCK,
} from '../build-readme-counts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

/** README prose with markdown emphasis stripped, so `**108**` reads as `108`. */
const readmeText = () => read('README.md').replace(/\*\*|__/g, '');

const PNPM_BUILTINS = new Set(['install', 'exec', 'add', 'dlx']);

// ── 1. Package metadata ───────────────────────────────────────────────────────
/**
 * License of each font family that scripts/embed-fonts.mjs inlines into
 * dist/tokens.css. `spdx: null` means the license has no SPDX identifier, so
 * npm cannot express it in an SPDX `license` field.
 */
const FONT_LICENSES = {
  satoshi: { family: 'Satoshi', license: 'ITF Free Font License', spdx: null },
  'geist-mono': { family: 'Geist Mono', license: 'SIL Open Font License 1.1', spdx: 'OFL-1.1' },
};

/** Font family directories (`/fonts/<family>/…`) the library build embeds. */
function embeddedFontFamilies() {
  const script = read('scripts/embed-fonts.mjs');
  const list = script.slice(script.indexOf('const FONTS = ['), script.indexOf('];'));
  return [...new Set([...list.matchAll(/'\/fonts\/([\w-]+)\//g)].map((m) => m[1]))];
}

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

  it('knows the license of every font the library build embeds', () => {
    const families = embeddedFontFamilies();
    expect(families.length).toBeGreaterThan(0);
    const unknown = families.filter((f) => !(f in FONT_LICENSES));
    // An unknown family: add it to FONT_LICENSES, NOTICE.md and package.json `license`.
    expect(unknown).toEqual([]);
  });

  it('package.json license covers the MIT code and every embedded font, not bare MIT', () => {
    const fonts = embeddedFontFamilies().map((f) => FONT_LICENSES[f]);
    if (fonts.every((f) => f.spdx)) {
      const ids = ['MIT', ...new Set(fonts.map((f) => f.spdx))];
      expect(pkg.license).toBe(ids.join(' AND '));
      return;
    }
    // A font without an SPDX id: npm's form for that is `SEE LICENSE IN <file>`.
    const match = /^SEE LICENSE IN (\S+)$/.exec(pkg.license ?? '');
    expect(match, `package.json license is ${JSON.stringify(pkg.license)}`).not.toBeNull();
    const notice = match[1];
    expect(pkg.files).toContain(notice);
    const text = read(notice);
    expect(text).toMatch(/\bMIT\b/);
    expect(text).toContain('LICENSE');
    for (const { family, license } of fonts) {
      expect(text).toContain(family);
      expect(text).toContain(license);
    }
    expect(read('README.md')).toContain(`](${notice})`);
  });

  it('keeps the notice out of GitHub license detection', () => {
    // Licensee (GitHub's detector) scores root files named like LICENSE-*, *-LICENSE,
    // or COPYING* as license files. A second one with different text can turn the
    // detected MIT into "Other", so the notice must not use such a name.
    const extra = readdirSync(ROOT).filter(
      (f) => f !== 'LICENSE' && /licen[sc]e|copy(ing|right)/i.test(f),
    );
    expect(extra).toEqual([]);
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

  it('keeps the counts in a generated block', () => {
    const readme = read('README.md');
    expect(readme).toContain(`<!-- auto:start:${COUNTS_BLOCK} -->`);
    expect(readme).toContain(`<!-- auto:end:${COUNTS_BLOCK} -->`);
    expect(pkg.scripts['readme:counts']).toBe('node scripts/build-readme-counts.mjs');
    // Token PRs already run `pnpm tokens`, so they regenerate the README counts too.
    expect(pkg.scripts.tokens).toContain('node scripts/build-readme-counts.mjs');
  });

  it('never claims more components, tokens, stories, or story files than the source has', () => {
    // A failure here means the source shrank: run `pnpm readme:counts`.
    const overclaims = findOverclaims(readClaims(read('README.md')), collectCounts(ROOT));
    expect(overclaims).toEqual([]);
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

/** Sentences of a markdown doc, with line breaks inside a paragraph joined. */
function sentences(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^\s*(?:>|[-*]|\d+\.)\s+/gm, '').replace(/\s*\n\s*/g, ' '))
    .flatMap((block) => block.split(/(?<=[.!?]["”]?)\s+/));
}

/**
 * Runs `pnpm figma-variables` (scripts/build-figma-variables.mjs) on a temp copy
 * and measures its plugin-import file against the token source: how many
 * variables carry a Dark value that differs from Light, and which collections
 * came out. The tests below assert those numbers directly.
 *
 * This used to return a defect list that a `skipIf` consumed, so the check
 * disappeared the moment the exporter was fixed (#213/#215) and a regression
 * would have restored the silence instead of failing.
 *
 * All of `scripts/lib` is copied alongside the exporter, so whichever local
 * modules it imports (today `lib/figma-model.mjs`) resolve in the temp copy.
 */
function figmaVariablesExport() {
  const dir = mkdtempSync(join(tmpdir(), 'hds-figma-export-'));
  try {
    mkdirSync(join(dir, 'scripts'));
    cpSync(join(ROOT, 'scripts', 'lib'), join(dir, 'scripts', 'lib'), { recursive: true });
    copyFileSync(
      join(ROOT, 'scripts', 'build-figma-variables.mjs'),
      join(dir, 'scripts', 'build-figma-variables.mjs'),
    );
    copyFileSync(join(ROOT, 'hirobius.tokens.json'), join(dir, 'hirobius.tokens.json'));
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
    );
    execFileSync(process.execPath, [join(dir, 'scripts', 'build-figma-variables.mjs')], {
      cwd: dir,
      env,
      stdio: 'pipe',
    });
    const exported = JSON.parse(readFileSync(join(dir, 'hirobius.figma-variables.json'), 'utf8'));

    let sourceDiffering = 0;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if ('$value' in node) {
        const modes = node.$extensions?.['com.figma.variables']?.modes;
        if (modes && JSON.stringify(modes.Light) !== JSON.stringify(modes.Dark)) sourceDiffering++;
        return;
      }
      for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child);
    };
    const tokens = JSON.parse(read('hirobius.tokens.json'));
    walk(tokens);

    const exportDiffering = exported.collections
      .filter((c) => c.modes.includes('Light') && c.modes.includes('Dark'))
      .flatMap((c) => c.variables)
      .filter(
        (v) => JSON.stringify(v.valuesByMode.Light) !== JSON.stringify(v.valuesByMode.Dark),
      ).length;

    return {
      collections: exported.collections.map((c) => ({
        name: c.name,
        modes: c.modes,
        variables: c.variables.length,
      })),
      sourceDiffering,
      exportDiffering,
      sourceHasRoleTier: Boolean(tokens.role),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const EXPORT = figmaVariablesExport();
const ADR_025_ACCEPTED = /\*\*Status:\*\*\s*Accepted/.test(adrStatus('025')?.line ?? '');

/** Docs that point readers at ADR-025, other than ADR-025 itself. */
const ADR_025_POINTERS = [
  ...CORE_DOCS,
  'docs/ROADMAP.md',
  'docs/adr/004-figma-cli-skipped.md',
  'docs/adr/019-figma-sync-via-mcp.md',
];

/** Code Connect is set up once the CLI, its config, and at least one v2 template exist. */
function codeConnectSetUp() {
  const templates = readdirSync(join(ROOT, 'src'), { recursive: true })
    .map(String)
    .filter((p) => p.endsWith('.figma.ts'));
  return (
    Boolean(pkg.devDependencies?.['@figma/code-connect']) &&
    existsSync(join(ROOT, 'figma.config.json')) &&
    templates.length > 0
  );
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

  // The docs offer `pnpm figma-variables` as a legacy export "projected from
  // the same model" (README, DESIGN-HANDOFF, SYSTEMS_REGISTRY, MANIFEST_SYNC).
  // These two assert the export really carries what the model has. Before
  // #213/#215 it flattened Dark onto Light and dropped the role tier, and the
  // docs had to warn readers off importing it.
  it('exports every Light/Dark distinction the token source has', () => {
    expect(EXPORT.sourceDiffering).toBeGreaterThan(0);
    expect(
      EXPORT.exportDiffering,
      `${EXPORT.exportDiffering} of ${EXPORT.sourceDiffering} variables differ between Light and Dark in the export`,
    ).toBeGreaterThanOrEqual(EXPORT.sourceDiffering);
  });

  it('exports the role tier as its own collection', () => {
    expect(
      EXPORT.sourceHasRoleTier,
      'hirobius.tokens.json no longer has a role tier — retire this assertion if that was intended',
    ).toBe(true);
    const role = EXPORT.collections.find((c) => c.name === 'Hirobius/Role');
    expect(role, `collections: ${EXPORT.collections.map((c) => c.name).join(', ')}`).toBeDefined();
    expect(role.variables).toBeGreaterThan(0);
  });

  it('does not say Figma native import reads the token file or its mode extension', () => {
    const handoff = read('DESIGN-HANDOFF.md');
    expect(handoff).not.toMatch(/native import reads/i);
    expect(handoff).not.toMatch(/Import\s*(->|→)\s*`hirobius\.tokens\.json`/);
  });

  it('ADR-025 follows the ADR-009 format and records the plan table', () => {
    const adr025 = adrStatus('025');
    expect(adr025).not.toBeNull();
    const body = read(`docs/adr/${adr025.file}`);
    expect(body).toMatch(/^# ADR-025: /);
    for (const heading of ['## Context', '## Decision', '## Rationale', '## Consequences']) {
      expect(body).toContain(heading);
    }
    expect(adr025.line).toMatch(/\*\*Status:\*\*\s*(Proposed|Accepted) \(\d{4}-\d{2}-\d{2}\)/);
    expect(adr025.line).toMatch(/ADR-019 §2/);
    expect(body).toMatch(/\|\s*Capability\s*\|\s*Pro\s*\|\s*Organization\s*\|\s*Enterprise\s*\|/);
  });

  it.skipIf(ADR_025_ACCEPTED)(
    'while ADR-025 is Proposed, no doc presents it as settled architecture',
    () => {
      const adr019 = adrStatus('019').line;
      expect(adr019).not.toMatch(/superseded by[^\n]*ADR-025/i);
      expect(adr019).toMatch(/ADR-025[^\n]*Proposed/);

      const settled = ADR_025_POINTERS.flatMap((doc) =>
        read(doc)
          .split('\n')
          .map((line, i) => ({ line, at: `${doc}:${i + 1}` }))
          .filter(({ line }) => /ADR-025|025-figma-sync/.test(line))
          .filter(({ line }) => !/propos/i.test(line))
          .filter(
            ({ line, at }) =>
              at.startsWith('CLAUDE.md') ||
              /\b(current|supersedes?|superseded|replaces?|replaced)\b/i.test(line),
          )
          .map(({ line, at }) => `${at}: ${line.trim()}`),
      );
      expect(settled).toEqual([]);
    },
  );

  it.skipIf(!ADR_025_ACCEPTED)(
    'once ADR-025 is Accepted, ADR-019 records §2 as superseded and no doc calls ADR-025 proposed',
    () => {
      expect(adrStatus('019').line).toMatch(/§2[^\n]*superseded by[^\n]*ADR-025/i);
      const stale = ADR_025_POINTERS.flatMap((doc) =>
        read(doc)
          .split('\n')
          .map((line, i) => ({ line, at: `${doc}:${i + 1}` }))
          .filter(({ line }) => /ADR-025[^\n]*Proposed|Proposed[^\n]*ADR-025/.test(line))
          .map(({ line, at }) => `${at}: ${line.trim()}`),
      );
      expect(stale).toEqual([]);
    },
  );

  it.skipIf(codeConnectSetUp())(
    'does not call Code Connect ready before the repo has a Code Connect setup',
    () => {
      const docs = [...CORE_DOCS, 'docs/ROADMAP.md', `docs/adr/${adrStatus('025').file}`];
      const unconditional = docs.flatMap((doc) =>
        sentences(read(doc))
          .filter((s) => /Code Connect[- ]ready/i.test(s))
          .filter((s) => !/\b(once|after)\b/i.test(s))
          .map((s) => `${doc}: ${s}`),
      );
      expect(unconditional).toEqual([]);
    },
  );

  it('marks ADR-004 (the retired in-house plugin) as superseded', () => {
    expect(adrStatus('004').line).toMatch(/Superseded by ADR-019/);
  });
});
