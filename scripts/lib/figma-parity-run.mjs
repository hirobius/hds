/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/figma-parity-run.mjs — the parity run itself: load the code side, the
 * variables side and the committed read under a root, and compare them. Shared by
 * scripts/check-figma-parity.mjs (the gate) and scripts/build-stats-json.mjs (the
 * score it saves), so neither imports the other.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parity } from './figma-parity.mjs';
import { hdsParityDigest } from './figma-parity-runtime.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const READ_PATH = 'figma/parity/read.json';
export const BASELINE_PATH = 'figma/parity/baseline.json';

export const json = (root, rel) => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
const optional = (root, rel, fallback) =>
  existsSync(path.join(root, rel)) ? json(root, rel) : fallback;
const nodeIdOf = (url) =>
  url
    ?.match(/node-id=(\d+)-(\d+)/)
    ?.slice(1, 3)
    .join(':') ?? null;

/** The code side, from the records the other gates already hold to the source. */
export function loadCode(root) {
  const manifest = json(root, 'public/hds-manifest.json');
  const disposition = json(root, 'figma/disposition.json');
  const classes = new Map(Object.values(disposition.components).map((c) => [c.name, c.class]));
  // figma/code-connect-map.json resolves every library component to its node: the @figma
  // tag, or the override that pairs a part (TabsTrigger, Sheet.Title) with its own node.
  const mapped = new Map(
    (optional(root, 'figma/code-connect-map.json', {}).entries ?? []).map((e) => [
      e.name,
      e.nodeId,
    ]),
  );
  const components = Object.entries(manifest.componentSpecs).map(([name, spec]) => ({
    name,
    class: classes.get(name) ?? 'internal',
    deprecated: Boolean(spec.deprecated),
    filePath: spec.filePath,
    nodeId: mapped.get(name) ?? nodeIdOf(spec.figmaUrl),
    props: spec.props ?? {},
    consumers: spec.consumers ?? [],
  }));
  return {
    components,
    templates: optional(root, 'figma/code-connect.json', {}).templates ?? {},
    overrides: optional(root, 'figma/mapping-overrides.json', {}).overrides ?? [],
    icons: manifest.iconSet?.names,
  };
}

/**
 * The release stamp (Hirobius/Meta) is read from git, and a checkout with no history, or a depth-1
 * one, names fewer of its variables, which moved the score by a check. The parity score must depend
 * on committed inputs alone, so the run reads the stamp without git and with a fixed commit: every
 * stamp variable is counted in every checkout. Its values are not compared here (the findings leave
 * Hirobius/Meta out); check:figma-release owns them.
 */
const HERMETIC_META = { git: () => null, commit: '0000000' };

/** The variables side: the snapshot's digest, and tokens against the snapshot. */
export async function loadVariables(root) {
  const snapshotPath = path.join(root, 'figma/snapshot.json');
  if (!existsSync(snapshotPath)) return null;
  const { parseSnapshotFile } = await import('./figma-snapshot.mjs');
  const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
  const { runDriftCheck } = await import('../check-figma-drift.mjs');
  const { report, output } = runDriftCheck({ root, meta: HERMETIC_META });
  if (!report) throw new Error(`The token drift check did not run: ${output}`);
  const label = (item) =>
    `${item.collection ?? 'Styles'}: ${item.what === 'variable' ? '' : `${item.what} `}${item.name}`;
  // Hirobius/Meta is the release stamp (version, commit). check:figma-release owns it: it
  // changes on every release, so it is not a difference between a token and a variable.
  const of = (kind) =>
    report.items.filter((item) => item.kind === kind && item.collection !== 'Hirobius/Meta');
  return {
    snapshotDigest: hdsParityDigest(snapshotFile.snapshot),
    drift: {
      total: report.totals.variables + report.totals.textStyles + report.totals.effectStyles,
      missing: of('missing').map(label),
      extra: of('extra').map(label),
      changed: of('changed').map((item) => ({
        name: `${label(item)}${item.mode ? ` [${item.mode}]` : ''}`,
        detail: item.mode
          ? `tokens say ${item.expected}, Figma has ${item.actual}`
          : `differs in ${(item.fields ?? [item.what]).join(', ')}`,
      })),
    },
    unmanaged: report.unmanagedCollections,
  };
}

export async function runParityCheck({ root = REPO, today, maxAgeDays } = {}) {
  if (!existsSync(path.join(root, READ_PATH))) {
    return {
      exitCode: 2,
      output: `No Figma read yet (${READ_PATH}). Run pnpm figma:parity --emit-read, pass each script to use_figma unmodified, then pnpm figma:parity --ingest <the saved results>.`,
    };
  }
  const result = parity({
    read: json(root, READ_PATH),
    code: loadCode(root),
    variables: await loadVariables(root),
    baseline: optional(root, BASELINE_PATH, {}),
    today: maxAgeDays === undefined ? undefined : today,
    maxAgeDays,
  });
  return { exitCode: result.fresh.length || result.stale.length ? 1 : 0, result };
}
