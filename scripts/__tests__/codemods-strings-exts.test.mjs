/**
 * hds#957: the codemods read .astro, .vue and .svelte files, and HDS names
 * inside strings (LLM prompts, docs snippets) are checked against the upgrade
 * ledger and the manifest and reported as warnings.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findStringWarnings } from '../../codemods/lib/strings.mjs';
import { CODE_EXTS } from '../../codemods/jsx-fold.mjs';
import { collectFiles } from '../../codemods/lib/scan.mjs';
import { runCodemod as runSubpath } from '../../codemods/patterns-subpath.mjs';
import { runCodemod as runPrefix } from '../../codemods/hds-prefix.mjs';
import { UpgradeReport } from '../upgrade/schema.mjs';

const ROOT = '@hirobius/design-system';

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hds-957-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('scanned extensions', () => {
  it('include .astro, .vue and .svelte', () => {
    for (const ext of ['.astro', '.vue', '.svelte']) expect(CODE_EXTS.has(ext)).toBe(true);
  });

  it('patterns-subpath rewrites the script of a .vue file', () => {
    const file = join(dir, 'Page.vue');
    writeFileSync(
      file,
      `<script setup lang="ts">\nimport { Page } from '${ROOT}';\n</script>\n<template><div /></template>\n`,
    );
    runSubpath({ root: dir, write: true });
    expect(readFileSync(file, 'utf8')).toContain(`import { Page } from '${ROOT}/patterns';`);
  });

  it('hds-prefix rewrites the frontmatter of an .astro file', () => {
    const file = join(dir, 'index.astro');
    writeFileSync(file, `---\nimport { HdsToggle } from '${ROOT}';\n---\n<HdsToggle />\n`);
    runPrefix({ root: dir, write: true });
    expect(readFileSync(file, 'utf8')).toContain(`import { Toggle as HdsToggle } from '${ROOT}';`);
  });

  it('the upgrade scan reads .svelte files as code', () => {
    writeFileSync(join(dir, 'A.svelte'), `<script>import { Page } from '${ROOT}';</script>\n`);
    expect(collectFiles(dir).map((f) => [f.rel, f.kind])).toEqual([['A.svelte', 'code']]);
  });
});

describe('findStringWarnings', () => {
  it('warns on a prompt string with <Stack direction="vertical">', () => {
    const src = `const prompt = 'Lay it out with <Stack direction="vertical" gap="normal"> blocks.';\n`;
    expect(findStringWarnings(src)).toEqual([
      {
        line: 1,
        text: '<Stack direction="vertical">: Stack direction takes row | column, not vertical',
      },
    ]);
  });

  it('reads escaped quotes and template literals with interpolation', () => {
    const src = [
      'const a = "Use <Stack direction=\\"vertical\\">";',
      'const b = `${intro}\\n<Stack direction="horizontal" />`;',
    ].join('\n');
    expect(findStringWarnings(src).map((w) => w.line)).toEqual([1, 2]);
  });

  it('names the ledger step for a removed component', () => {
    const src = 'const p = `Render a <Calendar /> next to the form`;\n';
    const [w] = findStringWarnings(src);
    expect(w.line).toBe(1);
    expect(w.text).toMatch(/^<Calendar>: Calendar is removed/);
  });

  it('leaves valid names, real JSX and non-HDS tags alone', () => {
    const src = [
      `import { Stack } from '${ROOT}';`,
      'const ok = \'<Stack direction="row"> and <Button variant="primary">\';',
      'const el = <Stack direction="vertical" />;',
      'const other = \'<MyWidget direction="vertical">\';',
      "const pal = '<CommandPalette />';", // removed in 0.20.0, reintroduced since
    ].join('\n');
    expect(findStringWarnings(src)).toEqual([]);
  });
});

describe('the upgrade command lists string warnings (hds#957)', () => {
  it('reports a prompt string as a non-blocking by-hand item', async () => {
    const { PKG, makeProject, pkgJson, pnpmLock, runCli } =
      await import('./helpers/upgrade-fixtures.mjs');
    const root = makeProject({
      'package.json': pkgJson('app-prompt', { [PKG]: '^0.21.0', react: '^18.3.1' }),
      'pnpm-lock.yaml': pnpmLock({ '.': '0.21.0' }),
      'scripts/prompt.mjs': `export const PROMPT = 'Use <Stack direction="vertical"> for each card.';\n`,
    });
    const res = runCli([
      'upgrade',
      '--root',
      root,
      '--to',
      '0.21.0',
      '--no-install',
      '--no-typecheck',
      '--json',
    ]);
    const report = JSON.parse(res.stdout);
    expect(UpgradeReport.safeParse(report).success).toBe(true);
    const { doByHand } = report;
    const item = doByHand.find((i) => i.id.startsWith('tool/string'));
    expect(item).toMatchObject({ blocking: false, files: ['scripts/prompt.mjs'] });
    expect(item.plain).toContain('<Stack direction="vertical">');
  });
});
