/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// `--check` on the generators whose output docs/state-surfaces.json lists as
// generated (hds#612). Seam: the command line. Each generator must (1) pass on
// the committed tree, (2) exit 1 naming the stale file and the fix when its
// output no longer matches its sources, and (3) write nothing while checking.
// check-state-surfaces only verifies that the script handles `--check`; this is
// what proves the flag does what the registry claims.
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readmeWithUsage } from '../count-consumer-usage.mjs';
import { dispositionDocument } from '../figma-disposition.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

const run = (script, ...args) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });

/** A throwaway root holding copies of `files` (paths relative to the repo). */
const copyRoot = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'gen-check-'));
  temps.push(root);
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(ROOT, f), join(root, f), { recursive: true });
  }
  return root;
};
const edit = (root, file, fn) => {
  const p = join(root, file);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
};

describe('the committed tree is fresh', () => {
  it.each([
    ['build-design-md.mjs'],
    ['build-handoff.mjs'],
    ['generate-llms-txt.mjs'],
    ['count-consumer-usage.mjs'],
    ['figma-disposition.mjs'],
  ])('%s --check exits 0', (script) => {
    const res = run(script, '--check');
    expect(res.status, res.stderr).toBe(0);
  });
});

describe('build-design-md --check', () => {
  const INPUTS = [
    'hirobius.tokens.json',
    'public/hds-manifest.json',
    'DESIGN.source.md',
    'DESIGN.md',
  ];

  it('fails on a stale DESIGN.md, names it and the fix, and writes nothing', () => {
    const root = copyRoot(INPUTS);
    edit(root, 'DESIGN.md', (t) => `${t}\nhand edit\n`);
    const before = readFileSync(join(root, 'DESIGN.md'), 'utf8');
    const res = run('build-design-md.mjs', '--check', '--root', root);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('DESIGN.md');
    expect(res.stderr).toContain('pnpm tokens');
    expect(readFileSync(join(root, 'DESIGN.md'), 'utf8')).toBe(before);
  });

  it('passes on an untouched copy', () => {
    expect(run('build-design-md.mjs', '--check', '--root', copyRoot(INPUTS)).status).toBe(0);
  });
});

describe('build-handoff --check', () => {
  const INPUTS = ['hirobius.tokens.json', 'DESIGN-HANDOFF.md', '.prettierrc.json'];

  it('fails when a generated token table was edited by hand, and writes nothing', () => {
    const root = copyRoot(INPUTS);
    edit(root, 'DESIGN-HANDOFF.md', (t) =>
      t.replace(/\| `primitive\.color/, '| `primitive.colour'),
    );
    const before = readFileSync(join(root, 'DESIGN-HANDOFF.md'), 'utf8');
    const res = run('build-handoff.mjs', '--check', '--root', root);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('DESIGN-HANDOFF.md');
    expect(readFileSync(join(root, 'DESIGN-HANDOFF.md'), 'utf8')).toBe(before);
  });

  it('passes on an untouched copy (prose between the tables is not compared)', () => {
    expect(run('build-handoff.mjs', '--check', '--root', copyRoot(INPUTS)).status).toBe(0);
  });
});

describe('generate-llms-txt --check', () => {
  const INPUTS = [
    'public/hds-manifest.json',
    'src/app/data/component-api.json',
    'package.json',
    'hirobius.tokens.json',
    'content/docs/voice.mdx',
    'DESIGN.md',
    'llms.txt',
    'public/llms.txt',
    'public/llms-full.txt',
    'public/llms',
  ];

  it('fails when a slice drifts from its sources, and writes nothing', () => {
    const root = copyRoot(INPUTS);
    edit(root, 'public/llms/tokens.txt', (t) => `${t}\nstale line\n`);
    const before = readdirSync(join(root, 'public/llms')).map((f) =>
      readFileSync(join(root, 'public/llms', f), 'utf8'),
    );
    const res = run('generate-llms-txt.mjs', '--check', '--root', root);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('public/llms/tokens.txt');
    expect(res.stderr).toContain('pnpm llms:generate');
    const after = readdirSync(join(root, 'public/llms')).map((f) =>
      readFileSync(join(root, 'public/llms', f), 'utf8'),
    );
    expect(after).toEqual(before);
  });

  it('passes on an untouched copy', () => {
    const res = run('generate-llms-txt.mjs', '--check', '--root', copyRoot(INPUTS));
    expect(res.status, res.stderr).toBe(0);
  });
});

describe('README consumer-usage block', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const snapshot = JSON.parse(readFileSync(join(ROOT, 'docs/data/consumer-usage.json'), 'utf8'));

  it('is what the committed snapshot renders to', () => {
    expect(readmeWithUsage(readme, snapshot)).toBe(readme);
  });

  it('differs from the README once the snapshot moves', () => {
    expect(readmeWithUsage(readme, { ...snapshot, files: snapshot.files + 7 })).not.toBe(readme);
  });
});

describe('figma-disposition --check', () => {
  const OUT = 'figma/disposition.json';

  it('fails when a component class in the table no longer matches the rules', () => {
    const root = copyRoot([OUT]);
    edit(root, OUT, (t) => {
      const doc = JSON.parse(t);
      doc.components[0].class = doc.components[0].class === 'library' ? 'internal' : 'library';
      return JSON.stringify(doc, null, 2);
    });
    const res = run('figma-disposition.mjs', '--check', '--out', join(root, OUT));
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('figma/disposition.json');
    expect(res.stderr).toContain('pnpm figma:disposition --write');
  });

  it('ignores the generatedAt stamp, and keeps the hand-kept overrides table', () => {
    const root = copyRoot([OUT]);
    edit(root, OUT, (t) =>
      JSON.stringify({ ...JSON.parse(t), generatedAt: '2001-01-01' }, null, 2),
    );
    expect(run('figma-disposition.mjs', '--check', '--out', join(root, OUT)).status).toBe(0);
    const doc = dispositionDocument(
      { summary: {}, components: [] },
      { overrides: { X: { a: 1 } } },
    );
    expect(doc.overrides).toEqual({ X: { a: 1 } });
  });
});
