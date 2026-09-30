/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-pure-annotations.mjs (hds#363). A top-level component-factory
 * call — React.forwardRef, forwardRef, cva, React.createContext,
 * createContext, withHdsPortal — that is not immediately preceded by
 * `/* @__PURE__ *\/` is a side effect every bundler keeps, so one bare call in
 * a module that lands in the chunk shared with Button re-breaks the
 * Button-only budget. The gate flags the bare call, accepts the annotated one
 * (including the `Object.assign(…)` compound wrapper), and `--fix` inserts the
 * annotation.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TRACKED_CALLEES,
  annotateSource,
  findBareCalls,
  isScannedFile,
} from '../check-pure-annotations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const run = (...args) =>
  spawnSync('node', ['scripts/check-pure-annotations.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });

const callees = (source) => findBareCalls(source, 'fixture.tsx').map((f) => f.callee);

describe('findBareCalls — bare top-level calls are flagged', () => {
  it.each([
    [
      'React.forwardRef',
      'const X = React.forwardRef<HTMLDivElement, P>(function X(p, ref) { return null; });',
    ],
    ['forwardRef', 'export const X = forwardRef((p, ref) => null);'],
    ['cva', "const v = cva('base', { variants: { tone: { neutral: '' } } });"],
    ['React.createContext', 'const Ctx = React.createContext<number | null>(null);'],
    ['createContext', 'export const Ctx = createContext(undefined);'],
    ['withHdsPortal', 'const P = withHdsPortal(Primitive.Portal);'],
  ])('%s(…) without an annotation', (callee, source) => {
    const found = findBareCalls(source, 'fixture.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ callee, line: 1 });
  });

  it('flags a bare call that is a statement of its own or a default export', () => {
    expect(callees('forwardRef(() => null);')).toEqual(['forwardRef']);
    expect(callees('export default React.forwardRef(() => null);')).toEqual(['React.forwardRef']);
  });

  it('flags a bare inner call inside a compound Object.assign wrapper', () => {
    const source = `export const X = /* @__PURE__ */ Object.assign(
  React.forwardRef(function X(p, ref) { return null; }),
  { displayName: 'X' },
);`;
    const found = findBareCalls(source, 'fixture.tsx');
    expect(found.map((f) => [f.callee, f.line])).toEqual([['React.forwardRef', 2]]);
  });

  it('flags an un-annotated Object.assign wrapper around an annotated call', () => {
    const source = `export const X = Object.assign(
  /* @__PURE__ */ React.forwardRef(function X(p, ref) { return null; }),
  { displayName: 'X' },
);`;
    expect(callees(source)).toEqual(['Object.assign']);
  });

  it('flags an annotation that sits before the statement instead of the call', () => {
    // Bundlers read the comment immediately before the call expression; one
    // before `const` annotates nothing.
    const source = '/* @__PURE__ */\nconst X = React.forwardRef(() => null);';
    expect(callees(source)).toEqual(['React.forwardRef']);
  });

  it('reports line, column and a one-line snippet', () => {
    const source = "import * as React from 'react';\n\nconst Ctx =\n  React.createContext(null);\n";
    const [found] = findBareCalls(source, 'src/app/context/x.tsx');
    expect(found).toMatchObject({
      file: 'src/app/context/x.tsx',
      callee: 'React.createContext',
      line: 4,
      column: 3,
    });
    expect(found.snippet).toContain('React.createContext(null)');
  });
});

describe('findBareCalls — annotated and non-top-level calls are accepted', () => {
  it.each([
    'const X = /* @__PURE__ */ React.forwardRef<HTMLDivElement, P>(function X() { return null; });',
    'export const X = /* @__PURE__ */ forwardRef(() => null);',
    "const v = /* @__PURE__ */ cva('base', {});",
    'const Ctx = /* @__PURE__ */ React.createContext(null);',
    'export const Ctx = /* @__PURE__ */ createContext(null);',
    'const P = /* @__PURE__ */ withHdsPortal(Primitive.Portal);',
    // The `#` spelling is the same annotation to rollup, esbuild and terser.
    'const X = /*#__PURE__*/ React.forwardRef(() => null);',
    // Annotation and call on different lines is still "immediately before".
    'const X =\n  /* @__PURE__ */\n  React.forwardRef(() => null);',
  ])('%s', (source) => {
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it('accepts the compound wrapper when both the wrapper and the inner call are pure', () => {
    const source = `export const X = /* @__PURE__ */ Object.assign(
  /* @__PURE__ */ React.forwardRef<HTMLInputElement, P>(function X(p, ref) { return null; }),
  { Item: XItem, displayName: 'X' },
);`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it('accepts a pure Object.assign that wraps a plain function and identifiers', () => {
    const source = `function Root(props) { return null; }
export const X = /* @__PURE__ */ Object.assign(Root, { Trigger, Content, displayName: 'X' });`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it('ignores calls inside function, arrow, method, accessor, constructor and instance-field bodies', () => {
    const source = `function useThing() { const C = React.forwardRef(() => null); return C; }
const make = () => cva('x', {});
class K {
  m() { return createContext(null); }
  get g() { return cva('g', {}); }
  constructor() { this.c = React.createContext(null); }
  f = forwardRef(() => null);
}
export function Comp() { const Ctx = React.useMemo(() => React.createContext(null), []); return null; }`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it('flags a static class field or static block: both run when the class is evaluated', () => {
    // `static x = …` and `static { … }` run at class definition, which for a
    // top-level class is module load — as live as a bare top-level call, and
    // the one class shape a whole-class exemption would let through.
    const source = `class K {
  static s = forwardRef(() => null);
  static { K.ctx = createContext(null); }
  f = cva('instance', {});
}
const E = class { static v = React.forwardRef(() => null); };`;
    expect(findBareCalls(source, 'fixture.tsx').map((f) => [f.callee, f.line])).toEqual([
      ['forwardRef', 2],
      ['createContext', 3],
      ['React.forwardRef', 6],
    ]);
  });

  it('ignores calls the gate does not track', () => {
    const source = `const M = React.memo(function M() { return null; });
const L = React.lazy(() => import('./x'));
const G = Object.assign(Inner, { Item });
const s = String(1);`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it('tracks exactly the documented callees', () => {
    expect([...TRACKED_CALLEES].sort()).toEqual(
      [
        'React.createContext',
        'React.forwardRef',
        'createContext',
        'cva',
        'forwardRef',
        'withHdsPortal',
      ].sort(),
    );
  });
});

describe('annotateSource (--fix)', () => {
  it('inserts the annotation immediately before every bare call, innermost first', () => {
    const source = `const v = cva('base', {});
export const X = Object.assign(
  React.forwardRef(function X() { return null; }),
  { displayName: 'X' },
);
const ok = /* @__PURE__ */ createContext(null);`;
    const { source: fixed, count } = annotateSource(source, 'fixture.tsx');
    expect(count).toBe(3);
    expect(fixed).toBe(`const v = /* @__PURE__ */ cva('base', {});
export const X = /* @__PURE__ */ Object.assign(
  /* @__PURE__ */ React.forwardRef(function X() { return null; }),
  { displayName: 'X' },
);
const ok = /* @__PURE__ */ createContext(null);`);
    expect(findBareCalls(fixed, 'fixture.tsx')).toEqual([]);
  });

  it('is idempotent', () => {
    const source = 'const X = React.forwardRef(() => null);';
    const once = annotateSource(source, 'fixture.tsx').source;
    const twice = annotateSource(once, 'fixture.tsx');
    expect(twice.source).toBe(once);
    expect(twice.count).toBe(0);
  });
});

describe('isScannedFile', () => {
  it.each([
    ['src/app/components/button.tsx', true],
    ['src/app/context/hds-theme.tsx', true],
    ['src/lib/utils.ts', true],
    ['src/app/components/button.test.tsx', false],
    ['src/app/components/button.spec.ts', false],
    ['src/stories/button.stories.tsx', false],
    ['src/app/context/__tests__/portal-scope.test.tsx', false],
    ['src/app/context/__tests__/helper.tsx', false],
    ['src/types/global.d.ts', false],
    ['src/app/data/component-api.json', false],
    ['scripts/check-pure-annotations.mjs', false],
    ['tests/primitive-contracts/x.contract.test.tsx', false],
  ])('%s → %s', (file, expected) => {
    expect(isScannedFile(file)).toBe(expected);
  });
});

describe('check-pure-annotations CLI', () => {
  it('the committed src/ tree has no bare top-level factory call', () => {
    const out = run();
    expect(out.stderr).toBe('');
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(/check-pure-annotations — 0 bare top-level call\(s\)/);
  });

  describe('against a fixture root with offenders', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pure-annotations-'));
    mkdirSync(path.join(dir, 'src/app/components'), { recursive: true });
    mkdirSync(path.join(dir, 'src/stories'), { recursive: true });
    const bad = path.join(dir, 'src/app/components/bad.tsx');
    writeFileSync(
      bad,
      "import * as React from 'react';\nexport const Bad = React.forwardRef(() => null);\nconst v = cva('x', {});\n",
    );
    writeFileSync(
      path.join(dir, 'src/app/components/good.tsx'),
      'export const Good = /* @__PURE__ */ React.forwardRef(() => null);\n',
    );
    // Stories and tests are out of scope even when they hold bare calls.
    writeFileSync(
      path.join(dir, 'src/stories/bad.stories.tsx'),
      'export const S = React.forwardRef(() => null);\n',
    );
    writeFileSync(
      path.join(dir, 'src/app/components/bad.test.tsx'),
      'const T = React.forwardRef(() => null);\n',
    );
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('names each offender as file:line and exits 1 with the fix', () => {
      const out = run('--root', dir);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain('src/app/components/bad.tsx:2');
      expect(out.stderr).toContain('src/app/components/bad.tsx:3');
      expect(out.stderr).toContain('React.forwardRef');
      expect(out.stderr).toContain('cva');
      expect(out.stderr).not.toContain('good.tsx');
      expect(out.stderr).not.toContain('stories');
      expect(out.stderr).not.toContain('bad.test.tsx');
      expect(out.stderr).toContain('--fix');
    });

    it('--fix annotates the offenders in place, after which the gate passes', () => {
      const fix = run('--root', dir, '--fix');
      expect(fix.status).toBe(0);
      expect(fix.stdout).toContain('annotated 2 call(s) in 1 file(s)');
      const fixed = readFileSync(bad, 'utf8');
      expect(fixed).toContain('export const Bad = /* @__PURE__ */ React.forwardRef(() => null);');
      expect(fixed).toContain("const v = /* @__PURE__ */ cva('x', {});");
      expect(run('--root', dir).status).toBe(0);
    });
  });

  it('--root without a path exits 1 with an actionable message', () => {
    const out = run('--root');
    expect(out.status).toBe(1);
    expect(out.stderr).toContain('--root needs a path');
  });
});

describe('gate wiring (hds#363)', () => {
  it('package.json exposes it as pnpm check:pure-annotations, like every other check:* gate', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:pure-annotations']).toBe('node scripts/check-pure-annotations.mjs');
  });

  it('.husky/pre-commit runs the gate', () => {
    const hook = readFileSync(path.join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-pure-annotations\.mjs$/m);
  });

  it('the registry fires it at pre-commit as an error', () => {
    const registry = JSON.parse(
      readFileSync(path.join(ROOT, 'docs/guardrails/registry.json'), 'utf8'),
    );
    const entry = registry.gates.find((g) => g.id === 'check-pure-annotations');
    expect(entry).toBeDefined();
    expect(entry.severity).toBe('error');
    expect(entry.firingChannel).toBe('pre-commit');
    expect(entry.firingChannels).toEqual(['pre-commit']);
    expect(entry.gateScript).toBe('scripts/check-pure-annotations.mjs');
  });
});
