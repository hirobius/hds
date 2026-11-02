/**
 * record — the upgrade record a copy of @hirobius/design-system ships
 * (upgrade/index.json and upgrade/releases/<version>.json, hds#451), read for
 * the upgrade command (hds#452). Node builtins only.
 *
 * The command reads the record of the package it runs from, never the
 * consumer's installed copy, so `npx @hirobius/design-system@latest upgrade`
 * always brings the newest steps.
 *
 * listOf and the deprecation bookkeeping mirror scripts/upgrade/compile.mjs,
 * which writes UPGRADING.md from the same ledgers; a test holds them equal.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareVersions } from './semver.mjs';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/**
 * @param {string} pkgDir the package root (the directory holding package.json)
 * @param {{ detects?: Map<string, any> }} [opts] detects: readDetects, given to steps with none
 * @returns {{ version: string, index: any, ledgers: any[], kept: Map<string, { in: string, plain: string }> }}
 */
export function loadRecord(pkgDir, { detects = readDetects(pkgDir) } = {}) {
  const { version } = readJson(join(pkgDir, 'package.json'));
  const index = readJson(join(pkgDir, 'upgrade/index.json'));
  const ledgers = index.versions
    .map((v) => join(pkgDir, 'upgrade/releases', `${v.version}.json`))
    .filter((file) => existsSync(file))
    .map(readJson)
    .map((ledger) => ({
      ...ledger,
      steps: ledger.steps.map((step) =>
        !step.detect && detects.has(step.id) ? { ...step, detect: detects.get(step.id) } : step,
      ),
    }))
    .sort((a, b) => compareVersions(a.version, b.version));
  return { version, index, ledgers, kept: readKept(pkgDir) };
}

/**
 * upgrade/detects.json: detectors for released steps whose frozen note had
 * none (hds#934), by step id. Without one such a step reached every consumer,
 * since nothing could tell whether the code uses it. Only the command reads
 * it: compile.mjs reads a step's detect for deprecations alone, and none is one.
 * @param {string} root the package root
 * @returns {Map<string, any>}
 */
export function readDetects(root) {
  const file = join(root, 'upgrade/detects.json');
  return new Map(existsSync(file) ? Object.entries(readJson(file).detects ?? {}) : []);
}

/**
 * upgrade/kept.json: the deprecations whose removal was cancelled, by step id,
 * each with the release that would have removed it. The one record both the
 * upgrade command and scripts/upgrade/compile.mjs read.
 * @param {string} root the package root
 * @returns {Map<string, { in: string, plain: string }>}
 */
export function readKept(root) {
  const file = join(root, 'upgrade/kept.json');
  return new Map(existsSync(file) ? Object.entries(readJson(file).kept ?? {}) : []);
}

/** Step kinds that take something public away. */
const REMOVING = new Set([
  'removed',
  'moved',
  'renamed',
  'folded',
  'prop-renamed',
  'prop-value-mapped',
]);

/**
 * The list a step belongs to, as UPGRADING.md prints it
 * (scripts/upgrade/compile.mjs listOf).
 * @returns {'fixedForYou' | 'looksDifferent' | 'comingNext' | 'doByHand'}
 */
export function listOf(step) {
  if (step.kind === 'deprecated') return 'comingNext';
  if (step.auto) return 'fixedForYou';
  if (step.impact === 'look' && !REMOVING.has(step.kind) && step.kind !== 'manual') {
    return 'looksDifferent';
  }
  return 'doByHand';
}

const subject = (step) => step.id.split('/').slice(2).join('/');

const namedUses = (step) => [
  ...(step.detect?.imports ?? []).flatMap((i) => i.names.map((name) => `import:${i.from}:${name}`)),
  ...(step.detect?.cssVars ?? []).map((name) => `cssVar:${name}`),
  ...(step.detect?.classes ?? []).map((name) => `class:${name}`),
];

/**
 * The deprecation steps still deprecated at `target`: announced at or before
 * it, not removed by it (removeIn after it), and with some use no later
 * release up to `target` took away.
 * @param {{ version: string, steps: any[] }[]} ledgers oldest first
 * @param {string} target
 * @param {Map<string, { in: string, plain: string }>} [kept] readKept: those steps are not deprecated any more
 */
export function comingNextSteps(ledgers, target, kept = new Map()) {
  const upTo = ledgers.filter((l) => compareVersions(l.version, target) <= 0);
  const out = [];
  for (const ledger of upTo) {
    const later = upTo.filter((l) => compareVersions(l.version, ledger.version) > 0);
    for (const step of ledger.steps) {
      if (step.kind !== 'deprecated' || kept.has(step.id)) continue;
      if (step.removeIn && compareVersions(step.removeIn, target) <= 0) continue;
      const named = namedUses(step);
      const uses = named.length > 0 ? named : [`subject:${subject(step)}`];
      const taken = new Set();
      for (const taker of later.flatMap((l) => l.steps).filter((s) => REMOVING.has(s.kind))) {
        const own = namedUses(taker);
        for (const use of uses) {
          if (own.length === 0 && subject(taker) === subject(step)) taken.add(use);
          else if (own.includes(use) || use === `subject:${subject(taker)}`) taken.add(use);
        }
      }
      if (taken.size === uses.length) continue;
      if (taken.size === 0 || !step.detect) {
        out.push(step);
        continue;
      }
      // Look only for the uses still deprecated: a name a later release took
      // away is a Do by hand step of that release, not Coming next.
      const { imports, cssVars, classes, ...rest } = step.detect;
      const detect = {
        ...rest,
        imports: imports
          ?.map((i) => ({
            ...i,
            names: i.names.filter((n) => !taken.has(`import:${i.from}:${n}`)),
          }))
          .filter((i) => i.names.length > 0),
        cssVars: cssVars?.filter((v) => !taken.has(`cssVar:${v}`)),
        classes: classes?.filter((c) => !taken.has(`class:${c}`)),
      };
      for (const key of ['imports', 'cssVars', 'classes']) {
        if (!detect[key]?.length) delete detect[key];
      }
      out.push({ ...step, detect });
    }
  }
  return out;
}
