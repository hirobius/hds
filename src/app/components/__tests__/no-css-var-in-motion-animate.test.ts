/**
 * no-css-var-in-motion-animate.test.ts
 *
 * Regression gate for hds#257: framer-motion's `animate` prop interpolates
 * parsed color/number values — it cannot animate a raw CSS `var(...)` string
 * (nor the keyword `transparent` used as a color endpoint alongside one).
 * Passing one silently no-ops that property while `pnpm test` logs
 * "is not an animatable value" — the only signal, and it's just a stderr
 * warning inside an otherwise-green test.
 *
 * This statically scans every top-level component module for a `motion.*`
 * `animate={{ ... }}` object literal and fails if any value inside it is a
 * quoted `var(--...)` string. Color/border-color state should be driven by
 * `cva` variants (see `radioRingVariants` / `checkboxGlyphVariants`) with a
 * CSS transition applied via inline `style`, not through `animate`.
 *
 * Scope mirrors check-deprecations.mjs: top-level .tsx files in
 * src/app/components/ (not `lab/`, not stories/tests).
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const COMPONENTS_DIR = join(__dirname, '..');

/** Extract the raw text of every `animate={{ ... }}` object literal in `src`. */
function findAnimateBlocks(src: string): string[] {
  const blocks: string[] = [];
  const OPEN_RE = /animate=\{/g;
  let m: RegExpExecArray | null;
  while ((m = OPEN_RE.exec(src)) !== null) {
    // Walk forward from the `{` right after `animate=`, tracking brace depth,
    // to find the matching close — handles nested objects/expressions safely.
    let depth = 0;
    let i = m.index + 'animate='.length;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    blocks.push(src.slice(start, i));
  }
  return blocks;
}

const files = readdirSync(COMPONENTS_DIR).filter((entry) => {
  const full = join(COMPONENTS_DIR, entry);
  return (
    (entry.endsWith('.tsx') || entry.endsWith('.ts')) &&
    !entry.endsWith('.test.tsx') &&
    !entry.endsWith('.test.ts') &&
    !entry.endsWith('.stories.tsx') &&
    statSync(full).isFile()
  );
});

describe('motion `animate` props never carry a CSS var(...) string (hds#257)', () => {
  for (const file of files) {
    it(`${file}`, () => {
      const src = readFileSync(join(COMPONENTS_DIR, file), 'utf-8');
      if (src.includes('// motion-animate-var-ok:')) return;
      const blocks = findAnimateBlocks(src);
      for (const block of blocks) {
        expect(
          block,
          `${file}: a motion \`animate\` prop contains a quoted var(--...) string, which ` +
            'framer-motion cannot interpolate (hds#257) — the transition silently does ' +
            'nothing. Drive the color/border-color through a cva variant + CSS transition ' +
            'instead (see radioRingVariants / checkboxGlyphVariants), or exempt with ' +
            '`// motion-animate-var-ok: <reason>`.',
        ).not.toMatch(/['"`]\s*var\(--/);
      }
    });
  }
});
