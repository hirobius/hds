/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-motion.mjs: raw durations and easings fail, a listed state
 * change with no motion fails, and the repo as it stands passes.
 */
import { describe, expect, it } from 'vitest';
import {
  findContractGaps,
  findRawCss,
  findRawTsx,
  lacksAnyMotion,
  MOTION_CONTRACT,
  rawReason,
  runCheck,
} from '../check-motion.mjs';

describe('rawReason', () => {
  it('passes token-bound values', () => {
    expect(
      rawReason(
        'opacity var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)',
      ),
    ).toBeNull();
    expect(rawReason('transform calc(var(--primitive-duration-long) * 2)')).toBeNull();
    expect(rawReason('background-color ${d}s var(--hds-motion-productive-easing)')).toBeNull();
    expect(rawReason('none')).toBeNull();
  });

  it('names a raw duration or easing', () => {
    expect(rawReason('color 150ms var(--x)')).toMatch(/raw duration "150ms"/);
    expect(rawReason('color 0.3s')).toMatch(/raw duration "0.3s"/);
    expect(rawReason('color var(--d) ease-out')).toMatch(/raw easing "ease-out"/);
    expect(rawReason('color var(--d) cubic-bezier(0, 0, 1, 1)')).toMatch(/cubic-bezier/);
  });
});

describe('findRawCss', () => {
  it('reads multi-line declarations and honours motion-token-ok', () => {
    const css = [
      '.a {',
      '  transition:',
      '    color 200ms ease;',
      '}',
      '.b {',
      '  /* motion-token-ok: spinner turns at constant speed */',
      '  animation: spin 1s linear infinite;',
      '}',
      '.c { animation: pop var(--hds-motion-exit-duration) var(--hds-motion-exit-easing); }',
    ].join('\n');
    const found = findRawCss(css);
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(2);
  });
});

describe('findRawTsx', () => {
  it('flags Tailwind, inline-style and motion/react literals', () => {
    const tsx = [
      "const a = 'transition-colors duration-300 ease-in-out';",
      'const b = { transition: `opacity ${d}s ease` };',
      'const c = <motion.div transition={{ duration: 0.2 }} />;',
      "const d = <motion.div transition={{ ease: 'easeOut', duration: m.duration }} />;",
    ].join('\n');
    const lines = findRawTsx(tsx).map((r) => r.line);
    expect(lines).toEqual(expect.arrayContaining([1, 2, 3, 4]));
  });

  it('passes token-bound forms and skips comments', () => {
    const tsx = [
      "const a = 'transition-colors duration-[var(--hds-motion-productive-duration)]';",
      'const b = { transition: `opacity ${d}s var(--hds-motion-productive-easing)` };',
      'const c = <motion.div transition={{ duration: m.duration, ease: m.easing }} />;',
      '// a comment may say duration-300 or ease-out',
    ].join('\n');
    expect(findRawTsx(tsx)).toEqual([]);
  });
});

describe('state-change contract', () => {
  const css = '.hds-motion-swap { animation: x var(--d) var(--e); }';

  it('fails a listed component with no motion on its state change', () => {
    const sources = Object.fromEntries(MOTION_CONTRACT.map((row) => [row.file, '']));
    const gaps = findContractGaps(sources, css);
    expect(gaps.some((g) => g.file === 'button.tsx' && /press/.test(g.reason))).toBe(true);
  });

  it('does not take a comment as evidence', () => {
    const sources = { 'tabs.tsx': '// the hds-tabs-indicator slides\n<div />' };
    const gaps = findContractGaps(sources, css);
    expect(gaps.some((g) => g.file === 'tabs.tsx' && /indicator/.test(g.reason))).toBe(true);
  });

  it('fails a listed component that no longer exists', () => {
    expect(findContractGaps({}, css).some((g) => /missing/.test(g.reason))).toBe(true);
  });

  it('fails an hds-motion class with no CSS behind it', () => {
    const gaps = findContractGaps({ 'x.tsx': "className='hds-motion-swap hds-motion-nope'" }, css);
    const undefinedClasses = gaps.filter((g) => /not defined/.test(g.reason));
    expect(undefinedClasses.map((g) => g.reason)).toEqual([
      'hds-motion-nope is not defined in src/styles/component-motion.css',
    ]);
  });
});

describe('lacksAnyMotion', () => {
  it('fails an interactive file with no motion, unless exempted', () => {
    expect(lacksAnyMotion('<button onClick={f}>Go</button>')).toBe(true);
    expect(lacksAnyMotion("<button className='transition-colors'>Go</button>")).toBe(false);
    expect(lacksAnyMotion('// motion-ok: a Button owns it\n<button>Go</button>')).toBe(false);
    expect(lacksAnyMotion('<div>static</div>')).toBe(false);
  });
});

describe('the repo', () => {
  it('passes: every interactive state change moves, on motion tokens', () => {
    expect(runCheck()).toEqual([]);
  });
});
