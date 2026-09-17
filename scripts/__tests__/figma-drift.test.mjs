/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Snapshot ingest and drift detection (`pnpm figma:snapshot`, `pnpm check:figma-drift`).
 *
 * Seams: parseSnapshotFile(text) (scripts/lib/figma-snapshot.mjs) and
 * figmaDrift(model, snapshotFile, options) + formatDrift(report)
 * (scripts/lib/figma-drift.mjs). Figma states come from pushing the fixture
 * model into the in-memory Plugin API and editing it the way a person would.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { figmaDrift, formatDrift } from '../lib/figma-drift.mjs';
import { createFakeFigma } from './helpers/fake-figma.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const model = buildFigmaModel(
  JSON.parse(readFileSync(join(HERE, 'fixtures', 'figma-model', 'tokens.json'), 'utf8')),
);
const FONTS = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Satoshi', style: 'Medium' },
  { family: 'Satoshi', style: 'Bold' },
  { family: 'Geist Mono', style: 'Medium' },
];

const pushedFile = async () => {
  const figma = createFakeFigma({ fonts: FONTS });
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  return figma;
};
/** What `pnpm figma:snapshot --ingest` would commit, parsed back. */
const snapshotOf = async (figma) =>
  parseSnapshotFile(serializeSnapshotFile(await hdsRunSnapshot(figma)));
const live = async (figma, name) =>
  (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === name);
const collection = async (figma, name) =>
  (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === name);

describe('snapshot files', () => {
  it('round-trip through the committed format with a verified checksum', async () => {
    const figma = await pushedFile();
    const taken = await hdsRunSnapshot(figma);
    const text = serializeSnapshotFile(taken);
    expect(text.endsWith('}\n')).toBe(true);
    expect(parseSnapshotFile(text)).toEqual(taken);
  });

  it('reject a snapshot edited by hand, naming the fix', async () => {
    const taken = await hdsRunSnapshot(await pushedFile());
    taken.snapshot.collections[0].variables[0].name = 'edited';
    expect(() => parseSnapshotFile(JSON.stringify(taken))).toThrow(
      /checksum .* edited after it was taken.*pnpm figma:snapshot/,
    );
  });

  it('reject something that is not a snapshot', () => {
    expect(() => parseSnapshotFile('{"hello":1}')).toThrow(/not an HDS Figma snapshot/);
    expect(() => parseSnapshotFile('not json')).toThrow(/not valid JSON/);
  });
});

describe('figmaDrift', () => {
  it('finds nothing when Figma matches the model', async () => {
    const report = figmaDrift(model, await snapshotOf(await pushedFile()));
    expect(report.counts).toEqual({ missing: 0, extra: 0, changed: 0 });
    expect(report.ok).toBe(true);
    expect(formatDrift(report)).toMatch(/✓ No drift/);
  });

  it('reports a hand-edited Dark value per mode, with both values readable', async () => {
    const figma = await pushedFile();
    const semantic = await collection(figma, 'Hirobius/Semantic');
    const dark = semantic.modes.find((m) => m.name === 'Dark').modeId;
    (await live(figma, 'color/surface/page')).setValueForMode(dark, {
      r: 0.2,
      g: 0.4,
      b: 0.6,
      a: 1,
    });

    const report = figmaDrift(model, await snapshotOf(figma));
    expect(report.counts).toEqual({ missing: 0, extra: 0, changed: 1 });
    expect(report.items).toEqual([
      {
        kind: 'changed',
        collection: 'Hirobius/Semantic',
        what: 'variable',
        name: 'color/surface/page',
        path: 'semantic.color.surface.page',
        mode: 'Dark',
        expected: '→ primitive.color.neutral.black',
        actual: '#336699',
      },
    ]);
    expect(formatDrift(report)).toContain(
      'changed  color/surface/page [Dark]: model → primitive.color.neutral.black, Figma #336699',
    );
  });

  it('reports missing and extra variables and modes', async () => {
    const figma = await pushedFile();
    (await live(figma, 'space/component/gap')).remove();
    const semantic = await collection(figma, 'Hirobius/Semantic');
    figma.variables.createVariable('legacy/unused', semantic, 'FLOAT');
    semantic.addMode('High contrast');

    const report = figmaDrift(model, await snapshotOf(figma));
    expect(report.counts).toEqual({ missing: 1, extra: 2, changed: 0 });
    const text = formatDrift(report);
    expect(text).toContain('missing  space/component/gap (semantic.space.component.gap)');
    expect(text).toContain('extra    legacy/unused');
    expect(text).toContain('extra    mode High contrast');
    expect(report.ok).toBe(false);
  });

  it('reports a text style whose size was edited and unbound', async () => {
    const figma = await pushedFile();
    const h1 = (await figma.getLocalTextStylesAsync()).find((s) => s.name === 'typography/h1');
    await figma.loadFontAsync(h1.fontName);
    h1.setBoundVariable('fontSize', null);
    h1.fontSize = 40;

    const report = figmaDrift(model, await snapshotOf(figma));
    expect(report.counts).toEqual({ missing: 0, extra: 0, changed: 1 });
    expect(formatDrift(report)).toContain(
      'changed  text style typography/h1: fontSize, bound:fontSize',
    );
  });

  it('warns when the snapshot is older than the tokens, and when Figma was pushed from another model', async () => {
    const snapshot = await snapshotOf(await pushedFile());
    const changed = JSON.parse(JSON.stringify(model));
    changed.collections[0].variables[0].description = 'Edited after the snapshot.';
    const later = new Date(Date.parse(snapshot.snapshot.takenAt) + 60_000).toISOString();

    const report = figmaDrift(changed, snapshot, { tokensChangedAt: later });
    expect(report.stale).toBe(true);
    expect(report.pushedFromOtherModel).toBe(true);
    const text = formatDrift(report);
    expect(text).toMatch(/⚠ The snapshot .* is older than hirobius\.tokens\.json/);
    expect(text).toContain('changed  color/neutral/900: description');
  });

  it('lists collections HDS does not own as information, not drift', async () => {
    const figma = await pushedFile();
    figma.variables.createVariableCollection('Old tokens');
    const report = figmaDrift(model, await snapshotOf(figma));
    expect(report.ok).toBe(true);
    expect(formatDrift(report)).toContain('Not managed by HDS (ignored): Old tokens');
  });
});
