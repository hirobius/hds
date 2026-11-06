/**
 * hds#751: the duration vars check-reduced-motion requires are derived from the
 * tokens, so a new duration token cannot ship without its reduced-motion zero.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requiredDurationVars } from '../lib/reduced-motion-vars.mjs';

const tokens = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));

describe('requiredDurationVars', () => {
  it('lists every primitive duration and every motion role duration', () => {
    const vars = requiredDurationVars(tokens);
    for (const name of ['instant', 'short', 'medium', 'long', 'stagger', 'extended']) {
      expect(vars).toContain(`--primitive-duration-${name}`);
    }
    for (const role of ['productive', 'expressive', 'spatial', 'exit']) {
      expect(vars).toContain(`--hds-motion-${role}-duration`);
    }
  });

  it('adds a new duration token without a code change', () => {
    const next = structuredClone(tokens);
    next.primitive.duration.glacial = { $value: { value: 900, unit: 'ms' } };
    expect(requiredDurationVars(next)).toContain('--primitive-duration-glacial');
  });

  it('skips non-duration semantic motion tokens', () => {
    const vars = requiredDurationVars(tokens);
    expect(vars).not.toContain('--hds-motion-nudge-duration');
    expect(vars).not.toContain('--hds-motion-distance-duration');
  });
});

describe('check-reduced-motion on the repo', () => {
  it('passes: theme.css zeroes every derived duration', () => {
    expect(() =>
      execFileSync('node', ['scripts/check-reduced-motion.mjs'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
});

// hds#751 slice 3: a component that animates must take its springs and recipes
// through useMotionRecipe / useHdsMotion, never the raw records, which ignore
// reduced motion.
describe('check-reduced-motion Layer 2: springs and recipes', () => {
  const run = (body) => {
    const dir = mkdtempSync(join(tmpdir(), 'rm-'));
    const file = join(dir, 'x.tsx');
    const block = readFileSync('fixtures/check-reduced-motion/passing.example.tsx', 'utf8')
      .split('export function App')[0]
      .replace(/^import .*$/gm, '');
    writeFileSync(file, `import { motion } from 'motion/react';\n${block}\n${body}\n`);
    try {
      execFileSync('node', ['scripts/check-reduced-motion.mjs'], {
        stdio: 'pipe',
        env: { ...process.env, HDS_FIXTURE_MODE: '1', FIXTURE_FILE: file },
      });
      return 0;
    } catch (error) {
      return error.status;
    }
  };

  it('fails on raw MOTION_RECIPES or motionExtras springs', () => {
    expect(run("import { MOTION_RECIPES } from 'x';\nconst r = MOTION_RECIPES.openMenu;")).toBe(1);
    expect(run("import { motionExtras } from 'x';\nconst s = motionExtras.springs.elastic;")).toBe(
      1,
    );
  });

  it('passes through useMotionRecipe', () => {
    expect(
      run("import { useMotionRecipe } from 'x';\nconst r = useMotionRecipe('openMenu');"),
    ).toBe(0);
  });
});
