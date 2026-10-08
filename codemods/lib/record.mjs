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
 * @returns {{ version: string, index: any, ledgers: any[] }}
 */
export function loadRecord(pkgDir) {
  const { version } = readJson(join(pkgDir, 'package.json'));
  const index = readJson(join(pkgDir, 'upgrade/index.json'));
  const ledgers = index.versions
    .map((v) => join(pkgDir, 'upgrade/releases', `${v.version}.json`))
    .filter((file) => existsSync(file))
    .map(readJson)
    .sort((a, b) => compareVersions(a.version, b.version));
  return { version, index, ledgers };
}

/** Step kinds that take something public away. */
const REMOVING = new Set(['removed', 'moved', 'renamed', 'folded']);

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
 */
export function comingNextSteps(ledgers, target) {
  const upTo = ledgers.filter((l) => compareVersions(l.version, target) <= 0);
  const out = [];
  for (const ledger of upTo) {
    const later = upTo.filter((l) => compareVersions(l.version, ledger.version) > 0);
    for (const step of ledger.steps) {
      if (step.kind !== 'deprecated') continue;
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
