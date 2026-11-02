/**
 * The combined upgrade steps for one version range (hds#464), behind the
 * /upgrade/?from=X&to=Y page. Pure: folds every release ledger in (from, to]
 * into codemods to run (each command once), removals, manual edits and look
 * changes. Steps with no consumer impact (none, additive) are left out.
 */
import type { LedgerRelease, LedgerStep } from './upgrade-ledger';

export interface RangeCodemod {
  command: string;
  /** Step ids the command applies, oldest first. */
  steps: string[];
}

export interface UpgradeRange {
  error?: string;
  releases: LedgerRelease[];
  codemods: RangeCodemod[];
  removals: LedgerStep[];
  manual: LedgerStep[];
  looks: LedgerStep[];
}

const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
const GONE = new Set(['removed', 'moved', 'renamed', 'folded']);
const SILENT = new Set(['none', 'additive']);

/**
 * The steps a CSS-only consumer still needs (hds#464): people who take the
 * stylesheets and variables without the JavaScript package. A `value-changed`
 * step's subject is a CSS variable (218 of 220 in the ledger; the other two
 * are the token files those variables are generated from), and a `look` step
 * is a visual change those styles produce. Every other kind names a JS
 * export, prop, behaviour or dependency, so it is a JS-only step.
 */
export const isCssStep = (s: LedgerStep): boolean =>
  s.kind === 'look' || s.kind === 'value-changed';

/**
 * The build line for the page header: `<last release>+main <sha>`, because the
 * hosted docs build from main, not from a release (hds#464). The sha is
 * shortened to 7 characters, git's short form; with no sha known (a build
 * outside a git checkout or host), the label ends at `+main`.
 */
export const formatBuildLabel = (latest: string, sha?: string | null): string =>
  sha ? `${latest}+main ${sha.slice(0, 7)}` : `${latest}+main`;

const empty = (error?: string): UpgradeRange => ({
  error,
  releases: [],
  codemods: [],
  removals: [],
  manual: [],
  looks: [],
});

export function upgradeRange(
  all: LedgerRelease[],
  from: string | null | undefined,
  to: string | null | undefined,
  opts?: { cssOnly?: boolean },
): UpgradeRange {
  if (!from || !to) return empty('Add ?from=<your version>&to=<target version> to the address.');
  if (!all.some((r) => r.version === to)) return empty(`No release ledger for ${to}.`);
  if (cmp(from, to) >= 0) return empty(`${to} is not newer than ${from}.`);

  const releases = all
    .filter((r) => cmp(r.version, from) > 0 && cmp(r.version, to) <= 0)
    .sort((a, b) => cmp(a.version, b.version));
  const out = empty();
  out.error = undefined;
  out.releases = releases;
  const codemods = new Map<string, RangeCodemod>();
  const steps = releases.flatMap((r) => r.steps);
  for (const s of opts?.cssOnly ? steps.filter(isCssStep) : steps) {
    if (s.auto) {
      const command = [s.auto.codemod, ...s.auto.args].join(' ');
      const c = codemods.get(command) ?? { command, steps: [] };
      c.steps.push(s.id);
      codemods.set(command, c);
    } else if (GONE.has(s.kind)) out.removals.push(s);
    else if (s.impact === 'look') out.looks.push(s);
    else if (!SILENT.has(s.impact)) out.manual.push(s);
  }
  out.codemods = [...codemods.values()];
  return out;
}
