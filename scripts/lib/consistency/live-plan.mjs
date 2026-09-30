/** @internal — pure helpers for the live half of scripts/eval-consistency.mjs (hds#344). */
/**
 * Everything the live stages need to decide, with no network, browser or build:
 * the screenshot matrix, which peers to install next to the tarball, how a
 * failed install is explained, how an axe result becomes a scan row, the pixel
 * diff of the recorded PNGs, and the ledger entry a run produces. The stages
 * that do the work (pack, build, render, axe-run) call in here and are not
 * imported by `pnpm test`.
 */
import { evaluate } from './evaluate.mjs';
import { diffPng } from './pixeldiff.mjs';

/** Every app is captured in each of these. Height only sets the viewport; PNGs are full page. */
export const VIEWPORTS = [
  { key: '1280-light', width: 1280, height: 800, theme: 'light' },
  { key: '1280-dark', width: 1280, height: 800, theme: 'dark' },
  { key: '390-light', width: 390, height: 844, theme: 'light' },
];

export const AXE_THEMES = ['light', 'dark'];

export const shotName = (appId, viewport) => `${appId}-${viewport.key}.png`;

/** The UTC calendar date of a run, YYYY-MM-DD. */
export const runDate = (now = new Date()) => now.toISOString().slice(0, 10);

// The template's @types are the React 18 line, and 18.3.1 is what the repo's own
// tests run against, so React is pinned there rather than at the newest match of
// the declared "^18.3.0 || ^19.0.0" range.
const PINNED_PEERS = { react: '^18.3', 'react-dom': '^18.3' };
// Optional peer, but the package's own consumer smoke test installs it.
const ALWAYS_PEERS = ['react-router'];

/** `name@range` specs for every peer a consumer has to supply. */
export function peerSpecs(pkg) {
  const peers = pkg.peerDependencies ?? {};
  const meta = pkg.peerDependenciesMeta ?? {};
  return Object.entries(peers)
    .filter(([name]) => !meta[name]?.optional || ALWAYS_PEERS.includes(name))
    .map(([name, range]) => `${name}@${PINNED_PEERS[name] ?? range}`);
}

const NETWORK =
  /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|E403|E407|E503|proxy|network request/i;

/** Names the fix when an install failed for want of a registry; otherwise shows the tail of the output. */
export function installFailureMessage(stderr) {
  const text = String(stderr ?? '');
  if (NETWORK.test(text)) {
    return (
      'the registry could not be reached, so the tarball and its peers could not be installed. ' +
      'Fix the network or proxy (check HTTPS_PROXY and the npm registry setting), ' +
      'or run with --offline to measure violations and Jaccard from source only.'
    );
  }
  const tail = text.trim().split('\n').slice(-8).join('\n');
  return `npm install failed:\n${tail}`;
}

/** One scan row (the shape evaluateScan reads) from an axe result or an error. */
export function axeScanRow(appId, theme, outcome) {
  if (outcome?.error) {
    const first = String(outcome.error.message ?? outcome.error).split('\n')[0];
    return { storyId: appId, theme, error: first.slice(0, 200), violations: [] };
  }
  return {
    storyId: appId,
    theme,
    error: null,
    violations: outcome.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      sample: v.nodes.slice(0, 2).map((n) => String(n.html).slice(0, 160)),
    })),
  };
}

/** Diff every pair of PNGs (app id -> Buffer) at one viewport. Pairs are in sorted id order. */
export function pairwiseDiffs(pngs) {
  const ids = Object.keys(pngs).sort();
  const pairs = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const d = diffPng(pngs[ids[i]], pngs[ids[j]]);
      pairs.push({ a: ids[i], b: ids[j], pct: d.diffPct, inkedPct: d.inkedDiffPct });
    }
  }
  return { pairs };
}

const round4 = (n) => Math.round(n * 10000) / 10000;

/**
 * The ledger entry for a run. Figures are rounded to four places BEFORE they are
 * judged, so the number recorded is the number the pass flag was decided on and
 * the ledger's own consistency check cannot disagree with it. `entry` is null
 * when a threshold could not be measured (an app did not build, so there is
 * nothing to render); the report still says which.
 */
export function buildEntry({
  date,
  packageVersion,
  tarballSha256,
  commit,
  apps,
  results,
  thresholds,
  notes,
}) {
  const rounded = {
    ...results,
    jaccard: {
      pairs: (results.jaccard?.pairs ?? []).map((p) => ({ ...p, value: round4(p.value) })),
    },
    lightDiff: {
      pairs: (results.lightDiff?.pairs ?? []).map((p) => ({ ...p, pct: round4(p.pct) })),
    },
  };
  const report = evaluate(rounded, thresholds);
  if (!report.complete) return { entry: null, report };
  const dark = (results.darkDiff?.pairs ?? []).map((p) => round4(p.pct));
  const entry = {
    date,
    source: 'harness',
    packageVersion,
    tarballSha256,
    commit,
    apps,
    measured: report.measured,
    detail: {
      jaccard: rounded.jaccard.pairs.map((p) => p.value),
      lightDiff: rounded.lightDiff.pairs.map((p) => p.pct),
      ...(dark.length ? { darkDiff: dark } : {}),
    },
    thresholds,
    pass: report.pass,
    ...(notes ? { notes } : {}),
  };
  return { entry, report };
}
