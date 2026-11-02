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
    expect(cmds).toContain('pnpm exec eslint --max-warnings=0 src/a.tsx src/a.test.tsx');
    expect(cmds).toContain('pnpm typecheck');
    expect(cmds).toContain(
      'pnpm exec vitest related --run --passWithNoTests src/a.tsx src/a.test.tsx',
    );
  });

  it('fast tier with no code files skips lint and vitest', () => {
    const cmds = planGate('fast', ['public/a.svg', 'manifest/x.yaml']);
    expect(cmds.join(' ')).not.toMatch(/eslint|vitest/);
  });

  it('full tier runs check:fast, the whole suite and consumer smoke', () => {
    expect(planGate('full', [])).toEqual(['pnpm check:fast', 'pnpm test', 'pnpm smoke:consumer']);
  });
});
