/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — drift between the Figma model and a Figma snapshot.
 *
 * The drift is the push plan read backwards: hdsPlan() (scripts/lib/figma-runtime.mjs)
 * with prune on lists what a push would create (missing in Figma), delete
 * (extra in Figma) and update (changed in Figma). One diff serves both, so
 * `pnpm check:figma-drift` can never disagree with what `pnpm figma:push` does.
 *
 * On a Professional or Organization plan the snapshot is Figma as of the last
 * `pnpm figma:snapshot`, not live. Whether drift can be a push still to come is
 * decided by content, not dates: the snapshot records the model hash of the
 * last push into the file (`lastPush`), and the report compares it with the
 * model the tokens build now (`pushedFromOtherModel`).
 */

import { hdsHex, hdsPlan } from './figma-runtime.mjs';
import { modelHash } from './figma-scripts.mjs';

/** A mode entry as a person reads it: `→ path`, `#rrggbb`, a number or a quoted string. */
function formatEntry(entry) {
  if (!entry) return '(no value)';
  if (entry.alias !== undefined) return `→ ${entry.to ?? entry.alias}`;
  const { value } = entry;
  if (value && typeof value === 'object' && 'r' in value) {
    const color = hdsHex(value);
    return value.a < 1 ? `${color} @ ${Math.round(value.a * 100)}%` : color;
  }
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

/**
 * @param {object} model          The Figma model (scripts/lib/figma-model.mjs).
 * @param {{snapshot: object}} snapshotFile  parseSnapshotFile() output.
 * @param {{renames?: object}} [options]
 */

/** Figma collection name → the token tier it holds. */
const TIER_OF_COLLECTION = Object.freeze({
  'Hirobius/Primitives': 'primitive',
  'Hirobius/Semantic': 'semantic',
  'Hirobius/Component': 'component',
  'Hirobius/Role': 'role',
  'Hirobius/Brand': 'brand',
  'Hirobius/Density': 'density',
});

/**
 * Re-classify `extra` variables the model deliberately refuses to manage.
 *
 * figma-model.mjs carries NOT_IN_FIGMA: four reasoned exclusions for tokens
 * Figma cannot represent — motion (no variable binds a prototype transition),
 * zIndex (stacking is the layers panel), breakpoints (no media queries), and
 * em/unitless typography (Figma takes px only) — and records which tokens each
 * one matched into `model.notInFigma`.
 *
 * This report did not read it, so a Figma variable mirroring one of those
 * tokens came back as `extra`, indistinguishable from junk, under a summary
 * line offering `--prune` to delete extras. After the first successful push,
 * 30 of 35 reported extras were exactly these: variables whose values the
 * TOKEN FILE owns. Pruning would have deleted them and broken every layer
 * bound to them.
 *
 * Three states, not one:
 *   extra     in Figma, unknown to code — genuine drift
 *   excluded  in code, and the model will not manage it, by design
 *   moved     in Figma twice, because the Plugin API cannot move collections
 */
export function classifyExtras(items, model) {
  const entries = model?.notInFigma ?? [];
  if (entries.length === 0) return items;

  const reasonByToken = new Map();
  for (const entry of entries) {
    for (const token of entry.tokens ?? []) {
      reasonByToken.set(token, { excludedBy: entry.id, reason: entry.reason });
    }
  }

  return items.map((item) => {
    if (item.kind !== 'extra' || item.what !== 'variable') return item;
    if (item.movedTo) return { ...item, kind: 'moved' };

    const tier = TIER_OF_COLLECTION[item.collection];
    if (!tier) return item;
    const path = `${tier}.${item.name.replaceAll('/', '.')}`;
    const hit = reasonByToken.get(path);
    return hit ? { ...item, kind: 'excluded', path, ...hit } : item;
  });
}

export function figmaDrift(model, snapshotFile, { renames = {} } = {}) {
  const { snapshot } = snapshotFile;
  const plan = hdsPlan(model, snapshot, { prune: true, renames });
  const nameOf = Object.fromEntries(model.collections.map((c) => [c.key, c.name]));
  const items = [];

  for (const pc of plan.collections) {
    if (pc.action === 'create') {
      items.push({ kind: 'missing', collection: pc.name, what: 'collection', name: pc.name });
      continue;
    }
    if (pc.changes.length) {
      items.push({
        kind: 'changed',
        collection: pc.name,
        what: 'collection',
        name: pc.previousName,
        fields: pc.changes,
      });
    }
    if (pc.defaultMode) {
      items.push({
        kind: 'changed',
        collection: pc.name,
        what: 'default mode',
        name: pc.defaultMode.expected,
        actual: pc.defaultMode.actual,
      });
    }
    for (const r of pc.modes.rename) {
      items.push({
        kind: 'changed',
        collection: pc.name,
        what: 'mode',
        name: r.to,
        actual: r.from,
      });
    }
    for (const mode of pc.modes.add) {
      items.push({ kind: 'missing', collection: pc.name, what: 'mode', name: mode });
    }
  }
  for (const m of plan.removals.modes) {
    items.push({ kind: 'extra', collection: m.collection, what: 'mode', name: m.mode });
  }

  const missingModes = new Set(
    plan.collections.flatMap((pc) => pc.modes.add.map((mode) => `${pc.key}|${mode}`)),
  );
  for (const pv of plan.variables) {
    const collection = nameOf[pv.collection];
    const base = { collection, what: 'variable', name: pv.set.name, path: pv.path };
    if (pv.action === 'create') {
      items.push({ kind: 'missing', ...base });
      continue;
    }
    if (pv.changes.length) items.push({ kind: 'changed', ...base, fields: pv.changes });
    for (const change of pv.values) {
      // A mode missing from Figma is one item, not one per variable.
      if (missingModes.has(`${pv.collection}|${change.mode}`)) continue;
      items.push({
        kind: 'changed',
        ...base,
        mode: change.mode,
        expected: formatEntry(change.to),
        actual: formatEntry(change.from),
      });
    }
  }
  for (const v of plan.removals.variables) {
    items.push({
      kind: 'extra',
      collection: v.collection,
      what: 'variable',
      name: v.name,
      path: v.path,
    });
  }
  // A move is never pruned, so it is not in removals, but Figma still holds it.
  for (const m of plan.moves) {
    items.push({
      kind: 'extra',
      collection: m.collection,
      what: 'variable',
      name: m.name,
      path: m.path,
      movedTo: m.to,
    });
  }

  for (const [kind, what] of [
    ['textStyles', 'text style'],
    ['effectStyles', 'effect style'],
  ]) {
    for (const ps of plan[kind]) {
      const base = { collection: null, what, name: ps.set.name, path: ps.path };
      if (ps.action === 'create') items.push({ kind: 'missing', ...base });
      if (ps.action === 'update') items.push({ kind: 'changed', ...base, fields: ps.changes });
    }
    for (const s of plan.removals[kind]) {
      items.push({ kind: 'extra', collection: null, what, name: s.name, path: s.path });
    }
  }

  // A token the model deliberately refuses to manage is not drift, and a moved
  // variable has its own remedy. Both were reported as `extra` under a summary
  // line offering --prune, which would have deleted 30 variables the token file
  // owns.
  const classified = classifyExtras(items, model);

  const counts = { missing: 0, extra: 0, changed: 0, excluded: 0, moved: 0 };
  classified.forEach((item) => counts[item.kind]++);
  const hash = modelHash(model);
  // `ok` counts only real drift. Excluded and moved items are reported, never
  // silently dropped, but they do not fail the gate: nothing in the repo can
  // clear them, so failing on them would make the gate permanently red and
  // therefore ignored.
  const drifting = counts.missing + counts.extra + counts.changed;
  return {
    ok: drifting === 0,
    counts,
    items: classified,
    snapshot: { takenAt: snapshot.takenAt, file: snapshot.file, lastPush: snapshot.lastPush },
    modelHash: hash,
    // true: the tokens (or the model builder) changed since the last push, so
    // drift may be a push still to come. null: no push is recorded in the file.
    // false: Figma was pushed from this exact model, so drift was made in Figma.
    pushedFromOtherModel: snapshot.lastPush ? snapshot.lastPush.modelHash !== hash : null,
    unmanagedCollections: plan.unmanagedCollections,
    totals: {
      variables: model.collections.reduce((n, c) => n + c.variables.length, 0),
      textStyles: model.textStyles.length,
      effectStyles: model.effectStyles.length,
    },
  };
}

function formatItem(item) {
  const label = item.kind.padEnd(8);
  const path = item.path && item.path !== item.name ? ` (${item.path})` : '';
  if (item.kind === 'excluded') {
    // Not drift. The token exists in code; the model refuses to manage it.
    return `${label} ${item.name}${path} — ${item.excludedBy}: NOT a stray, the model excludes this token by design. Never prune.`;
  }
  if (item.what === 'default mode') {
    return `${label} default mode: model ${item.name}, Figma ${item.actual} (a push cannot change it: make ${item.name} the first mode in Figma)`;
  }
  if (item.movedTo) {
    return `${label} ${item.name}: moved to ${item.movedTo}; rebind its layers to the new variable, then delete it in Figma`;
  }
  if (item.what === 'mode') {
    return item.actual
      ? `${label} mode ${item.name}: Figma calls it ${item.actual}`
      : `${label} mode ${item.name}`;
  }
  const prefix = item.what === 'variable' ? '' : `${item.what} `;
  if (item.mode) {
    return `${label} ${prefix}${item.name} [${item.mode}]: model ${item.expected}, Figma ${item.actual}`;
  }
  if (item.fields) return `${label} ${prefix}${item.name}: ${item.fields.join(', ')}`;
  return `${label} ${prefix}${item.name}${path}`;
}

/** The terminal report. */
export function formatDrift(report, { snapshotLabel = 'figma/snapshot.json' } = {}) {
  const { snapshot } = report;
  const lines = [
    `Figma drift: hirobius.tokens.json vs ${snapshotLabel} (taken ${snapshot.takenAt} from "${snapshot.file?.name ?? 'unknown file'}")`,
  ];
  const pending = report.ok
    ? ''
    : ' Drift below may be changes not pushed yet: run pnpm figma:push, then take a new snapshot.';
  if (report.pushedFromOtherModel === true) {
    lines.push(
      `ℹ Figma was last pushed from a different model (${snapshot.lastPush.modelHash} at ${snapshot.lastPush.pushedAt}; the tokens now build ${report.modelHash}).${pending}`,
    );
  } else if (report.pushedFromOtherModel === null) {
    lines.push(`ℹ No pnpm figma:push is recorded in this Figma file.${pending}`);
  } else if (!report.ok) {
    lines.push(
      `⚠ Figma was last pushed from this exact model (${report.modelHash} at ${snapshot.lastPush.pushedAt}), so the drift below was made in Figma after that push.`,
    );
  }
  if (report.unmanagedCollections.length) {
    lines.push(`Not managed by HDS (ignored): ${report.unmanagedCollections.join(', ')}`);
  }

  const groups = new Map();
  for (const item of report.items) {
    const heading = item.collection ?? 'Styles';
    if (!groups.has(heading)) groups.set(heading, []);
    groups.get(heading).push(formatItem(item));
  }
  for (const [heading, groupLines] of groups) {
    lines.push('', heading, ...groupLines.map((line) => `  ${line}`));
  }

  lines.push('');
  if (report.ok) {
    const t = report.totals;
    lines.push(
      `✓ No drift: Figma matches the model (${t.variables} variables, ${t.textStyles} text styles, ${t.effectStyles} effect styles).` +
        (report.counts.excluded
          ? `\n  ${report.counts.excluded} Figma variable(s) mirror tokens the model excludes by design — listed above, never prune them.`
          : '') +
        (report.counts.moved
          ? `\n  ${report.counts.moved} variable(s) await a manual rebind-and-delete in Figma (the Plugin API cannot move between collections).`
          : ''),
    );
  } else {
    const c = report.counts;
    lines.push(
      `✗ ${c.missing + c.extra + c.changed} drift item(s): ${c.missing} missing, ${c.extra} extra, ${c.changed} changed.` +
        ` Fix Figma with the plugin's PUSH command, then take a new snapshot.` +
        (c.extra > 0 ? ` --prune deletes the ${c.extra} extra; read them first.` : ''),
    );
  }
  return lines.join('\n');
}
