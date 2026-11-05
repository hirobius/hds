/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-motion's gaps from hds#784: a comment must not satisfy or exempt a
 * component, and an arbitrary Tailwind motion value must use a token.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'check-motion.mjs');
const dir = mkdtempSync(join(tmpdir(), 'check-motion-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
function check(source) {
  const file = join(dir, `Fixture${n++}.tsx`);
  writeFileSync(file, source);
  const res = spawnSync(process.execPath, [SCRIPT, '--fixture-mode'], {
    env: { ...process.env, FIXTURE_FILE: file },
    encoding: 'utf8',
  });
  return { ok: res.status === 0, out: res.stdout + res.stderr };
}

const button = (cls) => `export const B = () => <button className="${cls}">Go</button>;\n`;

describe('check-motion', () => {
  it('passes a button with a Tailwind transition utility', () => {
    expect(check(button('transition-colors')).ok).toBe(true);
  });

  it('passes a transition on a motion-intent duration variable', () => {
    const src =
      "export const B = () => <button style={{ transition: 'width var(--hds-motion-productive-duration) ease' }}>Go</button>;\n";
    expect(check(src).ok).toBe(true);
  });

  it('fails a button with no motion', () => {
    expect(check(button('px-2')).ok).toBe(false);
  });

  it('does not count a transition class named only in a comment', () => {
    expect(check(`// uses "transition" from the parent\n${button('px-2')}`).ok).toBe(false);
    expect(check(`/* className="transition" */\n${button('px-2')}`).ok).toBe(false);
  });

  it('keeps code after a line comment that contains /* and after // in a string', () => {
    expect(check(`// globs src/**/*.tsx\n${button('transition-colors')}`).ok).toBe(true);
    expect(
      check(
        `const u = 'a//b'; export const B = () => <button className="transition-colors">Go</button>;\n`,
      ).ok,
    ).toBe(true);
  });

  it('does not treat a commented-out button as interactive', () => {
    expect(check(`// <button onClick={go}>\nexport const X = () => <div />;\n`).ok).toBe(true);
  });

  it('accepts a motion-ok line comment with a reason', () => {
    expect(check(`// motion-ok: morph lives in theme.css\n${button('px-2')}`).ok).toBe(true);
  });

  it('ignores motion-ok when it is not a line comment or has no reason', () => {
    expect(check(`const s = '// motion-ok: x';\n${button('px-2')}`).ok).toBe(false);
    expect(check(`// motion-ok:\n${button('px-2')}`).ok).toBe(false);
  });

  it.each([
    'animate-[spin_1s_linear]',
    '[transition:all_150ms]',
    'duration-[150ms]',
    'ease-[cubic-bezier(0,0,1,1)]',
  ])('fails the hard-coded arbitrary motion value %s', (cls) => {
    const res = check(button(`transition-colors ${cls}`));
    expect(res.ok).toBe(false);
    expect(res.out).toContain(cls);
  });

  it('passes an arbitrary motion value built on a token', () => {
    expect(check(button('transition-colors duration-[var(--primitive-duration-fast)]')).ok).toBe(
      true,
    );
  });

  // hds#751: an exemption on a file that already animates is stale. It says
  // "no motion here" over code that has it, and it hid any hard-coded value.
  it('fails a motion-ok exemption on a file that already has motion', () => {
    const r = check(`// motion-ok: colours fade\n${button('transition-colors')}`);
    expect(r.ok).toBe(false);
    expect(r.out).toContain('Stale motion-ok');
    const viaMotion = `// motion-ok: spring below\nimport { motion } from 'motion/react';\nexport const B = () => <motion.button>Go</motion.button>;\n`;
    expect(check(viaMotion).ok).toBe(false);
  });

  it('still accepts a motion-ok exemption on a file with no motion of its own', () => {
    expect(check(`// motion-ok: Button owns the feedback\n${button('px-2')}`).ok).toBe(true);
  });
});
