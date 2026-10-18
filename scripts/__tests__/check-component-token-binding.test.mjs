/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * check-component-token-binding: a component token is only a contract if the
 * component consumes it. Unit tests run the engine on small fixtures (one per
 * class, plus an alias chain, a Dark-only mismatch, a binding-ok marker and
 * the baseline ratchet); the repo test pins the real counts on main.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { analyze, ratchet, summarize } from '../lib/component-token-binding.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/check-component-token-binding.mjs');

// ── Fixture tokens ───────────────────────────────────────────────────────────

const dim = (value) => ({ $value: { value, unit: 'px' } });

/** Mini token tree: spacing, a two-step colour alias chain with a Dark mode, widget tokens. */
function tokens(component) {
  return {
    primitive: {
      space: { 2: dim(8), 3: dim(12), 4: dim(16) },
      size: { 12: dim(12), 16: dim(16) },
      color: {
        green: { $value: '#66b239' },
        greenDark: { $value: '#85c84c' },
        grey: { $value: '#737373' },
        greyDark: { $value: '#a3a3a3' },
      },
    },
    semantic: {
      color: {
        accent: {
          $value: '{primitive.color.green}',
          $extensions: {
            'com.figma.variables': {
              modes: { Light: '{primitive.color.green}', Dark: '{primitive.color.greenDark}' },
            },
          },
        },
        muted: {
          $value: '{primitive.color.grey}',
          $extensions: {
            'com.figma.variables': {
              modes: { Light: '{primitive.color.grey}', Dark: '{primitive.color.greyDark}' },
            },
          },
        },
      },
    },
    // role.primary -> semantic.color.accent -> primitive green (an alias chain)
    role: {
      primary: { $value: '{semantic.color.accent}' },
      quiet: { $value: '{semantic.color.muted}' },
    },
    component: { widget: component },
  };
}

const UTILITIES = new Map([
  ['primary', '--role-primary'],
  ['quiet', '--role-quiet'],
]);

const MAP = {
  groups: {
    widget: {
      source: 'src/app/components/widget.tsx',
      cva: 'widgetVariants',
      rules: [{ match: 'iconSize', state: '[&_svg]' }],
    },
  },
};

function run(component, classes, extra = {}) {
  const source =
    extra.source ??
    `import { cva } from 'class-variance-authority';\nconst widgetVariants = cva('${classes}');\n`;
  return analyze({
    tokens: tokens(component),
    map: extra.map ?? MAP,
    sources: { 'src/app/components/widget.tsx': source },
    utilityMap: UTILITIES,
    css: extra.css ?? {},
  });
}

const byId = (analysis, id) => analysis.results.find((r) => r.id === id);

// ── Classes ──────────────────────────────────────────────────────────────────

describe('classification', () => {
  it('BOUND: the source names var(--component-<leaf>)', () => {
    const a = run(
      { iconSize: { $value: '{primitive.size.12}' } },
      '[&_svg]:size-[var(--component-widget-iconSize)]',
    );
    expect(byId(a, 'widget.iconSize').class).toBe('BOUND');
  });

  it('LITERAL-MATCH (literal): a numeric utility that equals the token', () => {
    const a = run({ paddingX: { $value: '{primitive.space.4}' } }, 'px-4');
    const r = byId(a, 'widget.paddingX');
    expect(r.class).toBe('LITERAL-MATCH');
    expect(r.matchKind).toBe('literal');
  });

  it('LITERAL-MISMATCH: Tailwind falls back to N x 4px for fractional steps (size-3.5 is 14px)', () => {
    const a = run({ iconSize: { $value: '{primitive.size.12}' } }, '[&_svg]:size-3.5');
    const r = byId(a, 'widget.iconSize');
    expect(r.class).toBe('LITERAL-MISMATCH');
    expect(r.detail).toContain('12px');
    expect(r.detail).toContain('14px');
  });

  it('UNUSED: nothing sets the property', () => {
    const a = run({ paddingY: { $value: '{primitive.space.4}' } }, 'inline-flex px-4');
    expect(byId(a, 'widget.paddingY').class).toBe('UNUSED');
  });

  it('follows an alias chain: role.primary -> semantic.accent -> primitive', () => {
    const a = run({ bg: { $value: '{semantic.color.accent}' } }, 'bg-primary');
    const r = byId(a, 'widget.bg');
    expect(r.class).toBe('LITERAL-MATCH');
    expect(r.matchKind).toBe('alias');
    expect(r.code.Light).toBe('#66b239');
  });

  it('an opacity modifier cannot be proven equal, so it is a mismatch', () => {
    const a = run({ bg: { $value: '{semantic.color.accent}' } }, 'bg-primary/90');
    expect(byId(a, 'widget.bg').class).toBe('LITERAL-MISMATCH');
  });

  it('Dark-mode-only mismatch: equal in Light, different in Dark', () => {
    // token.bg is accent (green / greenDark); the class is a fixed light/dark pair
    // that only agrees in Light.
    const a = run({ bg: { $value: '{semantic.color.accent}' } }, 'bg-primary dark:bg-quiet');
    const r = byId(a, 'widget.bg');
    expect(r.class).toBe('LITERAL-MISMATCH');
    expect(r.token.Light).toBe('#66b239');
    expect(r.code.Light).toBe('#66b239');
    expect(r.token.Dark).toBe('#85c84c');
    expect(r.code.Dark).toBe('#a3a3a3');
  });

  it('a token whose Dark differs while the class does not is also a Dark mismatch', () => {
    const a = run({ bg: { $value: '{semantic.color.accent}' } }, 'bg-primary');
    // role.primary follows the mode, so this is a match in both modes.
    expect(byId(a, 'widget.bg').class).toBe('LITERAL-MATCH');
    const b = run(
      {
        bg: {
          $value: '{semantic.color.accent}',
          $extensions: {
            'com.figma.variables': {
              modes: { Light: '{semantic.color.accent}', Dark: '{semantic.color.muted}' },
            },
          },
        },
      },
      'bg-primary',
    );
    expect(byId(b, 'widget.bg').class).toBe('LITERAL-MISMATCH');
  });

  it('a missing state class inherits the resting value (hover falls back to rest)', () => {
    const a = run({ bgHover: { $value: '{semantic.color.muted}' } }, 'bg-primary', {
      map: {
        groups: {
          widget: { ...MAP.groups.widget, rules: [{ match: 'bgHover' }] },
        },
      },
    });
    const r = byId(a, 'widget.bgHover');
    expect(r.class).toBe('LITERAL-MISMATCH');
    expect(r.code.Light).toBe('#66b239');
  });

  it('reads the right cva option for a context rule', () => {
    const source = `import { cva } from 'class-variance-authority';
const widgetVariants = cva('inline-flex', {
  variants: { size: { sm: 'h-8', md: 'h-10' } },
  defaultVariants: { size: 'md' },
});`;
    const map = {
      groups: {
        widget: {
          source: 'src/app/components/widget.tsx',
          cva: 'widgetVariants',
          rules: [{ match: 'size.*.height', ctx: { size: '$1' } }],
        },
      },
    };
    const a = run(
      {
        size: {
          sm: { height: { $value: '{primitive.space.3}' } },
          md: { height: { $value: '{primitive.size.16}' } },
        },
      },
      '',
      { source, map },
    );
    expect(byId(a, 'widget.size.sm.height').code.Light).toBe('32px');
    expect(byId(a, 'widget.size.md.height').code.Light).toBe('40px');
  });

  it('a group missing from the map is a structural finding, not silence', () => {
    const a = run({ iconSize: { $value: '{primitive.size.12}' } }, '', { map: { groups: {} } });
    expect(byId(a, 'widget.iconSize').class).toBe('UNMAPPED');
    expect(a.findings.map((f) => f.type)).toContain('unmapped-group');
  });
});

// ── binding-ok ───────────────────────────────────────────────────────────────

describe('binding-ok marker', () => {
  const component = { iconSize: { $value: '{primitive.size.12}' } };

  it('allowlists a deliberate literal (reported, but never new drift)', () => {
    const source = `import { cva } from 'class-variance-authority';
// binding-ok: widget.iconSize optical size, 14px reads better next to the label
const widgetVariants = cva('[&_svg]:size-3.5');`;
    const a = run(component, '', { source });
    const r = byId(a, 'widget.iconSize');
    expect(r.class).toBe('LITERAL-MISMATCH');
    expect(r.allowed).toContain('optical size');
    expect(summarize(a.results).allowed).toBe(1);
    expect(ratchet(a, { leaves: {}, css: {}, findings: [] }).fresh).toEqual([]);
  });

  it('a marker without a reason allowlists nothing', () => {
    const source = `import { cva } from 'class-variance-authority';
// binding-ok: widget.iconSize
const widgetVariants = cva('[&_svg]:size-3.5');`;
    const a = run(component, '', { source });
    expect(byId(a, 'widget.iconSize').allowed).toBeUndefined();
    expect(a.findings.map((f) => f.type)).toContain('marker-no-reason');
  });

  it('a marker for a leaf that does not exist is a finding', () => {
    const source = `import { cva } from 'class-variance-authority';
// binding-ok: widget.nothing a typo that would otherwise allowlist nothing quietly
const widgetVariants = cva('[&_svg]:size-3.5');`;
    const a = run(component, '', { source });
    expect(a.findings.map((f) => f.type)).toContain('marker-unknown-leaf');
  });
});

// ── Ratchet ──────────────────────────────────────────────────────────────────

describe('baseline ratchet', () => {
  const component = { iconSize: { $value: '{primitive.size.12}' } };
  const mismatch = () => run(component, '[&_svg]:size-3.5');

  it('fails on a NEW mismatch the baseline does not list', () => {
    const verdict = ratchet(mismatch(), { leaves: {}, css: {}, findings: [] });
    expect(verdict.fresh.map((f) => f.key)).toEqual(['widget.iconSize']);
  });

  it('accepts a mismatch the baseline already lists', () => {
    const verdict = ratchet(mismatch(), {
      leaves: { 'widget.iconSize': 'LITERAL-MISMATCH' },
      css: {},
      findings: [],
    });
    expect(verdict.fresh).toEqual([]);
  });

  it('fails when a baselined LITERAL-MATCH regresses to a mismatch', () => {
    const verdict = ratchet(mismatch(), {
      leaves: { 'widget.iconSize': 'LITERAL-MATCH' },
      css: {},
      findings: [],
    });
    expect(verdict.fresh.map((f) => f.key)).toEqual(['widget.iconSize']);
  });

  it('accepts an improvement and reports the entry as fixed', () => {
    const bound = run(component, '[&_svg]:size-[var(--component-widget-iconSize)]');
    const verdict = ratchet(bound, {
      leaves: { 'widget.iconSize': 'LITERAL-MISMATCH' },
      css: {},
      findings: [],
    });
    expect(verdict.fresh).toEqual([]);
    expect(verdict.fixed).toEqual(['widget.iconSize']);
    expect(verdict.baseline.leaves).toEqual({});
  });

  it('a new literal that merely matches is also new until baselined', () => {
    const a = run({ paddingX: { $value: '{primitive.space.4}' } }, 'px-4');
    expect(ratchet(a, { leaves: {}, css: {}, findings: [] }).fresh.map((f) => f.class)).toEqual([
      'LITERAL-MATCH',
    ]);
  });
});

// ── static.css mirrors ───────────────────────────────────────────────────────

describe('static.css mirror', () => {
  const component = { radius: { $value: '{primitive.space.2}' } };
  const map = (selector) => ({
    groups: {
      widget: {
        ...MAP.groups.widget,
        css: { file: 'static.css', leaves: { radius: `${selector} | border-radius` } },
      },
    },
  });

  it('flags a CSS mirror that drifted from the token', () => {
    const a = run(component, 'rounded-[var(--component-widget-radius)]', {
      map: map('.hds-widget'),
      css: { 'static.css': '.hds-widget { border-radius: 12px; }' },
    });
    expect(a.cssResults).toHaveLength(1);
    expect(a.cssResults[0].class).toBe('LITERAL-MISMATCH');
  });

  it('accepts a CSS mirror bound to the component var', () => {
    const a = run(component, 'rounded-[var(--component-widget-radius)]', {
      map: map('.hds-widget'),
      css: { 'static.css': '.hds-widget { border-radius: var(--component-widget-radius); }' },
    });
    expect(a.cssResults[0].class).toBe('BOUND');
  });
});

// ── CLI ──────────────────────────────────────────────────────────────────────

function cli(args, env = {}) {
  const clean = { ...process.env, ...env };
  delete clean.HDS_FIXTURE_MODE;
  if (!('FIXTURE_DIR' in env)) delete clean.FIXTURE_DIR;
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: clean });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('CLI modes', () => {
  const fixture = (name) =>
    join(ROOT, 'fixtures/check-component-token-binding', `${name}.example.d`);

  it('--report prints the table and exits 0 even with new drift', () => {
    const r = cli(['--report', '--root', fixture('violating')]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('widget.iconSize');
  });

  it('--enforce exits 1 on a new mismatch', () => {
    const r = cli(['--enforce', '--root', fixture('violating')]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('widget.iconSize');
  });

  it('--enforce exits 0 when the leaf is bound', () => {
    expect(cli(['--enforce', '--root', fixture('passing')]).status).toBe(0);
  });

  it('FIXTURE_DIR enforces (proof-of-firing harness)', () => {
    expect(cli(['--fixture-mode'], { FIXTURE_DIR: fixture('violating') }).status).toBe(1);
    expect(cli(['--fixture-mode'], { FIXTURE_DIR: fixture('passing') }).status).toBe(0);
  });

  it('--update-baseline records the debt, then --enforce passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-binding-'));
    try {
      cpSync(fixture('violating'), dir, { recursive: true });
      expect(cli(['--update-baseline', '--root', dir]).status).toBe(0);
      expect(cli(['--enforce', '--root', dir]).status).toBe(0);
      // a NEW leaf drifting after the baseline was recorded fails
      mkdirSync(join(dir, 'src/app/components'), { recursive: true });
      writeFileSync(
        join(dir, 'hirobius.tokens.json'),
        JSON.stringify(
          tokens({
            iconSize: { $value: '{primitive.size.12}' },
            paddingX: { $value: '{primitive.space.4}' },
          }),
        ),
      );
      writeFileSync(
        join(dir, 'src/app/components/widget.tsx'),
        "import { cva } from 'class-variance-authority';\nconst widgetVariants = cva('[&_svg]:size-3.5 px-3');\n",
      );
      writeFileSync(join(dir, 'scripts/component-token-bindings.json'), JSON.stringify(MAP));
      const r = cli(['--enforce', '--root', dir]);
      expect(r.status).toBe(1);
      expect(r.out).toContain('widget.paddingX');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── The repo itself (acceptance fixture: audit at origin/main 7895210) ───────

describe('repo counts', () => {
  it('counts after the state-token decisions (hds#595): 35 BOUND / 44 LITERAL-MATCH / 0 LITERAL-MISMATCH / 13 UNUSED of 92 (was 20/44/4/11; inlineCode.bg bound; badge.radius is the action radius through rounded-md, bug bash 24)', () => {
    const r = cli(['--json']);
    expect(r.status).toBe(0);
    const { summary } = JSON.parse(r.out);
    expect(summary.total).toBe(92);
    expect(summary.counts).toMatchObject({
      BOUND: 35,
      'LITERAL-MATCH': 44,
      'LITERAL-MISMATCH': 0,
      UNUSED: 13,
    });
    expect(summary.matchKinds).toEqual({ alias: 23, 'type-role': 8, literal: 13 });
  });

  it('--enforce passes on the committed baseline', () => {
    expect(cli(['--enforce']).status).toBe(0);
  });
});
