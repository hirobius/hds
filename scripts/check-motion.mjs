#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-motion.mjs
 *
 * Every user action on an HDS component gets a visible, token-timed response.
 * Three rules, each an outcome the gate can read from source:
 *
 *   1. RAW MOTION. A transition or animation in a component (.tsx) or a
 *      stylesheet (src/styles/*.css) names its duration and easing through a
 *      motion token: var(--hds-motion-*), var(--primitive-duration-*),
 *      var(--primitive-easing-*), or useHdsMotion(). A literal (150ms, 0.2s,
 *      ease-out, cubic-bezier(...), Tailwind duration-300 / ease-in-out, a
 *      motion/react `duration: 0.2`) fails: it skips the reduced-motion zeroing
 *      in theme.css and drifts from the token scale. Exempt one declaration
 *      with a `motion-token-ok: <reason>` comment on its line or the line above.
 *
 *   2. STATE CHANGES. MOTION_CONTRACT lists each interactive component's state
 *      changes (press, open/close, indicator move, content swap...) and the
 *      source evidence that the change moves. A missing piece of evidence fails.
 *      A component in the list that no longer exists fails too: update the list.
 *
 *   3. ANY MOTION. Any other interactive component file (a button, input,
 *      onClick...) carries some motion: motion/react, a transition utility, or a
 *      motion token. Exempt a file with `// motion-ok: <reason>`.
 *
 * Every hds-motion-* class a component names must be defined in
 * src/styles/component-motion.css, so a renamed class cannot pass rule 2 while
 * animating nothing.
 *
 * SELF-IMPROVEMENT LOG
 * v1 (2026-03-16): interactive components need motion/react, an hds.duration
 *                  reference, or a // motion-ok exemption.
 * v2 (2026-09-21): recognise Tailwind transition-/animate- utilities.
 * v3 (2026-10-17): fail raw durations and easings; per-component state-change
 *                  contract (Adrian: "we built motion but haven't implemented a
 *                  lot of it"). Fires from pretest, so pre-push and CI.
 *
 * Usage: pnpm check:micromotion
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSpecFile } from './lib/gate-scope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMP_DIR = join(ROOT, 'src/app/components');
const STYLE_DIR = join(ROOT, 'src/styles');
const MOTION_CSS = join(STYLE_DIR, 'component-motion.css');

// ── Rule 2: the state-change contract ─────────────────────────────────────────
// One row per state change that must move. `evidence` is what in the source
// proves it: a component-motion.css class, a motion/react API, or a token-timed
// transition utility (bare transition utilities time on the productive token
// through theme.css's @theme defaults).
export const MOTION_CONTRACT = [
  { file: 'button.tsx', state: 'press', evidence: /active:scale-/ },
  { file: 'button.tsx', state: 'hover / focus colour', evidence: /transition-\[color,/ },
  { file: 'button.tsx', state: 'toggle content swap', evidence: /hds-motion-swap/ },
  { file: 'tabs.tsx', state: 'selected-indicator move', evidence: /hds-tabs-indicator/ },
  { file: 'segmented-control.tsx', state: 'selected-indicator move', evidence: /layoutId=/ },
  { file: 'menu.tsx', state: 'open / close', evidence: /hds-motion-popover/ },
  { file: 'popover.tsx', state: 'open / close', evidence: /hds-motion-popover/ },
  { file: 'select.tsx', state: 'open / close', evidence: /hds-motion-popover/ },
  { file: 'hds-tooltip.tsx', state: 'open / close', evidence: /hds-motion-popover/ },
  { file: 'tooltip.tsx', state: 'open / close', evidence: /AnimatePresence/ },
  { file: 'dialog.tsx', state: 'open / close', evidence: /hds-motion-modal/ },
  { file: 'dialog.tsx', state: 'scrim fade', evidence: /hds-motion-scrim/ },
  { file: 'alert-dialog.tsx', state: 'open / close', evidence: /hds-motion-modal/ },
  { file: 'alert-dialog.tsx', state: 'scrim fade', evidence: /hds-motion-scrim/ },
  { file: 'toast.tsx', state: 'enter / swipe / exit', evidence: /hds-motion-toast/ },
  { file: 'disclosure.tsx', state: 'height open / close', evidence: /height: 'auto'/ },
  { file: 'skeleton.tsx', state: 'skeleton → content', evidence: /hds-motion-reveal/ },
  { file: 'presence-list.tsx', state: 'item enter', evidence: /hds-motion-item-enter/ },
  { file: 'presence-list.tsx', state: 'item exit collapse', evidence: /exit=\{/ },
  { file: 'checkbox.tsx', state: 'check', evidence: /useHdsMotion/ },
  { file: 'radio.tsx', state: 'select', evidence: /useHdsMotion/ },
  { file: 'toggle.tsx', state: 'thumb slide', evidence: /useHdsMotion/ },
  { file: 'slider.tsx', state: 'fill', evidence: /useHdsMotion/ },
  { file: 'input.tsx', state: 'focus / hover', evidence: /transition-colors/ },
  { file: 'textarea.tsx', state: 'focus / hover', evidence: /transition-colors/ },
  { file: 'tag.tsx', state: 'hover / select', evidence: /transition-colors/ },
  { file: 'card.tsx', state: 'interactive hover lift', evidence: /hover:scale-/ },
  { file: 'theme-toggle.tsx', state: 'sun / moon morph', evidence: /hds-theme-toggle__/ },
];

const CONTRACTED = new Set(MOTION_CONTRACT.map((row) => row.file));

// ── Rule 1: raw motion ────────────────────────────────────────────────────────
const EXEMPT_TOKEN = 'motion-token-ok:';
const RAW_TIME = /(?<![-\w.$])\d*\.?\d+m?s(?![-\w])/;
const RAW_EASING =
  /(?<![-\w])(?:ease(?:-in-out|-in|-out)?|linear|step-start|step-end)(?![-\w])|cubic-bezier\(|steps\(|linear\(/;

function stripVars(value) {
  let out = value;
  let prev;
  do {
    prev = out;
    out = out.replace(/var\([^()]*\)/g, '');
  } while (out !== prev);
  return out;
}

/** Why a transition/animation value is raw, or null when it is token-bound. */
export function rawReason(value) {
  const bare = stripVars(value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\$\{[^}]*\}/g, ''));
  if (RAW_TIME.test(bare)) return `raw duration "${bare.match(RAW_TIME)[0]}"`;
  if (RAW_EASING.test(bare)) return `raw easing "${bare.match(RAW_EASING)[0]}"`;
  return null;
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const isExempt = (lines, line) =>
  lines[line - 1]?.includes(EXEMPT_TOKEN) || lines[line - 2]?.includes(EXEMPT_TOKEN);

/** Raw durations/easings in a stylesheet's transition and animation declarations. */
export function findRawCss(text) {
  const lines = text.split('\n');
  const out = [];
  const decl =
    /(?<![-\w])(transition|animation)(?:-duration|-timing-function|-delay)?\s*:\s*([^;{}]+);/g;
  for (const m of text.matchAll(decl)) {
    const line = lineAt(text, m.index);
    if (isExempt(lines, line)) continue;
    const reason = rawReason(m[2]);
    if (reason) out.push({ line, reason, snippet: m[0].replace(/\s+/g, ' ').trim() });
  }
  return out;
}

/** Raw durations/easings in a component: inline styles, Tailwind classes, motion/react props. */
export function findRawTsx(text) {
  const lines = text.split('\n');
  const out = [];
  const push = (line, reason, snippet) => {
    if (!isExempt(lines, line)) out.push({ line, reason, snippet: snippet.trim() });
  };
  // Inline style strings: transition: `opacity ${d}s ease`, animationDuration: '200ms'.
  const styleString =
    /\b(?:transition|animation)(?:Duration|TimingFunction|Delay)?\s*:\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  for (const m of text.matchAll(styleString)) {
    const reason = rawReason(m[2]);
    if (reason) push(lineAt(text, m.index), reason, m[0]);
  }
  lines.forEach((raw, i) => {
    const code = raw.replace(/\/\/.*$/, '');
    if (/^\s*(\*|\/\*)/.test(code)) return;
    const tw = code.match(
      /(?<![-\w[])(?:duration|delay)-\d+(?![-\w])|(?<![-\w[])ease-(?:linear|in-out|in|out)(?![-\w])|(?<![-\w])(?:duration|delay|ease)-\[(?!var\()[^\]]*\]/,
    );
    if (tw) push(i + 1, `raw Tailwind motion utility "${tw[0]}"`, raw);
    const fm = code.match(/\b(?:duration|delay)\s*:\s*\d|\bease\s*:\s*['"[]/);
    if (fm) push(i + 1, `raw motion/react value "${fm[0]}"`, raw);
  });
  return out;
}

// ── Rule 3: any motion on an interactive file ─────────────────────────────────
const INTERACTIVE = [
  /\bonClick\b/,
  /\bonChange\b/,
  /<button/,
  /<input/,
  /<select/,
  /<a\s/,
  /role="button"/,
];
const ANY_MOTION = [
  /from ['"]motion\/react['"]/,
  /\bhds-motion-/,
  /useHdsMotion/,
  /["'\s]transition(?:-(?:all|colors|opacity|transform|shadow|\[[^\]]+\]))?["'\s]/,
  /["'\s]animate-[a-z]/,
  /var\(--(?:hds-motion|primitive-duration)-/,
];

export function lacksAnyMotion(text) {
  if (/\/\/\s*motion-ok:/.test(text)) return false;
  if (!INTERACTIVE.some((p) => p.test(text))) return false;
  return !ANY_MOTION.some((p) => p.test(text));
}

/** Rule 2 + the class-definition check over { [fileName]: source }. */
export function findContractGaps(sources, motionCss) {
  const gaps = [];
  for (const { file, state, evidence } of MOTION_CONTRACT) {
    const text = sources[file];
    if (text === undefined) gaps.push({ file, reason: `listed in MOTION_CONTRACT but missing` });
    else if (!evidence.test(text)) gaps.push({ file, reason: `${state}: no motion (${evidence})` });
  }
  for (const [file, text] of Object.entries(sources)) {
    for (const [cls] of text.matchAll(/(?<![-\w])hds-motion-[a-z-]+[a-z]/g)) {
      if (!new RegExp(`\\.${cls}(?![-\\w])`).test(motionCss)) {
        gaps.push({ file, reason: `${cls} is not defined in src/styles/component-motion.css` });
      }
    }
  }
  return gaps;
}

// ── Scan ──────────────────────────────────────────────────────────────────────
function componentSources() {
  const sources = {};
  for (const entry of readdirSync(COMP_DIR)) {
    if (!entry.endsWith('.tsx') || isSpecFile(entry)) continue;
    sources[entry] = readFileSync(join(COMP_DIR, entry), 'utf8');
  }
  return sources;
}

function styleSources() {
  const sources = {};
  for (const entry of readdirSync(STYLE_DIR)) {
    if (!entry.endsWith('.css') || entry.endsWith('.generated.css')) continue;
    sources[entry] = readFileSync(join(STYLE_DIR, entry), 'utf8');
  }
  return sources;
}

export function runCheck() {
  const failures = [];
  const components = componentSources();
  for (const [file, text] of Object.entries(components)) {
    for (const r of findRawTsx(text))
      failures.push({ file: `src/app/components/${file}:${r.line}`, ...r });
    if (!CONTRACTED.has(file) && lacksAnyMotion(text))
      failures.push({ file: `src/app/components/${file}`, reason: 'interactive, no motion' });
  }
  for (const [file, text] of Object.entries(styleSources())) {
    for (const r of findRawCss(text)) failures.push({ file: `src/styles/${file}:${r.line}`, ...r });
  }
  const css = existsSync(MOTION_CSS) ? readFileSync(MOTION_CSS, 'utf8') : '';
  for (const g of findContractGaps(components, css))
    failures.push({ ...g, file: `src/app/components/${g.file}` });
  return failures;
}

function main() {
  const isFixtureMode =
    process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
  let failures;
  if (isFixtureMode && process.env.FIXTURE_FILE) {
    const path = resolve(process.env.FIXTURE_FILE);
    const text = readFileSync(path, 'utf8');
    failures = findRawTsx(text).map((r) => ({ file: `${basename(path)}:${r.line}`, ...r }));
    if (lacksAnyMotion(text))
      failures.push({ file: basename(path), reason: 'interactive, no motion' });
  } else {
    failures = runCheck();
  }
  if (failures.length === 0) {
    console.log('✓ check-motion: every interactive state change moves, on motion tokens.');
    return 0;
  }
  console.error(`✗ check-motion: ${failures.length} problem(s).\n`);
  for (const f of failures) {
    console.error(`  ${f.file}  ${f.reason}`);
    if (f.snippet) console.error(`      ${f.snippet.slice(0, 160)}`);
  }
  console.error(
    '\n  Fix: time it with var(--hds-motion-*) / var(--primitive-duration-*) or useHdsMotion();' +
      '\n  give a listed state change its motion (MOTION_CONTRACT in scripts/check-motion.mjs);' +
      '\n  or, when a literal is right, say why with a `motion-token-ok: <reason>` comment.',
  );
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
