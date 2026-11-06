/**
 * One release's upgrade steps for /upgrade/<version> (hds#445): the page a
 * release notice links to. Sorts the ledger into the lists UPGRADING.md
 * prints. The rule mirrors listOf in scripts/upgrade/compile.mjs;
 * tests/docs-site/upgrade-release.test.tsx fails if the two disagree on any
 * step in the ledger.
 */
import type { LedgerRelease, LedgerStep } from './upgrade-ledger';

export type ReleaseListKey =
  'fixedForYou' | 'looksDifferent' | 'comingNext' | 'doByHand' | 'goodToKnow';

/** The lists, in the order UPGRADING.md prints them; Good to know is informational. */
export const RELEASE_LISTS: { key: ReleaseListKey; title: string }[] = [
  { key: 'fixedForYou', title: 'Fixed for you' },
  { key: 'looksDifferent', title: 'Looks different' },
  { key: 'comingNext', title: 'Coming next' },
  { key: 'doByHand', title: 'Do by hand' },
  { key: 'goodToKnow', title: 'Good to know' },
];

/** Least to most severe, as upgrade/schema.json orders impact. */
const IMPACTS = ['none', 'additive', 'look', 'behavior', 'breaking'];
const REMOVING = new Set([
  'removed',
  'moved',
  'renamed',
  'folded',
  'prop-renamed',
  'prop-value-mapped',
]);

function listOf(step: LedgerStep): ReleaseListKey {
  if (step.kind === 'deprecated') return 'comingNext';
  if (step.auto) return 'fixedForYou';
  if (step.kind === 'peer' && step.impact === 'additive') return 'goodToKnow';
  if (step.impact === 'look' && !REMOVING.has(step.kind) && step.kind !== 'manual') {
    return 'looksDifferent';
  }
  return 'doByHand';
}

/** Every step in exactly one list; Do by hand most severe first, ledger order within an impact. */
export function releaseLists(release: LedgerRelease): Record<ReleaseListKey, LedgerStep[]> {
  const lists: Record<ReleaseListKey, LedgerStep[]> = {
    fixedForYou: [],
    looksDifferent: [],
    comingNext: [],
    doByHand: [],
    goodToKnow: [],
  };
  for (const step of release.steps) lists[listOf(step)].push(step);
  const severity = (s: LedgerStep) => IMPACTS.indexOf(s.impact);
  lists.doByHand = lists.doByHand
    .map((s, i) => [s, i] as const)
    .sort(([a, i], [b, j]) => severity(b) - severity(a) || i - j)
    .map(([s]) => s);
  return lists;
}

const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** The release just below `version`, or null when it is the oldest. */
export function previousVersion(versions: string[], version: string): string | null {
  const below = versions.filter((v) => cmp(v, version) < 0).sort(cmp);
  return below.at(-1) ?? null;
}

/** The name a step is about: the id after `<version>/<kind>/`. */
export const stepSubject = (step: LedgerStep): string => step.id.split('/').slice(2).join('/');

/**
 * The subject to print before a step's plain line, or null when the line
 * already names it. Some ledger lines say "This variable ..." and lean on the
 * subject being shown beside them.
 */
export function subjectLead(step: LedgerStep): string | null {
  const subject = stepSubject(step);
  return subject && !step.plain.includes(subject) ? subject : null;
}
