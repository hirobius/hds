/**
 * Front door: what a reviewer sees in the first screen of README.md, and that
 * the README says only what CI checks. Reads repo files, and runs
 * scripts/check-focus-states.mjs to compare its exit code with the README's
 * focus line.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const readme = read('README.md');
const accessibility = () => readme.split(/^## /m).find((s) => s.startsWith('Accessibility')) ?? '';
const head = readme.split('\n').slice(0, 20).join('\n');
const links = JSON.parse(read('figma/links.json')) as { storybookUrl: string };

const SCREENSHOT = 'docs/images/storybook-brand-theme-dials.png';

/**
 * What a README focus line claims: violations reported, or a clean pass. Any
 * "violation(s)" counts as reported unless it reads "0", "no" or "zero" violations.
 */
function focusClaim(line: string) {
  const reportsViolations = /(?<!\b(?:0|no|zero)\s+)\bviolations?\b/i.test(line);
  const claimsPass = /\bpass(?:es|ed)?\b/i.test(line) && !reportsViolations;
  return { reportsViolations, claimsPass };
}

describe('README front door (first 20 lines)', () => {
  it('links the live Storybook from figma/links.json', () => {
    expect(links.storybookUrl).toMatch(/^https:\/\//);
    expect(head).toContain(links.storybookUrl);
  });

  it('shows CI, npm and Storybook badges', () => {
    expect(head).toMatch(
      /!\[[^\]]*CI[^\]]*\]\(https:\/\/github\.com\/hirobius\/hds\/actions\/workflows\/ci\.yml\/badge\.svg/,
    );
    expect(head).toMatch(
      /!\[[^\]]*npm[^\]]*\]\(https:\/\/img\.shields\.io\/npm\/v\/@hirobius\/design-system/,
    );
    expect(head).toMatch(/!\[[^\]]*Storybook[^\]]*\]\(https:\/\/img\.shields\.io\/badge\//);
  });

  it('has the install line', () => {
    expect(head).toContain('pnpm add @hirobius/design-system');
  });

  it('embeds a committed screenshot under 400 kB', () => {
    expect(head).toContain(`(${SCREENSHOT})`);
    expect(existsSync(join(ROOT, SCREENSHOT))).toBe(true);
    expect(statSync(join(ROOT, SCREENSHOT)).size).toBeLessThan(400 * 1024);
  });
});

describe('README honesty', () => {
  it('has no PLACEHOLDER anywhere', () => {
    expect(readme).not.toMatch(/PLACEHOLDER/i);
  });

  it('makes no Chromatic visual-review claim', () => {
    expect(readme).not.toMatch(/chromatic/i);
  });

  it('states only the accessibility checks that exist', () => {
    const section = accessibility();
    expect(section).not.toBe('');
    for (const claim of ['check-contrast', 'jsx-a11y', 'check-focus-states', 'addon-a11y']) {
      expect(section).toContain(claim);
    }
    expect(section).not.toMatch(/screen reader|VoiceOver|NVDA|fully accessible|WCAG 2\.\d AAA/i);
  });

  it('reads a focus line as a pass only when it reports no violations', () => {
    const pass = { reportsViolations: false, claimsPass: true };
    const fail = { reportsViolations: true, claimsPass: false };
    expect(focusClaim('and passes with 0 violations.')).toEqual(pass);
    expect(focusClaim('and passes with no violations.')).toEqual(pass);
    expect(focusClaim('and passes with zero violations.')).toEqual(pass);
    expect(focusClaim('and reports 1 violation in `asset-img.tsx`.')).toEqual(fail);
    expect(focusClaim('and passes, with 10 violations.')).toEqual(fail);
    expect(focusClaim('and passes, but reports violations.')).toEqual(fail);
    expect(focusClaim('and passes; violations are listed below.')).toEqual(fail);
  });

  it('states the focus check result the script produces, and that pretest runs it', () => {
    const focus =
      accessibility()
        .split('\n')
        .find((l) => l.includes('check-focus-states')) ?? '';
    const run = spawnSync(process.execPath, ['scripts/check-focus-states.mjs'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const { reportsViolations, claimsPass } = focusClaim(focus);
    if (run.status === 0) {
      expect(reportsViolations, `script exits 0 but README says: ${focus}`).toBe(false);
      expect(claimsPass, `script exits 0 but README does not say it passes: ${focus}`).toBe(true);
    } else {
      expect(claimsPass, `script exits ${run.status} but README says it passes: ${focus}`).toBe(
        false,
      );
    }

    expect(focus).toContain('pretest');
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.pretest).toContain('scripts/check-focus-states.mjs');
  });

  it('names the Storybook axe gate CI runs, and its allowlist as it is', () => {
    const storybook =
      accessibility()
        .split('\n')
        .find((l) => l.includes('addon-a11y')) ?? '';
    expect(storybook).toContain('check-storybook-axe.mjs');
    expect(storybook).not.toMatch(/does not gate/i);
    expect(read('.github/workflows/ci.yml')).toContain('node scripts/check-storybook-axe.mjs');
    const allowlist = JSON.parse(read('scripts/axe-allowlist.json')) as unknown[];
    if (/empty allowlist/i.test(storybook)) expect(allowlist).toEqual([]);
    if (/allowlist has one entry/i.test(storybook)) expect(allowlist).toHaveLength(1);
  });

  it('points only at files that exist', () => {
    const paths = [...accessibility().matchAll(/`([\w.-]+(?:\/[\w.-]+)+\.\w+)`/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const rel of paths) expect(existsSync(join(ROOT, rel)), rel).toBe(true);
  });

  it('keeps the design-links table out of the README, with a pointer to its home', () => {
    expect(readme).not.toContain('design-links:start');
    expect(readme).toContain('docs/DESIGN_LINKS.md');
    const doc = read('docs/DESIGN_LINKS.md');
    expect(doc).toContain('design-links:start');
    expect(doc).toContain('design-links:end');
  });
});
