#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/loop/orchestration-lib.mjs
 *
 * Deterministic core for the HDS autonomous-loop ("loop engineering") setup.
 *
 * This module is the PURE, side-effect-free half of the loop. It does not
 * dispatch agents and does not mutate the tree beyond an explicit, atomic
 * state write. Everything here is unit-tested (scripts/__tests__/loop-
 * orchestration.test.mjs) because — per the loop-engineering thesis — the
 * autonomy is only as trustworthy as the deterministic harness around it.
 *
 * THE VERIFIER CONTRACT (the load-bearing rule):
 *   A unit may be dispatched autonomously ONLY if it names ≥1 mechanical
 *   acceptance check that a separate process can run and that returns a clean
 *   pass/fail. A task whose "done" cannot be expressed that way is `human-only`
 *   and the loop will never dispatch it. This is the difference between a loop
 *   that ratchets quality and "a machine that ships bugs with high confidence."
 *
 * ACCEPTANCE-CHECK DSL (string form, so the file stays human-diffable):
 *   "gate:<registry-id>"   → node scripts/run-gates.mjs --gate <id>   (a registry gate)
 *   "pnpm:<script>"        → pnpm <script>                            (typecheck/test/etc.)
 * Both resolve to a command with a meaningful exit code. Nothing else counts.
 */

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');

export const STATUSES = ['backlog', 'claimed', 'done', 'parked', 'human-only'];
export const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

/**
 * pnpm scripts that are legitimate mechanical verifiers: deterministic,
 * observable exit code, no human judgement. Keep this list tight — adding a
 * non-deterministic script here would silently weaken the verifier contract.
 */
export const PNPM_VERIFIERS = new Set([
  'typecheck',
  'lint',
  'test',
  'test:layout',
  'test:a11y',
  'build',
]);

// ── Loaders (the only fs reads) ──────────────────────────────────────────────

export function loadRegistryGateIds(root = ROOT) {
  const reg = JSON.parse(readFileSync(join(root, 'docs', 'guardrails', 'registry.json'), 'utf8'));
  return new Set((reg.gates ?? []).map((g) => g.id));
}

export function loadOrchestration(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'docs', 'ai', 'orchestration.json'), 'utf8'));
}

/**
 * Atomic write (tmp + rename) — mirrors the registry/orchestration atomic-write
 * discipline (roadmap 13g-27) so a crash mid-write can never corrupt state.
 */
export function saveOrchestration(orchestration, root = ROOT) {
  const path = join(root, 'docs', 'ai', 'orchestration.json');
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(orchestration, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

// ── Acceptance-check parsing ─────────────────────────────────────────────────

/** Parse "gate:foo" / "pnpm:bar" → { kind, ref } | { kind:'invalid', raw }. */
export function parseCheck(raw) {
  if (typeof raw !== 'string') return { kind: 'invalid', raw };
  const [kind, ...rest] = raw.split(':');
  const ref = rest.join(':');
  if (kind === 'gate' && ref) return { kind: 'gate', ref };
  if (kind === 'pnpm' && ref) return { kind: 'pnpm', ref };
  return { kind: 'invalid', raw };
}

/** Resolve a parsed check to the shell command the verifier should run. */
export function checkToCommand(raw) {
  const c = parseCheck(raw);
  if (c.kind === 'gate') return `node scripts/run-gates.mjs --gate ${c.ref}`;
  if (c.kind === 'pnpm') return `pnpm ${c.ref}`;
  return null;
}

function isResolvableCheck(raw, gateIds) {
  const c = parseCheck(raw);
  if (c.kind === 'gate') return gateIds.has(c.ref);
  if (c.kind === 'pnpm') return PNPM_VERIFIERS.has(c.ref);
  return false;
}

// ── The verifier contract ────────────────────────────────────────────────────

/** A unit the loop is allowed to dispatch autonomously this run. */
export function isAutonomousCandidate(u) {
  return u.status === 'backlog' && u.humanOnly !== true;
}

/**
 * Validate the verifier contract across all units.
 * Returns { ok, violations: [{ id, reason }] }.
 *
 * A unit is in violation if it WOULD be autonomously dispatched (backlog,
 * not human-only) but cannot be mechanically verified: no acceptanceChecks,
 * or a check that resolves to no runnable command.
 */
export function validateContract(orchestration, gateIds) {
  const violations = [];
  const seen = new Set();
  for (const u of orchestration.units ?? []) {
    if (!u.id) {
      violations.push({ id: '(missing id)', reason: 'unit has no id' });
      continue;
    }
    if (seen.has(u.id)) violations.push({ id: u.id, reason: 'duplicate unit id' });
    seen.add(u.id);
    if (!STATUSES.includes(u.status)) {
      violations.push({
        id: u.id,
        reason: `invalid status '${u.status}' (allowed: ${STATUSES.join(', ')})`,
      });
    }
    if (!isAutonomousCandidate(u)) continue;
    const checks = u.acceptanceChecks ?? [];
    if (checks.length === 0) {
      violations.push({
        id: u.id,
        reason:
          'autonomous unit declares no acceptanceChecks — mark it human-only or give it a mechanical check',
      });
    }
    for (const raw of checks) {
      if (!isResolvableCheck(raw, gateIds)) {
        violations.push({
          id: u.id,
          reason: `acceptance check '${raw}' does not resolve to a known gate or pnpm verifier`,
        });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

// ── Selection ────────────────────────────────────────────────────────────────

function priorityRank(u) {
  const i = PRIORITY_ORDER.indexOf(u.priority ?? 'P3');
  return i === -1 ? PRIORITY_ORDER.length : i;
}

/**
 * Pick the next dispatchable unit, or null. Pure — caller persists the claim.
 * Honors concurrency (claimed count), attempts cap, and the verifier contract
 * (only contract-clean units are eligible). Priority P0→P3, then declaration
 * order for stability (no clock/random — resume-safe).
 */
export function selectNextUnit(orchestration, gateIds, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? orchestration.budget?.maxAttempts ?? 2;
  const concurrency = opts.concurrency ?? orchestration.concurrency ?? 1;
  const units = orchestration.units ?? [];
  const claimed = units.filter((u) => u.status === 'claimed').length;
  if (claimed >= concurrency)
    return { unit: null, reason: `concurrency cap reached (${claimed}/${concurrency})` };

  const eligible = units
    .map((u, idx) => ({ u, idx }))
    .filter(({ u }) => isAutonomousCandidate(u))
    .filter(({ u }) => (u.attempts ?? 0) < maxAttempts)
    .filter(({ u }) => {
      const checks = u.acceptanceChecks ?? [];
      return checks.length > 0 && checks.every((c) => isResolvableCheck(c, gateIds));
    })
    .sort((a, b) => priorityRank(a.u) - priorityRank(b.u) || a.idx - b.idx);

  return {
    unit: eligible[0]?.u ?? null,
    reason: eligible.length ? 'selected' : 'no contract-eligible backlog units',
  };
}

// ── Transitions (pure: return a new orchestration object) ─────────────────────

const VALID_TRANSITIONS = {
  backlog: ['claimed', 'human-only'],
  claimed: ['done', 'parked', 'backlog'],
  parked: ['backlog'],
  done: [],
  'human-only': ['backlog'],
};

/**
 * Apply a status transition to one unit, returning a NEW orchestration object
 * (no mutation). Throws on an illegal transition so the loop can't silently
 * corrupt state. `patch` merges extra fields (e.g. attempts, lastResult, note).
 */
export function applyTransition(orchestration, unitId, nextStatus, patch = {}) {
  const units = orchestration.units ?? [];
  const target = units.find((u) => u.id === unitId);
  if (!target) throw new Error(`applyTransition: unknown unit '${unitId}'`);
  if (!STATUSES.includes(nextStatus))
    throw new Error(`applyTransition: invalid status '${nextStatus}'`);
  const allowed = VALID_TRANSITIONS[target.status] ?? [];
  if (target.status !== nextStatus && !allowed.includes(nextStatus)) {
    throw new Error(
      `applyTransition: illegal transition ${target.status} → ${nextStatus} for '${unitId}'`,
    );
  }
  return {
    ...orchestration,
    units: units.map((u) => (u.id === unitId ? { ...u, ...patch, status: nextStatus } : u)),
  };
}

/** Compact status counts for `loop status`. Pure. */
export function summarize(orchestration) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const u of orchestration.units ?? []) counts[u.status] = (counts[u.status] ?? 0) + 1;
  return { total: (orchestration.units ?? []).length, counts };
}
