/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#628 phase 0 — "A and B must pass the lint plugin". The lint gate runs the
 * shipped ESLint plugin (scripts/eslint-plugin-hds, `recommended`, its error
 * rules) beside the harness's own violation scan, because the plugin sees things
 * the scan does not: a raw `<form>`, bare numbers on spacing props in `style`.
 * Tested at the seam: a direction's sources in, violations out.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import hds from '../eslint-plugin-hds/index.mjs';
import { scanApp } from '../lib/consistency/violations.mjs';
import { PLUGIN_KINDS } from '../lib/explorations/direction.mjs';
import { lintWithPlugin, mergeLintHits } from '../lib/explorations/plugin-lint.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

const app = (body) =>
  [
    "import { Button, Stack, Text } from '@hirobius/design-system';",
    'type Props = { label: string };',
    'export default function App({ label }: Props) {',
    '  return (',
    body,
    '  );',
    '}',
    '',
  ].join('\n');

const CLEAN = app('    <Stack direction="column" gap="normal"><Text>{label}</Text></Stack>');
const FORM = app('    <form onSubmit={() => {}}><Button type="submit">Save</Button></form>');
const SPACING = app(
  '    <Stack style={{ padding: 16, marginTop: 24 }}><Text>{label}</Text></Stack>',
);
const HEX = app("    <Text style={{ color: '#7c3aed' }}>{label}</Text>");

const brief = (hits) => hits.map((h) => [h.kind, h.file, h.line, h.match]);

describe('PLUGIN_KINDS', () => {
  it("is every rule the plugin's recommended config sets to error, so nothing it would fail is missed", () => {
    const rules = Object.assign({}, ...hds.configs.recommended.map((c) => c.rules));
    const errors = Object.keys(rules)
      .filter((id) => rules[id] === 'error')
      .sort();
    expect(PLUGIN_KINDS).toEqual(errors);
    expect(PLUGIN_KINDS).toContain('hds/no-raw-controls');
    expect(PLUGIN_KINDS).not.toContain('hds/prefer-hds-layout-primitive');
  });
});

describe('lintWithPlugin', () => {
  it('finds nothing in a clean TSX app (type annotations and all)', () => {
    expect(lintWithPlugin({ 'src/App.tsx': CLEAN })).toEqual([]);
  });

  it('flags a raw <form>, which the harness scan does not see', () => {
    expect(scanApp({ 'src/App.tsx': FORM })).toEqual([]);
    expect(brief(lintWithPlugin({ 'src/App.tsx': FORM }))).toEqual([
      ['hds/no-raw-controls', 'src/App.tsx', 5, 'form'],
    ]);
  });

  it('flags bare numbers on spacing props in style, which the harness scan does not see', () => {
    expect(scanApp({ 'src/App.tsx': SPACING })).toEqual([]);
    expect(brief(lintWithPlugin({ 'src/App.tsx': SPACING }))).toEqual([
      ['hds/no-raw-px-spacing', 'src/App.tsx', 5, '16'],
      ['hds/no-raw-px-spacing', 'src/App.tsx', 5, '24'],
    ]);
  });

  it('ignores eslint-disable comments: a direction cannot switch the gate off', () => {
    const disabled = `/* eslint-disable */\n${FORM.replace(
      '    <form',
      '    // eslint-disable-next-line hds/no-raw-controls\n    <form',
    )}`;
    expect(lintWithPlugin({ 'src/App.tsx': disabled }).map((h) => h.kind)).toEqual([
      'hds/no-raw-controls',
    ]);
  });

  it('reports warnings from the recommended config as nothing: only its errors gate', () => {
    // prefer-hds-layout-primitive is a warning in `recommended`
    const div = app('    <div style={{ display: "flex" }}><Text>{label}</Text></div>');
    expect(lintWithPlugin({ 'src/App.tsx': div })).toEqual([]);
  });

  it('lints every code file under src/, and skips JSON and CSS', () => {
    const hits = lintWithPlugin({
      'src/App.tsx': CLEAN,
      'src/parts/Row.jsx': 'export const Row = () => <form />;\n',
      'src/fixture.json': '{ "a": "<form>" }',
      'src/x.css': '.a { padding: 16px; }',
    });
    expect(brief(hits)).toEqual([['hds/no-raw-controls', 'src/parts/Row.jsx', 1, 'form']]);
  });

  it('fails closed on a file it cannot parse, rather than reading it as clean', () => {
    const hits = lintWithPlugin({ 'src/App.tsx': 'export default function App( {' });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ kind: 'parse-error', file: 'src/App.tsx' });
  });
});

describe('mergeLintHits: one violation is one hit, whichever tool saw it', () => {
  it('folds a plugin hit into the scan hit for the same text on the same line', () => {
    const merged = mergeLintHits(
      scanApp({ 'src/App.tsx': HEX }),
      lintWithPlugin({ 'src/App.tsx': HEX }),
    );
    expect(brief(merged)).toEqual([['hex', 'src/App.tsx', 5, '#7c3aed']]);
  });

  it('folds a raw <button> seen by both into the scan hit', () => {
    const src = app('    <button type="button">Save</button>');
    const merged = mergeLintHits(
      scanApp({ 'src/App.tsx': src }),
      lintWithPlugin({ 'src/App.tsx': src }),
    );
    expect(brief(merged)).toEqual([['raw-control', 'src/App.tsx', 5, '<button']]);
  });

  it('keeps a plugin hit the scan has no counterpart for, in file and line order', () => {
    const src = `${FORM}export const X = () => <Text style={{ color: '#7c3aed' }}>x</Text>;\n`;
    const merged = mergeLintHits(
      scanApp({ 'src/App.tsx': src }),
      lintWithPlugin({ 'src/App.tsx': src }),
    );
    expect(brief(merged)).toEqual([
      ['hds/no-raw-controls', 'src/App.tsx', 5, 'form'],
      ['hex', 'src/App.tsx', 8, '#7c3aed'],
    ]);
  });

  it('keeps two different violations on one line apart', () => {
    const src = app('    <button style={{ padding: 16 }}>Save</button>');
    const merged = mergeLintHits(
      scanApp({ 'src/App.tsx': src }),
      lintWithPlugin({ 'src/App.tsx': src }),
    );
    expect(merged.map((h) => h.kind)).toEqual(['raw-control', 'hds/no-raw-px-spacing']);
  });
});

describe('loading cost', () => {
  it('loads ESLint and the TypeScript parser only when a direction is linted', () => {
    // eval-consistency.mjs imports the gates for every mode (even --help and the
    // plain consistency run), and ESLint plus its parser cost ~0.5 s to load.
    const probe = [
      "import { createRequire } from 'node:module';",
      'const cache = createRequire(import.meta.url).cache;',
      'const loaded = () => Object.keys(cache).filter((k) => /node_modules[\\\\/](eslint|@typescript-eslint)[\\\\/]/.test(k)).length;',
      // Everything eval-consistency.mjs imports from the explorations modules.
      "await import('./scripts/lib/explorations/live.mjs');",
      "await import('./scripts/lib/explorations/direction.mjs');",
      "const { judgeStatic } = await import('./scripts/lib/explorations/gates.mjs');",
      'const before = loaded();',
      "const { lintWithPlugin } = await import('./scripts/lib/explorations/plugin-lint.mjs');",
      "lintWithPlugin({ 'src/App.tsx': 'export default 1;\\n' });",
      'console.log(JSON.stringify({ before, after: loaded(), judge: typeof judgeStatic }));',
    ].join('\n');
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    expect(out.before).toBe(0);
    expect(out.after).toBeGreaterThan(0);
  }, 30000);
});
