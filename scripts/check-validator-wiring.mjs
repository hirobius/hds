#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-validator-wiring.mjs
 *
 * Meta-validator. Asserts every gate registered in
 * docs/guardrails/registry.json has a `firingChannel` value that
 * actually matches reality — i.e. the channel claims `pre-commit` only
 * if the gate IS in .husky/pre-commit, claims `pnpm-meta` only if it's
 * referenced from a package.json script, and so on.
 *
 * Catches the "aspirational guardrail" failure mode: a gate exists, is
 * registered, but the wiring story it claims doesn't fire in practice.
 * Discovered the hard way 2026-05-04 when audit-typography-overrides
 * had been registered for days but the pre-commit hook wasn't actually
 * invoking it — 17 violations shipped past the dormant gate before we
 * caught it.
 *
 * Also catches tamper/bypass patterns that silence a registered gate:
 *   - Failure-swallowing: `|| true`, `; true`, `; exit 0`, trailing `&`
 *   - Conditional skips: `if false; then ... fi` wrapping a gate
 *   - set +e without a subsequent set -e before a gate invocation
 *   - Missing strictArgv: if a registry gate declares `strictArgv`,
 *     the pre-commit invocation MUST include that argv.
 *
 * Channel taxonomy:
 *   pre-commit       runs every commit via .husky/pre-commit (gating)
 *   pre-push         runs via .husky/pre-push (gating, slower set)
 *   ci-pr            runs on every PR via GitHub Actions (gating)
 *   ci-scheduled     scheduled CI (nightly/weekly)
 *   pnpm-meta        invoked via pnpm meta-scripts (pretest, tokens, …)
 *   ralph-gate       runs from ralph/gate.sh, the fail-closed gate Ralph
 *                    (the autonomous agent) must pass before opening a PR
 *                    (gating). See #181/#188.
 *   manual           operator-only CLI tool, never auto-fires
 *
 * A gate that fires from more than one real channel (e.g. wired into both
 * .husky/pre-commit AND ralph/gate.sh) declares an optional `firingChannels`
 * array alongside the single `firingChannel` (which stays the primary/
 * back-compat value read by run-gates.mjs and older tooling). When
 * `firingChannels` is present, EVERY channel it lists must have real wiring
 * evidence — see `isChannelWired()`.
 *
 * For each gate, this validator:
 *   1. Reads its declared firingChannel (and firingChannels, if present).
 *   2. Asserts the actual invocation site(s) match the declaration(s).
 *   3. Fails if a channel is missing, unknown, or contradicts reality.
 *   4. For pre-commit gates: parses .husky/pre-commit line-by-line and
 *      detects failure-swallowing or conditional-skip patterns.
 *   5. For ralph-gate: parses ralph/gate.sh for a direct gateScript
 *      invocation, or a `pnpm <script>` call whose package.json script
 *      wraps the gateScript.
 *
 * Usage:
 *   node scripts/check-validator-wiring.mjs           # hard-fail on drift
 *   node scripts/check-validator-wiring.mjs --warn    # warn-only mode
 *   node scripts/check-validator-wiring.mjs --report  # print the table
 *   node scripts/check-validator-wiring.mjs --self-test  # run fixture suite
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPrecommit } from './lib/precommit-canonical.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset), so whole-tree behavior is byte-identical.
const FIXTURE_DIR = process.env.FIXTURE_DIR;
const INPUT_ROOT = FIXTURE_DIR || ROOT;

const REGISTRY = path.join(INPUT_ROOT, 'docs/guardrails/registry.json');
const PRECOMMIT = path.join(INPUT_ROOT, '.husky/pre-commit');
const PREPUSH = path.join(INPUT_ROOT, '.husky/pre-push');
const COMMITMSG = path.join(INPUT_ROOT, '.husky/commit-msg');
const PKG = path.join(INPUT_ROOT, 'package.json');
const GH_DIR = path.join(INPUT_ROOT, '.github/workflows');
const RALPH_GATE = path.join(INPUT_ROOT, 'ralph/gate.sh');

const VALID_CHANNELS = new Set([
  'pre-commit',
  'commit-msg',
  'pre-push',
  'ci-pr',
  'ci-scheduled',
  'pnpm-meta',
  'ralph-gate',
  'manual',
]);

const args = new Set(process.argv.slice(2));
const WARN = args.has('--warn');
const REPORT = args.has('--report');
const SELF_TEST = args.has('--self-test');

function readSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function listGhActions() {
  if (!fs.existsSync(GH_DIR)) return '';
  return fs
    .readdirSync(GH_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => readSafe(path.join(GH_DIR, f)))
    .join('\n');
}

/**
 * Parse a shell hook file (e.g. .husky/pre-commit) line-by-line.
 * Returns a structured representation of each significant line.
 *
 * Skips comment lines (lines whose first non-whitespace char is '#').
 * Skips blank lines.
 */
function parseHookLines(content) {
  const lines = content.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    // Skip blank lines
    if (trimmed === '') continue;
    // Skip comment-only lines
    if (trimmed.startsWith('#')) continue;
    result.push({ lineNum: i + 1, raw, trimmed });
  }
  return result;
}

/**
 * Detect tamper/bypass patterns in a parsed hook file for a specific
 * gate script (e.g. "scripts/check-hardcoded-colors.mjs").
 *
 * Returns an array of violation objects:
 *   { lineNum, pattern, detail }
 *
 * Detection rules applied:
 *   1. || true  — failure-swallowing after gate invocation
 *   2. ; true   — semicolon-true swallow after gate invocation
 *   3. ; exit 0 — explicit zero-exit swallow after gate invocation
 *   4. trailing & — gate backgrounded (exit code discarded)
 *   5. if false; then — gate wrapped in always-false conditional
 *   6. set +e    — error-propagation disabled before a gate with no
 *                  compensating set -e after it on the same block
 *   7. missing strictArgv — gate declared with strictArgv in registry
 *                           but the invocation line lacks the required argv
 */
function detectBypassPatterns(parsedLines, gateScript, strictArgv) {
  const violations = [];
  // Normalize: the gate script basename (e.g. "check-hardcoded-colors.mjs")
  // and the path form (e.g. "scripts/check-hardcoded-colors.mjs").
  const scriptBase = path.basename(gateScript);

  // Track set +e / set -e state
  let setEDisabled = false;
  let setEDisabledLine = -1;

  // Track if we're inside an `if false; then ... fi` block
  let inIfFalse = false;
  let ifFalseGatesSeen = [];

  for (let idx = 0; idx < parsedLines.length; idx++) {
    const { lineNum, trimmed } = parsedLines[idx];

    // ── set +e / set -e tracking ──────────────────────────────────────
    if (/^set\s+\+e\b/.test(trimmed)) {
      setEDisabled = true;
      setEDisabledLine = lineNum;
    }
    if (/^set\s+-e\b/.test(trimmed)) {
      setEDisabled = false;
      setEDisabledLine = -1;
    }

    // ── if false; then ... fi tracking ───────────────────────────────
    if (/^if\s+false\s*;\s*then/.test(trimmed)) {
      inIfFalse = true;
      ifFalseGatesSeen = [];
    }
    if (inIfFalse && /^fi\b/.test(trimmed)) {
      // If any gate invocations were seen inside the if-false block, flag them.
      for (const g of ifFalseGatesSeen) {
        violations.push({
          lineNum: g.lineNum,
          pattern: 'IF_FALSE_WRAP',
          detail: `gate '${scriptBase}' is inside 'if false; then ... fi' (always skipped)`,
        });
      }
      inIfFalse = false;
      ifFalseGatesSeen = [];
    }

    // ── Check if this line invokes the gate ──────────────────────────
    const invokesGate = trimmed.includes(gateScript) || trimmed.includes(scriptBase);

    if (!invokesGate) continue;

    // This line invokes the gate. Collect all violations.

    // Rule 5: inside if false; then
    if (inIfFalse) {
      ifFalseGatesSeen.push({ lineNum });
      // Still check other patterns within the if-false block.
    }

    // Rule 6: set +e without subsequent set -e
    if (setEDisabled) {
      violations.push({
        lineNum,
        pattern: 'SET_PLUS_E',
        detail: `gate '${scriptBase}' invoked after 'set +e' (line ${setEDisabledLine}) with no 'set -e' before it — errors not propagated`,
      });
    }

    // Rule 1: || true
    if (/\|\|\s*true\b/.test(trimmed)) {
      violations.push({
        lineNum,
        pattern: 'OR_TRUE',
        detail: `gate '${scriptBase}' followed by '|| true' — failures are swallowed`,
      });
    }

    // Rule 2: ; true (but NOT '; true' that is part of e.g. 'if true; then')
    // Match '; true' at end of line or before a newline/comment, not '; then'
    if (/;\s*true\s*$/.test(trimmed) || /;\s*true\s*#/.test(trimmed)) {
      violations.push({
        lineNum,
        pattern: 'SEMI_TRUE',
        detail: `gate '${scriptBase}' followed by '; true' — exit code swallowed`,
      });
    }

    // Rule 3: ; exit 0
    if (/;\s*exit\s+0\b/.test(trimmed)) {
      violations.push({
        lineNum,
        pattern: 'SEMI_EXIT_ZERO',
        detail: `gate '${scriptBase}' followed by '; exit 0' — unconditional zero exit swallows failures`,
      });
    }

    // Rule 4: trailing &
    // Match lines that end with '&' (possibly with trailing whitespace/comment)
    // but not '&&' (AND operator)
    if (/(?<!&)&\s*$/.test(trimmed) || /(?<!&)&\s*#/.test(trimmed)) {
      violations.push({
        lineNum,
        pattern: 'TRAILING_AMP',
        detail: `gate '${scriptBase}' is backgrounded with '&' — exit code is discarded`,
      });
    }
  }

  // Rule 7: missing strictArgv — checked at file level.
  // At least one invocation of the gate must include the required argv.
  if (strictArgv) {
    const allGateLines = parsedLines.filter(
      ({ trimmed: t }) => t.includes(gateScript) || t.includes(scriptBase),
    );
    const hasStrictInvocation = allGateLines.some(({ trimmed: t }) => t.includes(strictArgv));
    if (allGateLines.length > 0 && !hasStrictInvocation) {
      violations.push({
        lineNum: allGateLines[0].lineNum,
        pattern: 'MISSING_STRICT_ARGV',
        detail: `gate '${scriptBase}' requires argv '${strictArgv}' (per registry strictArgv) but no invocation includes it`,
      });
    }
  }

  return violations;
}

/**
 * Canonical invocation pattern for run-gates.mjs.
 *
 * A gate is considered "wired" for a given channel if EITHER:
 *   (a) the gateScript is directly invoked in the channel's hook/workflow, OR
 *   (b) run-gates.mjs --channel <channel> is present in the hook/workflow,
 *       which means the registry declaration IS the wiring source of truth.
 *
 * Pattern (b) is the canonical form introduced by 13g-11-unified-gate-runner.
 * Both forms are accepted so that gates can be migrated gradually.
 */

/**
 * Check whether a hook/workflow content string contains the unified runner
 * invocation for a given channel, i.e.:
 *   node scripts/run-gates.mjs --channel <channel>
 */
function hasUnifiedRunnerInvocation(content, channel) {
  // Match: node scripts/run-gates.mjs --channel <channel>
  // Allow any whitespace, any node path prefix (e.g. "node " or just the script).
  return content.includes(`run-gates.mjs --channel ${channel}`);
}

/**
 * Escape a string for safe interpolation into a RegExp source.
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect whether a gate is wired into ralph/gate.sh — either directly
 * (the gateScript path/basename appears in the file) or indirectly (the
 * file runs `pnpm <script-name>` / `pnpm run <script-name>` for a
 * package.json script whose command invokes the gateScript). Ralph's
 * gate.sh calls gates via their pnpm script alias (e.g. `pnpm check:contrast`),
 * so the indirect form is the common case — see ralph/gate.sh (#181).
 */
function hasRalphGateWiring(gateScript, pkgObj, ralphGateContent) {
  if (!ralphGateContent) return false;
  const scriptBase = path.basename(gateScript);
  if (ralphGateContent.includes(gateScript) || ralphGateContent.includes(scriptBase)) {
    return true;
  }
  const scripts = pkgObj.scripts || {};
  for (const [name, cmd] of Object.entries(scripts)) {
    if (!cmd.includes(gateScript)) continue;
    const re = new RegExp(`\\bpnpm(?:\\s+run)?\\s+${escapeRegExp(name)}\\b`);
    if (re.test(ralphGateContent)) return true;
  }
  return false;
}

/**
 * Evidence check for a single declared channel, used for gates that
 * declare `firingChannels` (multiple real channels). Unlike `detectChannel`
 * (which picks ONE "best" actual channel by precedence, for the legacy
 * single-channel report), this asks a yes/no question per channel so every
 * declared channel in a multi-channel gate can be verified independently.
 */
function isChannelWired(channel, entry, ctx) {
  const { gateScript } = entry;
  const {
    precommitContent,
    prepushContent,
    commitmsgContent,
    ghActionsContent,
    pkgObj,
    ralphGateContent,
    precommitUsesUnifiedRunner,
  } = ctx;
  const scriptBase = path.basename(gateScript, '.mjs');

  switch (channel) {
    case 'pre-commit':
      return precommitContent.includes(gateScript) || precommitUsesUnifiedRunner;
    case 'pre-push':
      return (
        prepushContent.includes(gateScript) ||
        hasUnifiedRunnerInvocation(prepushContent, 'pre-push')
      );
    case 'commit-msg':
      return commitmsgContent.includes(gateScript);
    case 'ci-pr':
      return (
        ghActionsContent.includes(gateScript) ||
        ghActionsContent.includes(scriptBase) ||
        hasUnifiedRunnerInvocation(ghActionsContent, 'ci-pr')
      );
    case 'ci-scheduled':
      return (
        ghActionsContent.includes(gateScript) ||
        ghActionsContent.includes(scriptBase) ||
        hasUnifiedRunnerInvocation(ghActionsContent, 'ci-scheduled')
      );
    case 'pnpm-meta': {
      const scripts = pkgObj.scripts || {};
      return Object.values(scripts).some((cmd) => cmd.includes(gateScript));
    }
    case 'ralph-gate':
      return hasRalphGateWiring(gateScript, pkgObj, ralphGateContent);
    case 'manual':
      // No automatic invocation is required for 'manual' — a human running
      // the script on demand is the whole point of the channel.
      return true;
    default:
      return false;
  }
}

/**
 * Run the full wiring check against a given pre-commit file path
 * and a registry object.
 *
 * Returns { violations, summary } where violations is an array of
 * objects and summary is an array of per-gate status objects.
 */
function runWiringCheck(
  registryObj,
  precommitPath,
  prepushPath,
  ghActionsContent,
  pkgObj,
  commitmsgPath,
  ralphGatePath,
) {
  const violations = [];
  const summary = [];

  const precommitContent = readSafe(precommitPath);
  const parsedPrecommit = parseHookLines(precommitContent);
  const prepushContent = prepushPath ? readSafe(prepushPath) : '';
  const commitmsgContent = commitmsgPath ? readSafe(commitmsgPath) : '';
  const ralphGateContent = ralphGatePath ? readSafe(ralphGatePath) : '';

  // Detect whether run-gates.mjs is itself bypassed in pre-commit
  // (if the unified runner is in use, it must not be failure-swallowed).
  const precommitUsesUnifiedRunner = hasUnifiedRunnerInvocation(precommitContent, 'pre-commit');
  if (precommitUsesUnifiedRunner) {
    // Check that the run-gates.mjs line itself isn't bypass-wrapped.
    const runnerBypassViolations = detectBypassPatterns(
      parsedPrecommit,
      'scripts/run-gates.mjs',
      null,
    );
    for (const bv of runnerBypassViolations) {
      violations.push({
        id: 'run-gates-pre-commit-runner',
        code: bv.pattern,
        detail: `line ${bv.lineNum}: run-gates.mjs --channel pre-commit is bypass-wrapped: ${bv.detail}`,
      });
    }
  }

  function detectChannel(gateScript, declaredChannel) {
    // Direct invocation: the gate script is literally in the hook content.
    if (precommitContent.includes(gateScript)) return 'pre-commit';
    if (prepushContent.includes(gateScript)) return 'pre-push';
    if (commitmsgContent.includes(gateScript)) return 'commit-msg';

    // ralph-gate: checked before the unified-runner/CI/pnpm-meta fallbacks so
    // a gate solely declared `"firingChannel": "ralph-gate"` (no
    // firingChannels array) is still confirmed via the same evidence
    // isChannelWired() uses for the multi-channel path.
    if (
      declaredChannel === 'ralph-gate' &&
      hasRalphGateWiring(gateScript, pkgObj, ralphGateContent)
    )
      return 'ralph-gate';

    // Canonical unified runner invocation: run-gates.mjs --channel <channel>
    // is in the hook content AND the gate is registered for that channel.
    if (declaredChannel === 'pre-commit' && precommitUsesUnifiedRunner) return 'pre-commit';
    if (declaredChannel === 'pre-push' && hasUnifiedRunnerInvocation(prepushContent, 'pre-push'))
      return 'pre-push';
    if (declaredChannel === 'ci-pr' && hasUnifiedRunnerInvocation(ghActionsContent, 'ci-pr'))
      return 'ci-detected';
    if (
      declaredChannel === 'ci-scheduled' &&
      hasUnifiedRunnerInvocation(ghActionsContent, 'ci-scheduled')
    )
      return 'ci-detected';

    // Fallback: check legacy per-gate invocations in GH Actions / pnpm.
    if (
      ghActionsContent.includes(gateScript) ||
      ghActionsContent.includes(path.basename(gateScript, '.mjs'))
    )
      return 'ci-detected';
    const scripts = pkgObj.scripts || {};
    const callers = Object.entries(scripts).filter(([, cmd]) => cmd.includes(gateScript));
    if (callers.length) return 'pnpm-meta';

    // ralph-gate, checked again as a last-resort fallback: a gate wired into
    // ralph/gate.sh purely via a pnpm script alias (no other automatic
    // channel) would otherwise fall through to 'none'.
    if (hasRalphGateWiring(gateScript, pkgObj, ralphGateContent)) return 'ralph-gate';
    return 'none';
  }

  for (const entry of registryObj.gates) {
    const declared = entry.firingChannel;
    if (!declared) {
      violations.push({
        id: entry.id,
        code: 'MISSING_CHANNEL',
        detail: 'firingChannel is missing',
      });
      continue;
    }
    if (!VALID_CHANNELS.has(declared)) {
      violations.push({
        id: entry.id,
        code: 'BAD_CHANNEL',
        detail: `unknown channel '${declared}'`,
      });
      continue;
    }

    // Multi-channel gates (e.g. wired into both pre-commit AND ralph/gate.sh)
    // declare `firingChannels`. Every listed channel must have independent
    // wiring evidence — this replaces the single "best match" detectChannel
    // comparison below, which can only ever confirm one channel at a time.
    if (Array.isArray(entry.firingChannels) && entry.firingChannels.length > 0) {
      const channels = entry.firingChannels;
      let entryOk = true;

      if (!channels.includes(declared)) {
        violations.push({
          id: entry.id,
          code: 'FIRING_CHANNEL_NOT_IN_CHANNELS',
          detail: `firingChannel '${declared}' is not present in firingChannels [${channels.join(', ')}]`,
        });
        entryOk = false;
      }

      const ctx = {
        precommitContent,
        prepushContent,
        commitmsgContent,
        ghActionsContent,
        pkgObj,
        ralphGateContent,
        precommitUsesUnifiedRunner,
      };

      const unwired = [];
      for (const channel of channels) {
        if (!VALID_CHANNELS.has(channel)) {
          violations.push({
            id: entry.id,
            code: 'BAD_CHANNEL',
            detail: `unknown channel '${channel}' in firingChannels`,
          });
          entryOk = false;
          continue;
        }
        if (!isChannelWired(channel, entry, ctx)) {
          unwired.push(channel);
        }
      }

      if (unwired.length > 0) {
        violations.push({
          id: entry.id,
          code: 'MULTI_CHANNEL_DRIFT',
          detail: `declared firingChannels [${channels.join(', ')}] but no wiring evidence found for: ${unwired.join(', ')}`,
        });
        entryOk = false;
      }

      summary.push({
        id: entry.id,
        declared: channels.join('+'),
        actual: entryOk
          ? channels.join('+')
          : `${channels.join('+')} (missing: ${unwired.join(', ')})`,
      });

      // Pre-commit bypass/tamper detection still applies when pre-commit is
      // one of the declared channels and the gate is directly invoked there.
      if (channels.includes('pre-commit') && precommitContent.includes(entry.gateScript)) {
        const bypassViolations = detectBypassPatterns(
          parsedPrecommit,
          entry.gateScript,
          entry.strictArgv || null,
        );
        for (const bv of bypassViolations) {
          violations.push({
            id: entry.id,
            code: bv.pattern,
            detail: `line ${bv.lineNum}: ${bv.detail}`,
          });
        }
      }

      continue;
    }

    const actual = detectChannel(entry.gateScript, declared);

    let ok = false;
    if (declared === actual) ok = true;
    else if ((declared === 'ci-pr' || declared === 'ci-scheduled') && actual === 'ci-detected')
      ok = true;
    else if (declared === 'manual' && (actual === 'none' || actual === 'pnpm-meta')) ok = true;
    else if (declared === 'pre-commit' && actual === 'pre-commit') ok = true;
    else if (declared === 'commit-msg' && actual === 'commit-msg') ok = true;

    summary.push({ id: entry.id, declared, actual });

    if (!ok) {
      violations.push({
        id: entry.id,
        code: 'WIRING_DRIFT',
        detail: `declared '${declared}' but detected '${actual}'`,
      });
    }

    // For pre-commit gates, additionally check for bypass/tamper patterns.
    // When using the unified runner, individual gate scripts aren't in the hook
    // file, so bypass checking shifts to the run-gates.mjs invocation line
    // (checked above at the runner level). Only run per-gate bypass detection
    // when the gate IS directly invoked (legacy or explicit override).
    if (
      declared === 'pre-commit' &&
      actual === 'pre-commit' &&
      precommitContent.includes(entry.gateScript)
    ) {
      const bypassViolations = detectBypassPatterns(
        parsedPrecommit,
        entry.gateScript,
        entry.strictArgv || null,
      );
      for (const bv of bypassViolations) {
        violations.push({
          id: entry.id,
          code: bv.pattern,
          detail: `line ${bv.lineNum}: ${bv.detail}`,
        });
      }
    }

    // For pre-commit gates using the unified runner with strictArgv: the runner
    // itself appends strictArgv (via buildArgv), so no per-line check needed.
    // But if the gate is wired via unified runner AND has strictArgv, verify
    // that run-gates.mjs is the invocation (not a bare invocation without argv).
    if (
      declared === 'pre-commit' &&
      entry.strictArgv &&
      precommitUsesUnifiedRunner &&
      !precommitContent.includes(entry.gateScript)
    ) {
      // Unified runner handles strictArgv via registry.strictArgv — no violation.
      // This block is intentionally empty (documents the case explicitly).
    }
  }

  return { violations, summary };
}

// ────────────────────────────────────────────────────────────────────────────
// Self-test mode
// ────────────────────────────────────────────────────────────────────────────

if (SELF_TEST) {
  const FIXTURE_DIR = path.join(ROOT, 'scripts/__tests__/fixtures/wiring');

  // Load the real registry for fixture testing.
  const registryObj = JSON.parse(readSafe(REGISTRY));
  const pkgObj = JSON.parse(readSafe(PKG) || '{}');
  const ghActionsContent = listGhActions();

  // Fixture definitions: { file, expectPass }
  const fixtures = [
    { file: 'good.husky-pre-commit', expectPass: true },
    { file: 'bad-or-true.husky-pre-commit', expectPass: false },
    { file: 'bad-semi-true.husky-pre-commit', expectPass: false },
    { file: 'bad-exit-zero.husky-pre-commit', expectPass: false },
    { file: 'bad-trailing-amp.husky-pre-commit', expectPass: false },
    { file: 'bad-if-false.husky-pre-commit', expectPass: false },
    { file: 'bad-set-plus-e.husky-pre-commit', expectPass: false },
    { file: 'bad-missing-strict-argv.husky-pre-commit', expectPass: false },
  ];

  let allPassed = true;
  const results = [];

  for (const { file, expectPass } of fixtures) {
    const fixturePath = path.join(FIXTURE_DIR, file);
    if (!fs.existsSync(fixturePath)) {
      console.error(`  MISSING fixture: ${file}`);
      results.push({ file, ok: false, reason: 'fixture file missing' });
      allPassed = false;
      continue;
    }

    const { violations } = runWiringCheck(
      registryObj,
      fixturePath,
      null, // no pre-push fixture
      ghActionsContent,
      pkgObj,
      null, // no commit-msg fixture
      RALPH_GATE, // real ralph/gate.sh — only the pre-commit file is swapped
    );

    const passed = violations.length === 0;
    const ok = (expectPass && passed) || (!expectPass && !passed);

    if (!ok) {
      allPassed = false;
      const reason = expectPass
        ? `expected PASS but got ${violations.length} violation(s): ${violations.map((v) => v.code).join(', ')}`
        : `expected FAIL but got 0 violations (bypass not detected)`;
      results.push({ file, ok: false, reason });
    } else {
      results.push({ file, ok: true });
    }
  }

  // ── ralph-gate channel scenarios (#188) ──────────────────────────────────
  // Synthetic single-gate registries + synthetic ralph/gate.sh / pre-commit /
  // package.json content, run in-memory through runWiringCheck. Unlike the
  // fixtures above (which swap one real file against the real registry),
  // these prove the ralph-gate detection paths themselves: single-channel
  // direct invocation, single-channel indirect (pnpm script alias),
  // single-channel not-wired, multi-channel pass/fail, and the
  // BAD_CHANNEL / FIRING_CHANNEL_NOT_IN_CHANNELS guards on firingChannels.
  const channelScenarios = [
    {
      name: 'ralph-gate-direct',
      expectPass: true,
      registry: {
        gates: [
          {
            id: 'scenario-direct',
            gateScript: 'scripts/scenario-direct.mjs',
            firingChannel: 'ralph-gate',
          },
        ],
      },
      ralphGate: 'run_step node scripts/scenario-direct.mjs\n',
    },
    {
      name: 'ralph-gate-indirect-pnpm-alias',
      expectPass: true,
      registry: {
        gates: [
          {
            id: 'scenario-indirect',
            gateScript: 'scripts/scenario-indirect.mjs',
            firingChannel: 'ralph-gate',
          },
        ],
      },
      pkg: { scripts: { 'check:scenario': 'node scripts/scenario-indirect.mjs' } },
      ralphGate: 'run_step pnpm check:scenario\n',
    },
    {
      name: 'ralph-gate-not-wired',
      expectPass: false,
      registry: {
        gates: [
          {
            id: 'scenario-missing',
            gateScript: 'scripts/scenario-missing.mjs',
            firingChannel: 'ralph-gate',
          },
        ],
      },
      ralphGate: '',
    },
    {
      name: 'multi-channel-both-wired',
      expectPass: true,
      registry: {
        gates: [
          {
            id: 'scenario-multi-pass',
            gateScript: 'scripts/scenario-multi-pass.mjs',
            firingChannel: 'pre-commit',
            firingChannels: ['pre-commit', 'ralph-gate'],
          },
        ],
      },
      precommit: 'node scripts/scenario-multi-pass.mjs\n',
      ralphGate: 'run_step node scripts/scenario-multi-pass.mjs\n',
    },
    {
      name: 'multi-channel-ralph-gate-missing',
      expectPass: false,
      registry: {
        gates: [
          {
            id: 'scenario-multi-fail',
            gateScript: 'scripts/scenario-multi-fail.mjs',
            firingChannel: 'pre-commit',
            firingChannels: ['pre-commit', 'ralph-gate'],
          },
        ],
      },
      precommit: 'node scripts/scenario-multi-fail.mjs\n',
      ralphGate: '',
    },
    {
      name: 'multi-channel-unknown-channel',
      expectPass: false,
      registry: {
        gates: [
          {
            id: 'scenario-bad-channel',
            gateScript: 'scripts/scenario-bad-channel.mjs',
            firingChannel: 'ralph-gate',
            firingChannels: ['ralph-gate', 'moon-phase'],
          },
        ],
      },
      ralphGate: 'run_step node scripts/scenario-bad-channel.mjs\n',
    },
    {
      name: 'firing-channel-not-in-firing-channels',
      expectPass: false,
      registry: {
        gates: [
          {
            id: 'scenario-not-in-channels',
            gateScript: 'scripts/scenario-not-in-channels.mjs',
            firingChannel: 'pre-commit',
            firingChannels: ['ralph-gate'],
          },
        ],
      },
      ralphGate: 'run_step node scripts/scenario-not-in-channels.mjs\n',
    },
  ];

  const channelResults = [];

  for (const scenario of channelScenarios) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hds-wiring-scenario-'));
    try {
      const precommitPath = path.join(tmpDir, 'pre-commit');
      const ralphGatePath = path.join(tmpDir, 'gate.sh');
      fs.writeFileSync(precommitPath, scenario.precommit || '');
      fs.writeFileSync(ralphGatePath, scenario.ralphGate || '');

      const { violations } = runWiringCheck(
        scenario.registry,
        precommitPath,
        null,
        '', // no GH Actions content
        scenario.pkg || {},
        null,
        ralphGatePath,
      );

      const passed = violations.length === 0;
      const ok = (scenario.expectPass && passed) || (!scenario.expectPass && !passed);

      if (!ok) {
        allPassed = false;
        const reason = scenario.expectPass
          ? `expected PASS but got ${violations.length} violation(s): ${violations.map((v) => v.code).join(', ')}`
          : `expected FAIL but got 0 violations`;
        channelResults.push({ file: scenario.name, ok: false, reason });
      } else {
        channelResults.push({ file: scenario.name, ok: true });
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Print summary
  console.log('\ncheck-validator-wiring --self-test');
  console.log('─'.repeat(70));
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    const status = r.ok ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${status}  ${r.file}`);
    if (!r.ok) console.log(`         → ${r.reason}`);
  }
  console.log('  ── ralph-gate channel scenarios (#188) ──');
  for (const r of channelResults) {
    const icon = r.ok ? '✓' : '✗';
    const status = r.ok ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${status}  ${r.file}`);
    if (!r.ok) console.log(`         → ${r.reason}`);
  }
  results.push(...channelResults);
  console.log('─'.repeat(70));
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`  ${passed}/${total} sub-tests passed`);
  console.log();

  if (!allPassed) {
    console.error('✗ check-validator-wiring --self-test FAILED');
    process.exit(1);
  }
  console.log('✓ check-validator-wiring --self-test PASSED');
  process.exit(0);
}

// ────────────────────────────────────────────────────────────────────────────
// Normal mode: check the real .husky/pre-commit
// ────────────────────────────────────────────────────────────────────────────

const registryObj = JSON.parse(readSafe(REGISTRY));
const pkgObj = JSON.parse(readSafe(PKG) || '{}');
const ghActionsContent = listGhActions();

const { violations, summary } = runWiringCheck(
  registryObj,
  PRECOMMIT,
  PREPUSH,
  ghActionsContent,
  pkgObj,
  COMMITMSG,
  RALPH_GATE,
);

// ── Pre-commit structure hash check ─────────────────────────────────────────
// Recompute the canonical SHA-256 of .husky/pre-commit and compare against
// the hash stored in registry.json. Drift means a structural change to the
// hook file hasn't been reflected in the registry. Run
// `node scripts/update-precommit-hash.mjs` and commit the registry update
// alongside the hook change.
if (registryObj.precommitStructureHash) {
  const precommitRaw = readSafe(PRECOMMIT);
  if (precommitRaw) {
    const fileHash = hashPrecommit(precommitRaw);
    const registryHash = registryObj.precommitStructureHash;
    if (fileHash !== registryHash) {
      violations.push({
        id: 'pre-commit-structure-hash',
        code: 'PRECOMMIT_HASH_DRIFT',
        detail:
          `pre-commit structural drift: registry hash ${registryHash}, file hash ${fileHash}. ` +
          `If the change is intentional, run \`node scripts/update-precommit-hash.mjs\` and commit ` +
          `the registry update with the hook change.`,
      });
    }
  }
}

if (REPORT) {
  console.log(`${'GATE'.padEnd(48)}  DECLARED         DETECTED`);
  console.log('-'.repeat(95));
  for (const s of summary) {
    console.log(`${s.id.padEnd(48)}  ${s.declared.padEnd(15)}  ${s.actual}`);
  }
  console.log();
}

if (violations.length === 0) {
  console.log(`✓ check-validator-wiring — ${registryObj.gates.length} gate(s) wired as declared.`);
  process.exit(0);
}

console.error(`✗ check-validator-wiring — ${violations.length} drift / missing(s):`);
for (const v of violations) {
  console.error(`    [${v.code}]  ${v.id}: ${v.detail}`);
}
process.exit(WARN ? 0 : 1);
