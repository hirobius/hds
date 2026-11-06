/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-no-ordinal-labels.mjs.
 *
 * findViolationsInText runs in memory. The last blocks read the registry and
 * the pre-commit hook, run the gate on its fixtures, and run it over the repo.
 */

import { describe, it, expect } from 'vitest';
import {
  expectCleanRun,
  expectInPreCommit,
  expectNoViolations,
  fixtureRunner,
  registryEntry,
  runExemptionsOn,
  runGate,
} from './helpers/gate-runner.mjs';
import { findViolationsInText, isOrdinalLabel } from '../check-no-ordinal-labels.mjs';

const GATE = 'scripts/check-no-ordinal-labels.mjs';
const count = (text, file) => findViolationsInText(text, file).length;

describe('isOrdinalLabel', () => {
  it.each([
    '01 Getting started',
    '02 — Color',
    '03 · Typography',
    '1. Install',
    '10) Motion',
    '4: Spacing',
    '04Spacing',
  ])('flags %s', (label) => expect(isOrdinalLabel(label)).toBe(true));

  it.each([
    '3 ways to theme',
    '2xs gap',
    '0.33.1',
    '1.0 release notes',
    'Color',
    'WCAG 2.2 contrast',
    '100ms',
  ])('allows %s', (label) => expect(isOrdinalLabel(label)).toBe(false));
});

describe('findViolationsInText: where a label is read', () => {
  it('flags Markdown and MDX headings and the frontmatter title', () => {
    expect(count('## 01 Install\n', 'content/docs/x.mdx')).toBe(1);
    expect(count("---\ntitle: '02 — Color'\n---\n", 'content/docs/x.mdx')).toBe(1);
    expect(count('Body text that says 01 here.\n', 'content/docs/x.mdx')).toBe(0);
  });

  it('skips fenced code blocks in Markdown and MDX', () => {
    const fenced = '```bash\n# 01 install the package\npnpm add x\n```\n';
    expect(count(fenced, 'content/docs/x.mdx')).toBe(0);
    const tilde = "~~~yaml\ntitle: '02 Color'\n~~~\n";
    expect(count(tilde, 'content/docs/x.mdx')).toBe(0);
    expect(count(fenced + '## 03 After the fence\n', 'content/docs/x.mdx')).toBe(1);
  });

  it('flags nav titles and page entries in meta.json', () => {
    expect(count('{ "title": "01 Foundations" }', 'content/docs/meta.json')).toBe(1);
    expect(count('{ "pages": ["---02 Components---", "button"] }', 'content/docs/meta.json')).toBe(
      1,
    );
    expect(count('{ "pages": ["---Components---", "button"] }', 'content/docs/meta.json')).toBe(0);
  });

  it('flags label keys in spec-sheet data, not other values', () => {
    expect(count('{ "title": "03 Anatomy" }', 'figma/spec-sheets/X.json')).toBe(1);
    expect(count('{ "section": "1. Usage" }', 'figma/spec-sheets/X.json')).toBe(1);
    expect(count('{ "value": "04 px" }', 'figma/spec-sheets/X.json')).toBe(0);
  });

  it('flags a label string in a spec-sheet generator', () => {
    expect(count("const t = '01 Anatomy';", 'scripts/generate-spec-sheets.mjs')).toBe(1);
    expect(count("const t = 'Anatomy';", 'scripts/generate-spec-sheets.mjs')).toBe(0);
  });

  it('exempts a line with ordinal-ok and a reason, on the line or the two above', () => {
    expect(count('## 01 Install {/* ordinal-ok: a real sequence */}\n', 'content/docs/x.mdx')).toBe(
      0,
    );
    expect(
      count("// ordinal-ok: step list\n\nconst t = '01 Step';", 'scripts/generate-spec-sheets.mjs'),
    ).toBe(0);
    expect(count("const t = '01 Step'; // ordinal-ok:", 'scripts/generate-spec-sheets.mjs')).toBe(
      1,
    );
  });
});

describe('check-no-ordinal-labels: registry, hook, fixtures and the repo', () => {
  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(registryEntry('check-no-ordinal-labels')).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: 'fixtures/check-no-ordinal-labels',
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    expectInPreCommit(GATE);
  });

  const runOn = fixtureRunner(GATE, 'fixtures/check-no-ordinal-labels');

  it('exits 1 on the canary, naming each line', () => {
    const run = runOn('violating.example.mdx');
    expect(run.status).toBe(1);
    expect(JSON.parse(run.stdout).violations.map((v) => v.line)).toEqual([2, 5, 7, 9]);
  });

  it('exits 0 on the passing fixture', () => {
    expectNoViolations(runOn('passing.example.mdx'));
  });

  it('finds nothing in the repo', () => {
    expectCleanRun(runGate(GATE));
  });

  it('uses a marker check-exemptions knows', () => {
    const run = runExemptionsOn(GATE);
    expect(run.stderr).not.toMatch(/unknown exemption marker "ordinal-ok"/);
    expect(run.status).toBe(0);
  });
});
