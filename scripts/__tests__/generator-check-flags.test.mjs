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
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
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
    ['generate-consumer-skill.mjs'],
    ['generate-layout-contract.mjs'],
    ['generate-code-connect.mjs'],
    ['figma-links.mjs'],
  ])(
    '%s --check exits 0',
    (script) => {
      const res = run(script, '--check');
      expect(res.status, res.stderr).toBe(0);
    },
    30_000,
  );
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
    'package.json',
    'hirobius.tokens.json',
    'content/docs/voice.mdx',
    'codemods/patterns-subpath.names.json',
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
    // The check builds the component prop data from source (hds#716): seconds, not ms.
  }, 90_000);

  it('passes on an untouched copy', () => {
    const res = run('generate-llms-txt.mjs', '--check', '--root', copyRoot(INPUTS));
    expect(res.status, res.stderr).toBe(0);
  }, 90_000);
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
  const INPUTS = [
    'public/hds-manifest.json',
    'src/app/components',
    'figma/mapping-overrides.json',
    OUT,
  ];

  runnerContract({
    script: 'figma-disposition.mjs',
    inputs: INPUTS,
    out: OUT,
    fix: 'pnpm figma:disposition --write',
    // A component's class in the table no longer matches the rules.
    makeStale: (root) =>
      edit(root, OUT, (t) => t.replace('"class": "library"', '"class": "internal"')),
    // A plain run prints the summary; only --write writes.
    writeArgs: ['--write'],
  });

  it('ignores the generatedAt stamp, and keeps the hand-kept overrides table', () => {
    const root = copyRoot(INPUTS);
    edit(root, OUT, (t) => t.replace(/"generatedAt": "[^"]+"/, '"generatedAt": "2001-01-01"'));
    expect(run('figma-disposition.mjs', '--check', '--root', root).status).toBe(0);
    const doc = dispositionDocument(
      { summary: {}, components: [] },
      { overrides: { X: { a: 1 } } },
    );
    expect(doc.overrides).toEqual({ X: { a: 1 } });
  }, 30_000);
});

// ── Generators on runGenerator (hds#644) ─────────────────────────────────────
// Each one hands scripts/lib/generated-check.mjs its `{ path: text }` and
// nothing else. Per generator: --check passes on an untouched copy of its
// inputs; a write there regenerates the committed bytes exactly (Prettier
// included, so running it twice gives no diff); --check on a stale output
// exits 1 naming the file and the fix, and writes nothing.

/** Every file under `root` -> its text, to prove a --check wrote nothing. */
const snapshot = (root) => {
  const files = {};
  const walk = (rel) => {
    const abs = join(root, rel);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(next);
      else files[next] = readFileSync(join(root, next), 'utf8');
    }
  };
  walk('');
  return files;
};

/** The shared contract, for a generator that takes `--root`. */
function runnerContract({
  script,
  inputs,
  out,
  fix,
  makeStale,
  prepare = () => {},
  writeArgs = [],
  timeout = 30_000,
}) {
  it(
    '--check passes on an untouched copy, and a write there leaves the committed bytes',
    () => {
      const root = copyRoot(inputs);
      prepare(root);
      const checked = run(script, '--check', '--root', root);
      expect(checked.status, checked.stderr).toBe(0);
      const before = snapshot(root);
      const wrote = run(script, ...writeArgs, '--root', root);
      expect(wrote.status, wrote.stderr).toBe(0);
      // Every file that was there keeps its bytes (a generator may add
      // gitignored carriers beside them).
      const after = snapshot(root);
      for (const [file, text] of Object.entries(before)) expect(after[file], file).toBe(text);
    },
    timeout,
  );

  it(
    '--check fails on a stale output, naming it and the fix, and writes nothing',
    () => {
      const root = copyRoot(inputs);
      prepare(root);
      makeStale(root);
      const before = snapshot(root);
      const res = run(script, '--check', '--root', root);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain(out);
      expect(res.stderr).toContain(`Run: ${fix}`);
      expect(snapshot(root)).toEqual(before);
    },
    timeout,
  );
}

describe('generate-layout-contract on runGenerator', () => {
  runnerContract({
    script: 'generate-layout-contract.mjs',
    inputs: ['public/hds-manifest.json', 'docs/guardrails/layout-contract.json'],
    out: 'docs/guardrails/layout-contract.json',
    fix: 'pnpm layout-contract:generate',
    makeStale: (root) =>
      edit(root, 'docs/guardrails/layout-contract.json', (t) => t.replace('{', '{\n  "x": 1,')),
  });
});

describe('generate-consumer-skill on runGenerator', () => {
  runnerContract({
    script: 'generate-consumer-skill.mjs',
    inputs: [
      'public/hds-manifest.json',
      'src/index.ts',
      'src/patterns.ts',
      'package.json',
      'skills/hds-consumer/SKILL.md',
    ],
    out: 'skills/hds-consumer/SKILL.md',
    fix: 'pnpm skill:generate',
    makeStale: (root) => edit(root, 'skills/hds-consumer/SKILL.md', (t) => `${t}\nhand edit\n`),
  });
});

describe('build-css-contract on runGenerator', () => {
  // dist/ is build output, so the contract is checked against a package built
  // in the throwaway root rather than against the committed tree.
  runnerContract({
    script: 'build-css-contract.mjs',
    inputs: [],
    out: 'dist/css-contract.json',
    fix: 'node scripts/build-css-contract.mjs',
    prepare: (root) => {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ name: 'x', exports: { './tokens.css': './dist/tokens.css' } }),
      );
      mkdirSync(join(root, 'dist'));
      writeFileSync(join(root, 'dist/tokens.css'), ':root{--a:1px}.hds-a{color:red}');
      expect(run('build-css-contract.mjs', '--root', root).status).toBe(0);
    },
    makeStale: (root) => writeFileSync(join(root, 'dist/tokens.css'), ':root{--a:2px}'),
  });
});

describe('figma-links on runGenerator', () => {
  runnerContract({
    script: 'figma-links.mjs',
    inputs: [
      'figma/links.json',
      'public/hds-manifest.json',
      'package.json',
      'docs/DESIGN_LINKS.md',
    ],
    out: 'docs/DESIGN_LINKS.md',
    fix: 'pnpm manifest:generate && pnpm figma:links',
    makeStale: (root) =>
      edit(root, 'docs/DESIGN_LINKS.md', (t) => t.replace(/\*\*\d+ of \d+\*\*/, '**1 of 1**')),
  });
});

describe('generate-code-connect on runGenerator', () => {
  const FIXTURE = join(ROOT, 'fixtures/check-code-connect/passing.example.d');
  const TEMPLATE = 'src/app/components/widget.figma.ts';
  // A copy of the gate's passing fixture; node_modules linked so the
  // TypeScript checker resolves the component's imports as it does in place.
  const prepare = (root) => {
    cpSync(FIXTURE, root, { recursive: true });
    symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'));
  };

  runnerContract({
    script: 'generate-code-connect.mjs',
    inputs: [],
    prepare,
    out: TEMPLATE,
    fix: 'pnpm figma:connect:generate',
    makeStale: (root) => edit(root, TEMPLATE, (t) => `${t}// hand edit\n`),
  });

  it('names a generated template with no registry entry, and a write removes it', () => {
    const root = copyRoot([]);
    prepare(root);
    const orphan = 'src/app/components/orphan.figma.ts';
    writeFileSync(join(root, orphan), '// GENERATED by scripts/generate-code-connect.mjs\n');
    const checked = run('generate-code-connect.mjs', '--check', '--root', root);
    expect(checked.status).toBe(1);
    expect(checked.stderr).toContain(orphan);
    expect(existsSync(join(root, orphan))).toBe(true);
    expect(run('generate-code-connect.mjs', '--root', root).status).toBe(0);
    expect(existsSync(join(root, orphan))).toBe(false);
  }, 30_000);
});

describe('generate-closure-plan on runGenerator', () => {
  // The committed plan is behind its inventory (a content regen deletes its
  // rows), so this builds a consistent pair and regenerates it once.
  const PLAN = 'docs/guardrails/full-strictness-closure-plan.md';
  const INVENTORY = 'docs/guardrails/full-strictness-inventory.json';
  const prepare = (root) => {
    mkdirSync(join(root, 'docs/guardrails'), { recursive: true });
    writeFileSync(
      join(root, INVENTORY),
      JSON.stringify({
        gates: [
          {
            id: 'check-x',
            violations: [
              { file: 'src/a.ts', line: 3, rule: 'r1', severity: 'error' },
              { file: 'scripts/__tests__/b_c.mjs', line: null, rule: 'r2', severity: 'warn' },
            ],
          },
        ],
      }),
    );
    writeFileSync(
      join(root, PLAN),
      '# Plan\n\nPreamble.\n\n<!-- BEGIN auto-generated rows -->\n<!-- END auto-generated rows -->\n\nTail.\n',
    );
    expect(run('generate-closure-plan.mjs', '--root', root).status).toBe(0);
  };

  runnerContract({
    script: 'generate-closure-plan.mjs',
    inputs: [],
    prepare,
    out: PLAN,
    fix: 'node scripts/generate-closure-plan.mjs',
    makeStale: (root) => edit(root, PLAN, (t) => t.replace('src/a.ts', 'src/z.ts')),
  });

  it('keeps a hand-set classification across a regen of its Prettier-formatted table', () => {
    const root = copyRoot([]);
    prepare(root);
    edit(root, PLAN, (t) => t.replace('classification: TODO', 'A — fix the call site'));
    expect(run('generate-closure-plan.mjs', '--root', root).status).toBe(0);
    const plan = readFileSync(join(root, PLAN), 'utf8');
    expect(plan).toContain('A — fix the call site');
    expect(plan).toContain('Preamble.');
    expect(plan).toContain('Tail.');
    expect(run('generate-closure-plan.mjs', '--check', '--root', root).status).toBe(0);
  }, 30_000);
});
