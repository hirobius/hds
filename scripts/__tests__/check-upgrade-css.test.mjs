/**
 * scripts/check-upgrade-css.mjs (hds#449): every CSS change since the last
 * release, read from the built stylesheets (dist/css-contract.json), has an
 * upgrade step, and a removal rides a breaking bump.
 *
 * Each case is a throwaway repo at its 0.20.0 release whose snapshot carries a
 * css section (helpers/upgrade-repo.mjs cssRepo), then built again the way a
 * pull request would change the stylesheet.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeCss } from '../check-upgrade-css.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { snapshotFromSource } from '../upgrade/snapshot.mjs';
import {
  RELEASED_CSS,
  buildCss,
  changeset,
  cleanUpRepos,
  cssRepo,
  editPkg,
  note,
  write,
} from './helpers/upgrade-repo.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/check-upgrade-css.mjs');

afterEach(cleanUpRepos);

const rules = (result) => result.violations.map((v) => v.rule).sort();
const messages = (result) => result.violations.map((v) => v.message).join('\n');

/** A pending note with one step listing `facts`. */
function stepFor(id, impact, facts) {
  const plain = 'Check the changed style before upgrading.';
  return { impact, plain, steps: [{ id, kind: id.split('/')[0], impact, plain, facts }] };
}

describe('checkUpgradeCss', () => {
  it('passes a build whose stylesheets match the release', () => {
    const result = checkUpgradeCss(cssRepo());
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails a removed theme variable with no step, then as breaking under a patch, and passes it with a removed step under a minor', () => {
    const root = cssRepo();
    buildCss(root, RELEASED_CSS.replace('--hds-space:4px;', ''));
    // Gone from :root only: dark and the tenant still declare it, so it is a value change.
    expect(checkUpgradeCss(root).violations.map((v) => v.fact)).toEqual([
      'css-var-changed:--hds-space::root',
    ]);

    buildCss(root, RELEASED_CSS.replace(/--hds-space:\dpx;?/g, ''));
    let result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['css-fact-without-step']);
    expect(result.violations[0].fact).toBe('css-var-removed:--hds-space');
    expect(messages(result)).toContain('pnpm upgrade:note');

    changeset(root, 'drop-space', 'patch');
    note(
      root,
      'drop-space',
      stepFor('removed/--hds-space', 'breaking', ['css-var-removed:--hds-space']),
    );
    result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(messages(result)).toContain('minor');

    changeset(root, 'drop-space', 'minor');
    expect(checkUpgradeCss(root).violations).toEqual([]);
  });

  it('fails a removed .hds-focus as breaking: a look step does not cover it', () => {
    const root = cssRepo();
    buildCss(root, RELEASED_CSS.replace('.hds-focus:focus-visible{outline:2px solid}', ''));
    let result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['css-fact-without-step']);
    expect(result.violations[0].fact).toBe('class-removed:hds-focus');

    changeset(root, 'drop-focus', 'minor');
    note(root, 'drop-focus', stepFor('look/hds-focus', 'look', ['class-removed:hds-focus']));
    result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['css-step-not-breaking']);
    expect(messages(result)).toContain('look/hds-focus');

    note(root, 'drop-focus', stepFor('removed/hds-focus', 'breaking', ['class-removed:hds-focus']));
    expect(checkUpgradeCss(root).violations).toEqual([]);
  });

  it('fails a value change with no step, naming the value-changed step pnpm upgrade:note adds', () => {
    const root = cssRepo();
    buildCss(root, RELEASED_CSS.replace('size-xs:13px', 'size-xs:12px'));
    const result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['css-fact-without-step']);
    expect(result.violations[0].fact).toBe('css-var-changed:--primitive-typography-size-xs::root');
    expect(messages(result)).toContain('13px');
    expect(messages(result)).toContain('12px');
    expect(messages(result)).toContain('pnpm upgrade:note adds a value-changed step');

    changeset(root, 'smaller-xs', 'patch');
    const fact = 'css-var-changed:--primitive-typography-size-xs::root';
    note(
      root,
      'smaller-xs',
      stepFor('value-changed/--primitive-typography-size-xs', 'look', [fact]),
    );
    expect(checkUpgradeCss(root).violations).toEqual([]);
  });

  it('reports a removed utility for information only', () => {
    const root = cssRepo();
    buildCss(root, RELEASED_CSS.replace('.flex{display:flex}', ''));
    const result = checkUpgradeCss(root);
    expect(result.violations).toEqual([]);
    expect(result.summary.utilitiesRemoved).toEqual(['flex']);
  });

  it('fails a name removed in an earlier release and reused with a different value', () => {
    const root = cssRepo(`${RELEASED_CSS}:root{--old-radius:4px}`);
    // 0.20.0 had it; 0.21.0 removed it.
    const older = JSON.parse(readFileSync(join(root, 'docs/api/releases/0.20.0.json'), 'utf8'));
    buildCss(root, RELEASED_CSS);
    const shipped = JSON.parse(readFileSync(join(root, 'dist/css-contract.json'), 'utf8'));
    write(
      root,
      'docs/api/releases/0.21.0.json',
      formatJson({ ...older, version: '0.21.0', css: shipped }),
    );
    editPkg(root, (pkg) => (pkg.version = '0.21.0'));

    buildCss(root, `${RELEASED_CSS}:root{--old-radius:8px}`);
    let result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['css-name-reused']);
    expect(messages(result)).toContain('--old-radius');
    expect(messages(result)).toContain('0.20.0');

    // The same value is the old variable back, not a reuse.
    buildCss(root, `${RELEASED_CSS}:root{--old-radius:4px}`);
    result = checkUpgradeCss(root);
    expect(result.violations).toEqual([]);
  });

  it('fails a note step that lists a CSS fact the build does not have', () => {
    const root = cssRepo();
    changeset(root, 'stale', 'minor');
    note(root, 'stale', stepFor('removed/hds-card', 'breaking', ['class-removed:hds-card']));
    const result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['step-fact-unknown']);
    expect(messages(result)).toContain('class-removed:hds-card');
  });

  it('fails when dist/css-contract.json is missing or stale, naming pnpm build:lib', () => {
    const root = cssRepo();
    write(root, 'dist/styles.css', '.hds-new{}');
    let result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['contract-stale']);
    expect(messages(result)).toContain('pnpm build:lib');
    rmSync(join(root, 'dist/css-contract.json'));
    result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['no-built-css']);
    expect(messages(result)).toContain('pnpm build:lib');
  });

  it('fails when the release snapshot has no css section, naming snapshot --from-npm', () => {
    const root = cssRepo();
    write(root, 'docs/api/releases/0.20.0.json', formatJson(snapshotFromSource(root)));
    const result = checkUpgradeCss(root);
    expect(rules(result)).toEqual(['no-css-baseline']);
    expect(messages(result)).toContain('snapshot.mjs --from-npm 0.20.0');
  });
});

describe('check-upgrade-css.mjs CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('exits 0 on a clean build, ignoring --skip-build, and 1 with --json violations on a dirty one', () => {
    const root = cssRepo();
    expect(run(['--root', root, '--skip-build']).status).toBe(0);
    buildCss(root, RELEASED_CSS.replace('.hds-card{padding:var(--hds-space)}', ''));
    const res = run(['--root', root, '--json']);
    expect(res.status).toBe(1);
    const out = JSON.parse(res.stdout);
    expect(out.violations.map((v) => v.rule)).toEqual(['css-fact-without-step']);
  }, 30_000);
});

describe('wiring', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const steps = (script) => pkg.scripts[script].split('&&').map((step) => step.trim());

  it('build:lib writes the contract last, after every stylesheet', () => {
    expect(steps('build:lib').at(-1)).toBe('node scripts/build-css-contract.mjs');
  });

  it('smoke:consumer runs the gate last, after its build', () => {
    expect(steps('smoke:consumer')[0]).toBe('node scripts/smoke-consumer.mjs');
    expect(steps('smoke:consumer').at(-1)).toBe('node scripts/check-upgrade-css.mjs');
  });

  it('is registered in docs/guardrails/registry.json', () => {
    const { gates } = JSON.parse(readFileSync(join(REPO, 'docs/guardrails/registry.json'), 'utf8'));
    expect(gates.find((gate) => gate.id === 'check-upgrade-css')).toMatchObject({
      gateScript: 'scripts/check-upgrade-css.mjs',
      severity: 'error',
      firingChannel: 'pnpm-meta',
    });
  });
});
