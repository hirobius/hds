/**
 * Front door: what a reviewer sees in the first screen of README.md, and that
 * the README says only what CI checks. Reads repo files only.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const readme = read('README.md');
const head = readme.split('\n').slice(0, 20).join('\n');
const links = JSON.parse(read('figma/links.json')) as { storybookUrl: string };

const SCREENSHOT = 'docs/images/storybook-brand-theme-dials.png';

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
    const section = readme.split(/^## /m).find((s) => s.startsWith('Accessibility')) ?? '';
    expect(section).not.toBe('');
    for (const claim of ['check-contrast', 'jsx-a11y', 'check-focus-states', 'addon-a11y']) {
      expect(section).toContain(claim);
    }
    expect(section).not.toMatch(/screen reader|VoiceOver|NVDA|fully accessible|WCAG 2\.\d AAA/i);
  });

  it('keeps the design-links table out of the README, with a pointer to its home', () => {
    expect(readme).not.toContain('design-links:start');
    expect(readme).toContain('docs/DESIGN_LINKS.md');
    const doc = read('docs/DESIGN_LINKS.md');
    expect(doc).toContain('design-links:start');
    expect(doc).toContain('design-links:end');
  });
});
