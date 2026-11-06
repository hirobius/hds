/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Live evidence for the walkthrough's terminal panels (hds#1148). Every line a
 * panel shows is read or run here at record time — no hard-coded numbers — so
 * the video tells the truth about the repo the day it was recorded. Output is
 * redacted of local paths (redactPaths) before it reaches a panel.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { redactPaths } from './chapters.mjs';

const TOKEN_PATH = ['semantic', 'color', 'surface', 'raised'];
const CSS_VAR = '--semantic-color-surface-raised';

/** Run a node script in the repo; returns { code, lines }. */
function run(root, args, env = {}, files = []) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...env },
    encoding: 'utf8',
  });
  const text = redactPaths(`${r.stdout ?? ''}${r.stderr ?? ''}`, files, { root });
  return { code: r.status ?? 1, lines: text.replace(/\s+$/, '').split('\n') };
}

/** The token as written in hirobius.tokens.json. */
export function tokenLines(root) {
  const tokens = JSON.parse(readFileSync(path.join(root, 'hirobius.tokens.json'), 'utf8'));
  const t = TOKEN_PATH.reduce((o, k) => o?.[k], tokens);
  if (!t) throw new Error(`token ${TOKEN_PATH.join('.')} not found`);
  const modes = t.$extensions?.['com.figma.variables']?.modes ?? {};
  return [
    `"${TOKEN_PATH.join('.')}": {`,
    `  "$value": "${t.$value}",`,
    `  "$description": "${t.$description}",`,
    ...Object.entries(modes).map(([m, v]) => `  mode ${m}: "${v}"`),
    '}',
  ];
}

/** The generated CSS variable, light and dark, from dist/variables.css. */
export function cssLines(root) {
  const file = path.join(root, 'dist', 'variables.css');
  if (!existsSync(file)) throw new Error('dist/variables.css missing: run pnpm build:lib');
  const lines = readFileSync(file, 'utf8').split('\n');
  const out = [];
  let selector = '';
  for (const line of lines) {
    if (/\{\s*$/.test(line)) selector = line.replace(/\s*\{\s*$/, '').trim();
    if (line.trim().startsWith(`${CSS_VAR}:`)) {
      out.push(`${selector} {`, `  ${line.trim()}`, '}');
    }
  }
  return out;
}

/** The same variable as Figma holds it, from the committed snapshot. */
export function figmaLines(root) {
  const snap = JSON.parse(readFileSync(path.join(root, 'figma', 'snapshot.json'), 'utf8'));
  let found = null;
  JSON.stringify(snap, (k, v) => {
    if (!found && v && typeof v === 'object' && v.path === TOKEN_PATH.join('.')) found = v;
    return v;
  });
  if (!found) throw new Error('token not in figma/snapshot.json');
  return [
    `name: ${found.name}`,
    `codeSyntax.WEB: ${found.codeSyntax?.WEB ?? '—'}`,
    ...Object.entries(found.valuesByMode ?? {}).map(
      ([m, v]) => `${m}: ${v.to ?? JSON.stringify(v)}`,
    ),
  ];
}

/** `pnpm check:figma-drift`, run now. */
export function driftRun(root) {
  return run(root, ['scripts/check-figma-drift.mjs']);
}

/**
 * The spacing gate catching a raw integer, then passing once it is a named
 * step. Runs the real gate on a throwaway file in the OS temp folder.
 */
export function gateRuns(root) {
  const dir = mkdtempSync(path.join(tmpdir(), 'hds-walkthrough-'));
  const file = path.join(dir, 'plan-row.tsx');
  const rel = path.relative(root, file);
  const files = [file, rel];
  const source = (sx) => [
    "import { Box } from '@hirobius/design-system';",
    '',
    'export function PlanRow() {',
    `  return <Box sx={{ ${sx} }}>Plan</Box>;`,
    '}',
  ];
  const env = { HDS_FIXTURE_MODE: '1', FIXTURE_FILE: file };
  try {
    const bad = source('p: 4, gap: 2');
    writeFileSync(file, `${bad.join('\n')}\n`);
    const fail = run(root, ['scripts/check-spacing-vocabulary.mjs'], env, files);
    const good = source("p: 'lg', gap: 'sm'");
    writeFileSync(file, `${good.join('\n')}\n`);
    const pass = run(root, ['scripts/check-spacing-vocabulary.mjs'], env, files);
    return { bad, good, fail, pass };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A pending changeset (or a sample when none is pending) and the release gate. */
export function releaseEvidence(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const dir = path.join(root, '.changeset');
  const pending = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .sort()
    : [];
  const changeset = pending.length
    ? {
        name: `.changeset/${pending[0]}`,
        lines: readFileSync(path.join(dir, pending[0]), 'utf8').trim().split('\n').slice(0, 8),
      }
    : {
        name: '.changeset/example.md (sample)',
        lines: ['---', `'${pkg.name}': patch`, '---', '', 'Describe the change for the changelog.'],
      };
  const gate = run(root, ['scripts/check-figma-release.mjs']);
  return { name: pkg.name, version: pkg.version, changeset, gate };
}

/** Everything the panels need, collected once before recording. */
export function collectEvidence(root) {
  return {
    token: tokenLines(root),
    css: cssLines(root),
    figma: figmaLines(root),
    drift: driftRun(root),
    gates: gateRuns(root),
    release: releaseEvidence(root),
  };
}
