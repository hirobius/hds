#!/usr/bin/env node
// Repo docs check (hirobius/ops docs/standards/REPO-STANDARD.md).
// Copy this file to scripts/check-repo-docs.mjs in a repo. No dependencies.
// Run: node scripts/check-repo-docs.mjs   (exit 1 on a failure)
// Optional overrides: .repo-docs.json  { "caps": { "README.md": 140 }, "library": true }
import { existsSync, readFileSync } from 'node:fs';

const cfg = existsSync('.repo-docs.json')
  ? JSON.parse(readFileSync('.repo-docs.json', 'utf8'))
  : {};
const caps = {
  'README.md': 120,
  'CLAUDE.md': 150,
  'AGENTS.md': 150,
  'CONTRIBUTING.md': 80,
  ...cfg.caps,
};
// A library documents Install + Usage; an app or site documents Run it.
const sections = cfg.library
  ? ['Install', 'Usage', 'Structure', 'Contributing', 'License']
  : ['Stack', 'Run it', 'Structure', 'Contributing', 'License'];
const required = ['README.md', 'CONTRIBUTING.md', ...(cfg.required ?? [])];

const fails = [];
const lines = (f) => readFileSync(f, 'utf8').split('\n');

for (const f of required) if (!existsSync(f)) fails.push(`${f}: missing`);

for (const [f, cap] of Object.entries(caps)) {
  if (!existsSync(f)) continue;
  const n = lines(f).length;
  if (n > cap)
    fails.push(`${f}: ${n} lines, the cap is ${cap}. Move detail to a topic file in docs/.`);
}

if (existsSync('README.md')) {
  const text = readFileSync('README.md', 'utf8');
  const body = lines('README.md');
  if (!/^# \S/.test(body[0] ?? '')) fails.push('README.md: line 1 must be the "# Name" title');
  const first = body.slice(1).find((l) => l.trim() && !l.startsWith('[!['));
  if (!first || first.startsWith('#') || first.length > 160)
    fails.push(
      'README.md: after the title, give one line (160 characters or less) that says what the repo is',
    );
  for (const s of sections)
    if (!new RegExp(`^## ${s}\\s*$`, 'm').test(text)) fails.push(`README.md: no "## ${s}" section`);
  if (!cfg.noScreenshot && !/!\[[^\]]*\]\([^)]+\)/.test(text))
    fails.push('README.md: no screenshot');
  if (!cfg.noLiveLink && !/https?:\/\//.test(text)) fails.push('README.md: no live link');
}

if (fails.length) {
  console.error(`Repo docs check failed:\n- ${fails.join('\n- ')}`);
  process.exit(1);
}
console.log('Repo docs check passed.');
