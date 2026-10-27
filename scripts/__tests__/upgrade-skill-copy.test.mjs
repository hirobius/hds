/**
 * hds#463: `upgrade` refreshes the consumer skill when the project keeps a
 * `.claude/skills/` folder, so an agent never reads a skill older than the
 * installed package.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { PKG, REPO, makeProject, npmLock, pkgJson, runCli } from './helpers/upgrade-fixtures.mjs';

const TARGET = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version;
const { versions } = JSON.parse(readFileSync(join(REPO, 'upgrade/index.json'), 'utf8'));
const FROM = versions.at(-2).version;
const SKILL = '.claude/skills/hds-consumer/SKILL.md';

const project = (extra = {}) =>
  makeProject({
    'package.json': pkgJson('app-npm', { [PKG]: `^${FROM}` }),
    'package-lock.json': npmLock(FROM),
    'src/App.tsx': `import { Button } from '${PKG}';\nexport const App = () => <Button>Go</Button>;\n`,
    ...extra,
  });

const run = (root, ...args) =>
  runCli([
    'upgrade',
    '--root',
    root,
    '--to',
    TARGET,
    '--no-install',
    '--no-typecheck',
    '--json',
    ...args,
  ]);

describe('upgrade writes the consumer skill (hds#463)', () => {
  it('copies the skill into .claude/skills/hds-consumer with hds-version = target', () => {
    const root = project({ '.claude/skills/other/SKILL.md': '---\nname: other\n---\n' });
    const res = run(root);
    const report = JSON.parse(res.stdout);
    const text = readFileSync(join(root, SKILL), 'utf8');
    expect(parseYaml(text.split('---\n')[1]).metadata['hds-version']).toBe(TARGET);
    expect(text).toBe(readFileSync(join(REPO, 'skills/hds-consumer/SKILL.md'), 'utf8'));
    expect(report.changedFiles).toContain(SKILL);
    expect(report.fixedForYou.map((i) => i.id)).toContain('tool/skill');
  });

  it('writes nothing in --check, but lists it', () => {
    const root = project({ '.claude/skills/.keep': '' });
    const res = run(root, '--check');
    const report = JSON.parse(res.stdout);
    expect(existsSync(join(root, SKILL))).toBe(false);
    expect(report.fixedForYou.map((i) => i.id)).toContain('tool/skill');
  });

  it('leaves a project without .claude/skills alone', () => {
    const root = project();
    const report = JSON.parse(run(root).stdout);
    expect(existsSync(join(root, '.claude'))).toBe(false);
    expect(report.fixedForYou.map((i) => i.id)).not.toContain('tool/skill');
  });

  it('does nothing when the copy is already current', () => {
    const root = project({
      [SKILL]: readFileSync(join(REPO, 'skills/hds-consumer/SKILL.md'), 'utf8'),
    });
    const report = JSON.parse(run(root).stdout);
    expect(report.fixedForYou.map((i) => i.id)).not.toContain('tool/skill');
  });
});
