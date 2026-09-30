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
 *
 * hds#365 widened it to the two shapes the six remaining compounds used: a
 * top-level `Object.assign(…)` whose first argument is a component (a
 * capitalised identifier, a namespaced one such as a Radix Root, or a call)
 * without the annotation, and a top-level `X.Part = …` / `X.displayName = …`
 * write on a capitalised identifier. A write has no annotation that makes it
 * droppable, so `--fix` leaves it and exits 1.
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
    // The static block's `K.ctx = …` is a component write as well (hds#365).
    expect(
      findBareCalls(source, 'fixture.tsx').map((f) => [f.kind, f.callee ?? f.target, f.line]),
    ).toEqual([
      ['call', 'forwardRef', 2],
      ['write', 'K.ctx', 3],
      ['call', 'createContext', 3],
      ['call', 'React.forwardRef', 6],
    ]);
  });

  it('ignores calls the gate does not track', () => {
    // A lower-case first argument is a plain object merge, not a compound.
    const source = `const M = React.memo(function M() { return null; });
const L = React.lazy(() => import('./x'));
const defaults = Object.assign({}, base, { item });
const merged = Object.assign(target, { Item });
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

describe('findBareCalls — compound writes and un-annotated Object.assign (hds#365)', () => {
  const writes = (source) =>
    findBareCalls(source, 'fixture.tsx')
      .filter((f) => f.kind === 'write')
      .map((f) => f.target);

  it('flags an un-annotated Object.assign whose first argument is a capitalised identifier', () => {
    const source = `function Root(props) { return null; }
export const X = Object.assign(Root, { Trigger, Content, displayName: 'X' });`;
    const found = findBareCalls(source, 'fixture.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'call', callee: 'Object.assign', line: 2 });
  });

  it('flags an un-annotated Object.assign whose first argument is a call', () => {
    // React.memo is not a tracked callee, so only the wrapper is reported.
    const source = `export const X = Object.assign(React.memo(function X() { return null; }), { Item });`;
    expect(findBareCalls(source, 'fixture.tsx').map((f) => [f.kind, f.callee])).toEqual([
      ['call', 'Object.assign'],
    ]);
  });

  it('flags an un-annotated Object.assign onto a namespaced component such as a Radix Root', () => {
    const source = 'export const X = Object.assign(XPrimitive.Root, { Trigger, Content });';
    expect(callees(source)).toEqual(['Object.assign']);
  });

  it('sees through a cast or parentheses around the first argument', () => {
    const source = 'export const X = Object.assign(Root as unknown as XComponent, { Trigger });';
    expect(callees(source)).toEqual(['Object.assign']);
    expect(callees('export const Y = Object.assign((Root), { Trigger });')).toEqual([
      'Object.assign',
    ]);
  });

  it('accepts the wrapped form and Object.assign used as a plain merge', () => {
    const source = `function Root(props) { return null; }
export const X = /* @__PURE__ */ Object.assign(Root, { Trigger, displayName: 'X' });
export const Y = /* @__PURE__ */ Object.assign(XPrimitive.Root, { Trigger });
const defaults = Object.assign({}, base, overrides);
const merged = Object.assign(target, { Item });
function assemble() { return Object.assign(Root, { Trigger }); }`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
  });

  it.each([
    ['X.displayName', "X.displayName = 'X';"],
    ['Menu.Trigger', 'Menu.Trigger = MenuTrigger;'],
    [
      'HoverCard.Content',
      'export const HoverCard = Root as unknown as HoverCardComponent;\nHoverCard.Content = HoverCardContent;',
    ],
  ])('flags a top-level %s = … write', (target, source) => {
    const found = findBareCalls(source, 'fixture.tsx');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'write', target });
    expect(found[0].callee).toBeUndefined();
    expect(found[0].snippet).toContain(target);
  });

  it('reports every write of a compound assembled by property writes, in source order', () => {
    const source = `const Menu = ((props) => null) as MenuComponent;
Menu.Trigger = MenuTrigger;
Menu.Content = MenuContent;
Menu.displayName = 'Menu';
export { Menu };`;
    expect(findBareCalls(source, 'fixture.tsx').map((f) => [f.target, f.line, f.column])).toEqual([
      ['Menu.Trigger', 2, 1],
      ['Menu.Content', 3, 1],
      ['Menu.displayName', 4, 1],
    ]);
  });

  it('flags a nested, cast, bracketed or compound-operator write whose root is a component', () => {
    const source = `X.defaultProps.size = 'md';
(X as any).Part = Part;
X['Item'] = Item;
X.count ??= 0;`;
    expect(writes(source)).toEqual(['X.defaultProps.size', 'X.Part', 'X[…]', 'X.count']);
  });

  it('ignores writes on lower-case objects and writes inside deferred bodies', () => {
    const source = `x.y = 1;
config.Item = Item;
module.exports.X = X;
function assemble() { X.Part = Part; X.displayName = 'X'; }
const wire = () => { Menu.Trigger = MenuTrigger; };
class K { m() { K.count = 1; } f = (K.instances = 0); }
const eq = X.Part === Part;`;
    expect(findBareCalls(source, 'fixture.tsx')).toEqual([]);
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

  it('annotates a bare Object.assign compound wrapper (hds#365)', () => {
    const source = "export const X = Object.assign(Root, { Trigger, displayName: 'X' });";
    const { source: fixed, count } = annotateSource(source, 'fixture.tsx');
    expect(count).toBe(1);
    expect(fixed).toBe(
      "export const X = /* @__PURE__ */ Object.assign(Root, { Trigger, displayName: 'X' });",
    );
  });

  it('leaves component property writes alone: they need restructuring, not an annotation', () => {
    const source = "const X = React.forwardRef(() => null);\nX.displayName = 'X';";
    const { source: fixed, count } = annotateSource(source, 'fixture.tsx');
    expect(count).toBe(1);
    expect(fixed).toBe(
      "const X = /* @__PURE__ */ React.forwardRef(() => null);\nX.displayName = 'X';",
    );
    expect(findBareCalls(fixed, 'fixture.tsx').map((f) => [f.kind, f.target])).toEqual([
      ['write', 'X.displayName'],
    ]);
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

// Each test spawns the gate one to three times; under a full `pnpm test` run
// that sits close to vitest's 5 s default, so the block gets an explicit budget.
describe('check-pure-annotations CLI', { timeout: 30_000 }, () => {
  it('the committed src/ tree has no bare top-level factory call', () => {
    const out = run();
    expect(out.stderr).toBe('');
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(
      /check-pure-annotations — 0 bare top-level call\(s\), 0 component property write\(s\)/,
    );
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

  describe('against a fixture root with component writes (hds#365)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pure-annotations-writes-'));
    mkdirSync(path.join(dir, 'src/app/components'), { recursive: true });
    const writes = path.join(dir, 'src/app/components/writes.tsx');
    writeFileSync(
      writes,
      [
        "import * as React from 'react';",
        'export const W = ((props: WProps) => null) as WComponent;',
        'W.Part = WPart;',
        "W.displayName = 'W';",
        'export const V = Object.assign(WRoot, { Part: WPart });',
        '',
      ].join('\n'),
    );
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('names each write and the bare wrapper as file:line and exits 1', () => {
      const out = run('--root', dir);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain('src/app/components/writes.tsx:3');
      expect(out.stderr).toContain('W.Part = …');
      expect(out.stderr).toContain('src/app/components/writes.tsx:4');
      expect(out.stderr).toContain('W.displayName = …');
      expect(out.stderr).toContain('src/app/components/writes.tsx:5');
      expect(out.stderr).toContain('Object.assign(…)');
      expect(out.stderr).toContain('never `X.Part = …`');
      expect(out.stderr).toContain('`X.displayName = …` writes');
    });

    it('--fix annotates the wrapper but cannot fix a write, so it still exits 1 naming it', () => {
      const fix = run('--root', dir, '--fix');
      expect(fix.stdout).toContain('annotated 1 call(s) in 1 file(s)');
      expect(readFileSync(writes, 'utf8')).toContain(
        'export const V = /* @__PURE__ */ Object.assign(WRoot, { Part: WPart });',
      );
      expect(fix.status).toBe(1);
      expect(fix.stderr).toContain('2 component property write(s)');
      expect(fix.stderr).toContain('W.Part = …');
      expect(fix.stderr).toContain('W.displayName = …');
      expect(fix.stderr).toContain('--fix cannot');
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
