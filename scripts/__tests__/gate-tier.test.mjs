import { describe, expect, it } from 'vitest';
import { classifyGateTier, FULL_GATE_FILE_LIMIT, planGate } from '../lib/gate-tier.mjs';

describe('classifyGateTier', () => {
  it('docs-only diffs skip the test suite', () => {
    const r = classifyGateTier(['README.md', 'docs/adr/060-x.md', 'content/a.mdx', 'public/x.png']);
    expect(r.tier).toBe('docs');
  });

  it('a small source diff runs the fast gate', () => {
    expect(classifyGateTier(['src/components/Button.tsx', 'docs/a.md']).tier).toBe('fast');
  });

  it.each([
    ['package.json'],
    ['pnpm-lock.yaml'],
    ['vite.config.lib.ts'],
    ['vitest.config.ts'],
    ['tsconfig.json'],
    ['eslint.config.mjs'],
    ['tailwind.config.ts'],
    ['hirobius.tokens.json'],
    ['src/styles/tokens.css'],
    ['src/tokens/index.ts'],
    ['src/theme/dark.ts'],
    ['scripts/lib/hook-output.mjs'],
    ['scripts/build-tokens.mjs'],
    ['.husky/pre-push'],
    ['codemods/token-keys.mjs'],
    ['bin/hds-tokens.mjs'],
    ['accents/cobalt/tokens.json'],
    ['directions/acme/tokens.json'],
    ['upgrade/index.json'],
    ['DESIGN.md'],
    ['DESIGN.source.md'],
    ['CONSUMING.md'],
    ['docs/CONSUMING.md'],
    ['UPGRADING.md'],
    ['MIGRATIONS.md'],
    ['knip.config.ts'],
    ['docs/api/props-baseline.json'],
    ['docs/api/types-baseline.json'],
    ['src/app/data/component-api.json'],
    ['public/hds-manifest.json'],
    ['public/hds-stats.json'],
    ['llms.txt'],
    ['public/llms.txt'],
    ['public/llms-full.txt'],
    ['public/llms/components/button.txt'],
    ['mcp/server.mjs'],
    ['.size-limit.cjs'],
    ['.npmrc'],
    ['.nvmrc'],
    ['docs-site/package.json'],
  ])('%s triggers the full gate', (file) => {
    const r = classifyGateTier([file]);
    expect(r.tier).toBe('full');
    expect(r.reason).toContain(file);
  });

  it(`more than ${FULL_GATE_FILE_LIMIT} files triggers the full gate`, () => {
    const files = Array.from({ length: FULL_GATE_FILE_LIMIT + 1 }, (_, i) => `src/c${i}.tsx`);
    expect(classifyGateTier(files).tier).toBe('full');
    expect(classifyGateTier(files.slice(1)).tier).toBe('fast');
  });

  it('HDS_FULL_GATE=1 forces the full gate', () => {
    expect(classifyGateTier(['README.md'], { HDS_FULL_GATE: '1' }).tier).toBe('full');
  });

  it('an unknown diff (null) fails safe to full', () => {
    expect(classifyGateTier(null).tier).toBe('full');
  });

  it('an empty diff is docs tier (nothing to test)', () => {
    expect(classifyGateTier([]).tier).toBe('docs');
  });
});

describe('planGate', () => {
  it('docs tier runs no test commands', () => {
    expect(planGate('docs', ['README.md']).join(' ')).not.toMatch(/vitest|pnpm test/);
  });

  it('fast tier lints changed code files, typechecks, runs related tests', () => {
    const cmds = planGate('fast', ['src/a.tsx', 'src/a.test.tsx', 'docs/x.md']);
    expect(cmds).toContain(
      'pnpm exec eslint --max-warnings=0 --no-warn-ignored src/a.tsx src/a.test.tsx',
    );
    expect(cmds).toContain('pnpm typecheck');
    expect(cmds).toContain(
      'pnpm exec vitest related --run --passWithNoTests src/a.tsx src/a.test.tsx',
    );
  });

  it('fast tier lint does not fail on a file no eslint config covers (hds#1113)', () => {
    // A changed canon fixture under scripts/__tests__/fixtures/ has no matching
    // eslint config; without --no-warn-ignored eslint warns "File ignored" and
    // --max-warnings=0 blocks the push even though nothing was linted.
    const cmds = planGate('fast', ['scripts/__tests__/fixtures/canon/OVERSIZED_RADIUS.tsx']);
    expect(cmds.find((c) => c.includes('eslint'))).toMatch(/--no-warn-ignored/);
  });

  it('fast tier with no code files skips lint and vitest', () => {
    const cmds = planGate('fast', ['public/a.svg', 'manifest/x.yaml']);
    expect(cmds.join(' ')).not.toMatch(/eslint|vitest/);
  });

  it('full tier with an unknown (empty) diff runs check:fast, the whole suite and consumer smoke', () => {
    expect(planGate('full', [])).toEqual(['pnpm check:fast', 'pnpm test', 'pnpm smoke:consumer']);
  });

  it('full tier runs only the affected tests for a known diff (#1090)', () => {
    // A scripts/ change takes the full tier but not the full suite.
    const cmds = planGate('full', ['scripts/check-record-freshness.mjs']);
    expect(cmds[0]).toBe('pnpm check:fast');
    expect(cmds[1]).toBe('pnpm run pretest');
    expect(cmds[2]).toMatch(
      /^pnpm exec vitest related --run --passWithNoTests scripts\/check-record-freshness\.mjs/,
    );
    // The real test index finds the test that spawns the script by path (no import).
    expect(cmds[2]).toContain('scripts/__tests__/check-record-freshness.test.mjs');
    expect(cmds.join(' ')).not.toMatch(/test:fast|pnpm test\b/);
    expect(cmds.at(-1)).toBe('pnpm smoke:consumer');
  });

  it('HDS_FULL_GATE=1 still runs the whole suite, not just affected tests (#1090)', () => {
    expect(
      planGate('full', ['scripts/check-record-freshness.mjs'], { HDS_FULL_GATE: '1' }),
    ).toEqual(['pnpm check:fast', 'pnpm test', 'pnpm smoke:consumer']);
  });

  it('full tier adds the path-triggered heavy subset (#1090)', () => {
    const cmds = planGate('full', ['scripts/upgrade/compile.mjs']);
    expect(cmds[0]).toBe('pnpm check:fast');
    expect(cmds.some((c) => c.includes('scripts/__tests__/upgrade-command.test.mjs'))).toBe(true);
    expect(cmds.at(-1)).toBe('pnpm smoke:consumer');
  });

  it('full tier fails safe to the whole suite when the diff touches the gate mechanism (#1090)', () => {
    expect(planGate('full', ['scripts/__tests__/heavy-files.txt'])).toEqual([
      'pnpm check:fast',
      'pnpm test',
      'pnpm smoke:consumer',
    ]);
    expect(planGate('full', ['vitest.fast.config.ts'])).toEqual([
      'pnpm check:fast',
      'pnpm test',
      'pnpm smoke:consumer',
    ]);
    // Shared config, tokens, generators and hooks fall back to the full lane too.
    for (const f of [
      'package.json',
      'hirobius.tokens.json',
      'scripts/build-tokens.mjs',
      '.husky/pre-push',
    ]) {
      expect(planGate('full', [f])).toContain('pnpm test');
    }
  });
});

describe('published package files (package.json files)', () => {
  it('every published path takes the full tier, except build output', () => {
    expect(classifyGateTier(['dist/index.js']).tier).not.toBe('full');
    expect(classifyGateTier(['docs/api-notes.md']).tier).toBe('docs');
  });
  it('docs-site code runs lint and related tests in the fast tier', () => {
    const plan = planGate('fast', ['docs-site/src/App.tsx']);
    expect(plan.some((c) => c.startsWith('pnpm exec eslint'))).toBe(true);
    expect(plan.some((c) => c.startsWith('pnpm exec vitest related'))).toBe(true);
  });
});
