#!/usr/bin/env node
/**
 * scripts/check-skills-lock.mjs
 *
 * Supply-chain gate for skills-lock.json (ported from hirobius/ops): every
 * third-party skill must be pinned to an exact commit, installed under
 * `.claude/skills/<id>/`, and hash-match the lock. Read-only, no network.
 * To install or bump a skill, fetch the file at its pinnedCommit (the ops repo
 * has scripts/install-skills.mjs and bump-skills.mjs) and recompute the hash.
 *
 * Usage:
 *   node scripts/check-skills-lock.mjs           # human output, exit 1 on drift
 *   node scripts/check-skills-lock.mjs --json    # machine output (see lib/gate-output.mjs)
 *
 * Fixture mode (tests only, mirrors check-guardrail-drift.mjs):
 *   --fixture-mode with env FIXTURE_FILE=<path> substitutes the lock path,
 *   and reads installed skills from `<dirname(FIXTURE_FILE)>/.claude/skills/`
 *   instead of the real repo tree.
 *
 * Exit codes: 0 clean · 1 drift/missing.
 *
 * @module check-skills-lock
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';
import { loadLock, verifyInstalled } from './lib/skills-lock.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REAL_LOCK_PATH = resolve(ROOT, 'skills-lock.json');

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);
const FIXTURE_MODE = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const FIXTURE_FILE = process.env.FIXTURE_FILE;
const LOCK_PATH = FIXTURE_MODE && FIXTURE_FILE ? resolve(FIXTURE_FILE) : REAL_LOCK_PATH;
const SKILLS_ROOT = FIXTURE_MODE && FIXTURE_FILE ? dirname(LOCK_PATH) : ROOT;

const lock = loadLock(LOCK_PATH);
const violations = [];

const COMMIT_SHA = /^[0-9a-f]{40}$/;

for (const [id, entry] of Object.entries(lock.skills)) {
  if (!COMMIT_SHA.test(entry.pinnedCommit ?? '')) {
    violations.push({
      file: 'skills-lock.json',
      line: null,
      rule: 'SKILL_UNPINNED',
      severity: 'error',
      message:
        `skill '${id}' has no pinnedCommit (a 40-character commit SHA) — a hash with no ` +
        `commit cannot be re-verified against ${entry.source}. Pin the commit the file came from.`,
    });
  }
  const result = verifyInstalled(SKILLS_ROOT, id, entry);
  if (result.ok) continue;

  if (result.reason === 'missing') {
    violations.push({
      file: `.claude/skills/${id}`,
      line: null,
      rule: 'SKILL_MISSING',
      severity: 'error',
      message:
        `skill '${id}' is pinned in skills-lock.json but missing file(s) ${result.missing.join(', ')} — ` +
        `install it from ${entry.source} at its pinned commit.`,
    });
  } else {
    violations.push({
      file: `.claude/skills/${id}`,
      line: null,
      rule: 'SKILL_HASH_DRIFT',
      severity: 'error',
      message:
        `skill '${id}' on disk does not match skills-lock.json (${result.algorithm} expected ` +
        `${result.expected}, got ${result.actual}) — reinstall the file at its ` +
        `pinned commit, or update the lock if the change is intentional.`,
    });
  }
}

const result = {
  violations,
  summary: { skillsChecked: Object.keys(lock.skills).length },
  ok: violations.length === 0,
};

if (!jsonMode) {
  if (result.ok) {
    console.log(`✓ check-skills-lock — ${result.summary.skillsChecked} skill(s) match the lock.`);
  } else {
    console.error(`✗ check-skills-lock — ${violations.length} drift/missing:`);
    for (const v of violations) console.error(`  [${v.rule}] ${v.message}`);
  }
}

emitResult(result, jsonMode);
process.exit(result.ok ? 0 : 1);
