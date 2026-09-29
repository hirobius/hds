/**
 * CONTRIBUTING.md carries one gate table. This test keeps it honest: the
 * table rows for each stage must equal the steps parsed from the file that
 * actually runs them (.husky/pre-commit, .husky/pre-push, ci.yml).
 *
 * A step is a hook `echo "<name>…"` line plus the commands under it, or a
 * ci.yml step that has a `run:` (checkout/setup steps use `uses:` and are
 * plumbing, not gates).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function parseHook(text) {
  const steps = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('set ')) continue;
    const echo = line.match(/^echo\s+"(.*)"$/);
    if (echo) {
      steps.push({ name: echo[1].replace(/…$/, '').trim(), commands: [] });
    } else if (steps.length) {
      steps[steps.length - 1].commands.push(line);
    }
  }
  return steps.map((s) => ({ name: s.name, command: s.commands.join(' && ') }));
}

function parseWorkflow(text) {
  const steps = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const name = raw.match(/^\s*- name:\s*(.+?)\s*$/);
    if (name) {
      current = { name: name[1] };
      steps.push(current);
      continue;
    }
    const run = raw.match(/^\s*run:\s*(.+?)\s*$/);
    if (run && current && !current.command) current.command = run[1];
  }
  return steps.filter((s) => s.command);
}

function parseTable(markdown) {
  const rows = {};
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length !== 3) continue;
    const [stage, name, command] = cells;
    if (!/^(pre-commit|pre-push|ci)$/.test(stage)) continue;
    (rows[stage] ??= []).push({ name, command: command.replace(/^`|`$/g, '') });
  }
  return rows;
}

const table = parseTable(read('CONTRIBUTING.md'));

describe('parsers', () => {
  it('reads a hook: echo label names a step, following lines are its commands', () => {
    const hook = 'set -e\n# c\necho "A step…"\npnpm a\nnode b.mjs\necho "Next"\npnpm c\n';
    expect(parseHook(hook)).toEqual([
      { name: 'A step', command: 'pnpm a && node b.mjs' },
      { name: 'Next', command: 'pnpm c' },
    ]);
  });

  it('reads a workflow: only named steps that have a run line', () => {
    const wf = '- name: Checkout\n  uses: x\n- name: Test\n  # note\n  run: pnpm test\n';
    expect(parseWorkflow(wf)).toEqual([{ name: 'Test', command: 'pnpm test' }]);
  });
});

describe('CONTRIBUTING.md gate table matches the files that run the gates', () => {
  it('pre-commit', () => {
    expect(table['pre-commit']).toEqual(parseHook(read('.husky/pre-commit')));
  });
  it('pre-push', () => {
    expect(table['pre-push']).toEqual(parseHook(read('.husky/pre-push')));
  });
  it('ci', () => {
    expect(table.ci).toEqual(parseWorkflow(read('.github/workflows/ci.yml')));
  });
});
