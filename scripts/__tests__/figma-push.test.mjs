/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm figma:push` — the in-Figma upsert, run against an in-memory Plugin API
 * (helpers/fake-figma.mjs) instead of a live file.
 *
 * Seams: hdsRunPush(figma, payload, checksum) and hdsReadState(figma) from
 * scripts/lib/figma-runtime.mjs, with payloads built by buildPushPayload().
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { hdsRunPush, hdsReadState } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { createFakeFigma } from './helpers/fake-figma.mjs';
import {
  FIXTURE_FONTS,
  fixtureModel,
  newFixtureFile as newFile,
} from './helpers/figma-fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const model = fixtureModel();

const push = (figma, options = {}, from = model) => {
  const { payload, checksum } = buildPushPayload(from, options);
  return hdsRunPush(figma, payload, checksum);
};
const stateVariable = (state, collection, name) =>
  state.collections.find((c) => c.name === collection)?.variables.find((v) => v.name === name);

describe('figma:push into an empty file', () => {
  it('creates every collection, renames the initial mode, and adds the rest', async () => {
    const figma = newFile();
    await push(figma);
    const state = await hdsReadState(figma);

    expect(state.collections.map((c) => [c.name, c.modes])).toEqual([
      ['Hirobius/Primitives', ['Default']],
      ['Hirobius/Semantic', ['Light', 'Dark']],
      ['Hirobius/Component', ['Default']],
      ['Hirobius/Role', ['Default']],
    ]);
    expect(figma.writes).toContain('collection.renameMode:Hirobius/Semantic:Mode 1->Light');
    expect(figma.writes).not.toContain(expect.stringMatching(/Mode 1$/));
  });
});

describe('figma:push is idempotent', () => {
  it('reports zero changes and writes nothing on a second run', async () => {
    const figma = newFile();
    const first = await push(figma);
    expect(first.summary.totals.created).toBeGreaterThan(0);

    const before = figma.writes.length;
    const second = await push(figma);
    expect(second.line).toBe('updated 0 · created 0 · deleted 0');
    expect(figma.writes.slice(before)).toEqual([]);
  });

  it('creates each model variable once, with its token path as the stable key', async () => {
    const figma = newFile();
    await push(figma);
    await push(figma);
    const state = await hdsReadState(figma);
    const paths = state.collections.flatMap((c) => c.variables.map((v) => v.path));
    const expected = model.collections.flatMap((c) => c.variables.map((v) => v.path));
    expect(paths.sort()).toEqual([...expected].sort());
  });
});

// ── Helpers for edited models and hand-made files ────────────────────────────
const edited = (mutate) => {
  const copy = JSON.parse(JSON.stringify(model));
  mutate(copy);
  return copy;
};
const modelVariable = (m, path) =>
  m.collections.flatMap((c) => c.variables).find((v) => v.path === path);
const liveVariable = async (figma, name) =>
  (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === name);

describe('figma:push updates in place', () => {
  it('changes one Dark value as one update and keeps the variable id', async () => {
    const figma = newFile();
    await push(figma);
    const before = await liveVariable(figma, 'color/surface/page');

    const changed = edited((m) => {
      modelVariable(m, 'semantic.color.surface.page').valuesByMode.Dark = {
        alias: 'primitive.color.neutral.900',
      };
    });
    const report = await push(figma, {}, changed);

    expect(report.line).toBe('updated 1 · created 0 · deleted 0');
    expect(report.changes).toEqual(['update variable semantic.color.surface.page: value (Dark)']);
    const after = await liveVariable(figma, 'color/surface/page');
    expect(after.id).toBe(before.id);
    const state = await hdsReadState(figma);
    expect(
      stateVariable(state, 'Hirobius/Semantic', 'color/surface/page').valuesByMode.Dark,
    ).toEqual({
      alias: (await liveVariable(figma, 'color/neutral/900')).id,
      to: 'Hirobius/Primitives: color/neutral/900',
    });
  });

  it('adopts variables a person or an old import made (no stored key) instead of duplicating them', async () => {
    const figma = newFile();
    const primitives = figma.variables.createVariableCollection('Hirobius/Primitives');
    primitives.renameMode(primitives.defaultModeId, 'Value');
    const byCodeSyntax = figma.variables.createVariable('legacy/blue', primitives, 'COLOR');
    byCodeSyntax.setVariableCodeSyntax('WEB', 'var(--primitive-color-blue-500)');
    const byName = figma.variables.createVariable('space/2', primitives, 'FLOAT');
    byName.setValueForMode(primitives.defaultModeId, 7);

    const report = await push(figma);

    const state = await hdsReadState(figma);
    const collection = state.collections.find((c) => c.name === 'Hirobius/Primitives');
    expect(state.collections.filter((c) => c.name === 'Hirobius/Primitives')).toHaveLength(1);
    expect(collection.modes).toEqual(['Default']);
    expect(stateVariable(state, 'Hirobius/Primitives', 'color/blue/500').id).toBe(byCodeSyntax.id);
    expect(stateVariable(state, 'Hirobius/Primitives', 'space/2')).toMatchObject({
      id: byName.id,
      path: 'primitive.space.2',
      valuesByMode: { Default: { value: 8 } },
    });
    expect(report.changes).toContain('rename mode Hirobius/Primitives: Value -> Default');
  });

  it('still converges when Figma refuses plugin data on variables, matching by codeSyntax', async () => {
    const figma = newFile({ variablePluginData: false });
    await push(figma);
    const before = figma.writes.length;
    const again = await push(figma);
    expect(again.line).toBe('updated 0 · created 0 · deleted 0');
    expect(figma.writes.slice(before)).toEqual([]);
  });

  it('follows a TOKEN_MIGRATION.md rename, keeping the id (and every binding to it)', async () => {
    const figma = newFile();
    await push(figma);
    const before = await liveVariable(figma, 'typography/caption/font-size');

    const renamed = edited((m) => {
      const semantic = m.collections.find((c) => c.key === 'semantic');
      for (const v of semantic.variables) {
        if (!v.path.startsWith('semantic.typography.caption.')) continue;
        v.path = v.path.replace('.caption.', '.eyebrow.');
        v.name = v.name.replace('/caption/', '/eyebrow/');
        v.codeSyntax = { WEB: v.codeSyntax.WEB.replace('-caption-', '-eyebrow-') };
      }
      const style = m.textStyles.find((s) => s.path === 'semantic.typography.caption');
      style.path = 'semantic.typography.eyebrow';
      style.name = 'typography/eyebrow';
      for (const field of Object.keys(style.boundVariables)) {
        style.boundVariables[field] = style.boundVariables[field].replace('.caption.', '.eyebrow.');
      }
    });
    const report = await push(
      figma,
      { renames: { 'semantic.typography.caption': 'semantic.typography.eyebrow' } },
      renamed,
    );

    // Five variables and the text style, all renamed in place.
    expect(report.summary.totals).toEqual({ created: 0, updated: 6, deleted: 0 });
    const after = await liveVariable(figma, 'typography/eyebrow/font-size');
    expect(after.id).toBe(before.id);
  });

  it('renames through temporary names when two variables swap names', async () => {
    const figma = newFile();
    await push(figma);
    const white = await liveVariable(figma, 'color/neutral/white');
    const black = await liveVariable(figma, 'color/neutral/black');

    const swapped = edited((m) => {
      const w = modelVariable(m, 'primitive.color.neutral.white');
      const b = modelVariable(m, 'primitive.color.neutral.black');
      [w.name, b.name] = [b.name, w.name];
    });
    const report = await push(figma, {}, swapped);

    expect(report.summary.totals).toEqual({ created: 0, updated: 2, deleted: 0 });
    expect((await liveVariable(figma, 'color/neutral/black')).id).toBe(white.id);
    expect((await liveVariable(figma, 'color/neutral/white')).id).toBe(black.id);
  });

  it('applies every update before the first create', async () => {
    const figma = newFile();
    await push(figma);
    const next = edited((m) => {
      modelVariable(m, 'primitive.space.2').description = 'Two steps.';
      const primitives = m.collections.find((c) => c.key === 'primitive');
      primitives.variables.push({
        ...modelVariable(m, 'primitive.space.4'),
        path: 'primitive.space.6',
        name: 'space/6',
        codeSyntax: { WEB: 'var(--primitive-space-6)' },
        valuesByMode: { Default: { value: 24 } },
      });
    });
    const start = figma.writes.length;
    await push(figma, {}, next);
    const writes = figma.writes.slice(start);
    expect(writes).toContain('variable.description:space/2');
    expect(writes.indexOf('variable.description:space/2')).toBeLessThan(
      writes.indexOf('createVariable:space/6'),
    );
  });
});

describe('figma:push never deletes without prune', () => {
  const withExtras = async () => {
    const figma = newFile();
    await push(figma);
    const semantic = (await figma.variables.getLocalVariableCollectionsAsync()).find(
      (c) => c.name === 'Hirobius/Semantic',
    );
    figma.variables.createVariable('legacy/unused', semantic, 'FLOAT');
    semantic.addMode('High contrast');
    return figma;
  };

  it('reports extra variables and modes but keeps them', async () => {
    const figma = await withExtras();
    const report = await push(figma);
    expect(report.line).toBe('updated 0 · created 0 · deleted 0');
    expect(report.extras.variables.map((v) => v.name)).toEqual(['legacy/unused']);
    expect(report.extras.modes).toEqual([
      { collection: 'Hirobius/Semantic', mode: 'High contrast' },
    ]);
    expect(await liveVariable(figma, 'legacy/unused')).toBeTruthy();
  });

  it('deletes them only when the payload was built with prune', async () => {
    const figma = await withExtras();
    const report = await push(figma, { prune: true });
    // The collection update is the mode removal; the deletions are the variable and the mode.
    expect(report.summary.totals).toEqual({ created: 0, updated: 1, deleted: 2 });
    expect(await liveVariable(figma, 'legacy/unused')).toBeUndefined();
    const state = await hdsReadState(figma);
    expect(state.collections.find((c) => c.name === 'Hirobius/Semantic').modes).toEqual([
      'Light',
      'Dark',
    ]);
  });

  it('refuses, writing nothing, when an unowned variable holds a name the model needs', async () => {
    const figma = newFile();
    await push(figma, { scope: ['primitive'] });
    const semantic = figma.variables.createVariableCollection('Hirobius/Semantic');
    figma.variables.createVariable('color/surface/page', semantic, 'FLOAT');
    const start = figma.writes.length;

    await expect(push(figma)).rejects.toThrow(
      /Nothing was written\. Hirobius\/Semantic: "color\/surface\/page" .* is taken by a variable the model does not own/,
    );
    expect(figma.writes.slice(start)).toEqual([]);
  });
});

describe('figma:push with a token the model moved to another collection', () => {
  // Before #213, component.button.text lived in Hirobius/Component. The Plugin
  // API cannot move a variable between collections, so its bindings stay on
  // the old variable until someone rebinds them.
  const beforeTheMove = edited((m) => {
    const semantic = m.collections.find((c) => c.key === 'semantic');
    const component = m.collections.find((c) => c.key === 'component');
    const text = semantic.variables.find((v) => v.path === 'component.button.text');
    semantic.variables = semantic.variables.filter((v) => v !== text);
    component.variables.push({ ...text, valuesByMode: { Default: text.valuesByMode.Light } });
  });
  const pushedBeforeTheMove = async () => {
    const figma = newFile();
    await push(figma, {}, beforeTheMove);
    return { figma, old: await liveVariable(figma, 'button/text') };
  };
  const variablesNamed = async (figma, name) =>
    (await figma.variables.getLocalVariablesAsync()).filter((v) => v.name === name);
  const moved = {
    collection: 'Hirobius/Component',
    name: 'button/text',
    path: 'component.button.text',
    to: 'Hirobius/Semantic',
  };

  it('creates it in its new collection, keeps the old variable, and warns to rebind', async () => {
    const { figma, old } = await pushedBeforeTheMove();
    const report = await push(figma);

    expect(report.changes).toContain('create variable component.button.text');
    expect(report.moves).toEqual([{ ...moved, id: old.id }]);
    expect(report.warnings).toEqual([
      expect.stringMatching(
        /Hirobius\/Component: button\/text \(component\.button\.text\) moved to Hirobius\/Semantic\..*cannot move a variable between collections.*Rebind .* then delete the old one in Figma/,
      ),
    ]);
    expect((await variablesNamed(figma, 'button/text')).map((v) => v.id)).toContain(old.id);
    expect(await variablesNamed(figma, 'button/text')).toHaveLength(2);
  });

  it('is never deleted by a prune push, full or chunked, while other extras are', async () => {
    for (const scope of [null, ['component']]) {
      const { figma, old } = await pushedBeforeTheMove();
      const component = (await figma.variables.getLocalVariableCollectionsAsync()).find(
        (c) => c.name === 'Hirobius/Component',
      );
      figma.variables.createVariable('legacy/unused', component, 'FLOAT');
      if (scope) await push(figma, { scope: ['semantic'] });

      const report = await push(figma, { prune: true, scope });
      expect(report.changes).toContain('delete variable Hirobius/Component: legacy/unused');
      expect(report.changes).not.toContain('delete variable Hirobius/Component: button/text');
      expect(report.moves).toEqual([{ ...moved, id: old.id }]);
      expect((await variablesNamed(figma, 'button/text')).map((v) => v.id)).toContain(old.id);
      expect(await liveVariable(figma, 'legacy/unused')).toBeUndefined();
    }
  });
});

describe('figma:push with a collection whose default mode is not the model first mode', () => {
  it('warns, since the Plugin API cannot change a default mode, and still pushes', async () => {
    const figma = newFile();
    const semantic = figma.variables.createVariableCollection('Hirobius/Semantic');
    semantic.renameMode(semantic.defaultModeId, 'Dark');
    semantic.addMode('Light');

    const report = await push(figma);
    expect(report.warnings).toEqual([
      expect.stringMatching(
        /Hirobius\/Semantic defaults to Dark, but the model's first mode is Light\..*cannot change a collection's default mode/,
      ),
    ]);
    expect((await push(figma)).line).toBe('updated 0 · created 0 · deleted 0');
  });
});

describe('figma:push in chunks (use_figma scripts)', () => {
  // Ids differ between two files; compare by name (aliases already carry `to`).
  const comparable = (state) => {
    const nameOf = new Map(
      state.collections.flatMap((c) => c.variables.map((v) => [v.id, `${c.name}: ${v.name}`])),
    );
    return JSON.parse(
      JSON.stringify(state, (key, value) => {
        if (['takenAt', 'lastPush', 'id', 'alias'].includes(key)) return undefined;
        if (key === 'boundVariables') {
          return Object.fromEntries(Object.entries(value).map(([f, id]) => [f, nameOf.get(id)]));
        }
        return value;
      }),
    );
  };

  it('pushing the chunks in order gives the same file as one full push', async () => {
    const full = newFile();
    await push(full);
    const chunked = newFile();
    for (const scope of [['primitive'], ['semantic'], ['component'], ['role'], ['styles']]) {
      await push(chunked, { scope });
    }
    expect(comparable(await hdsReadState(chunked))).toEqual(comparable(await hdsReadState(full)));
  });

  it('refuses a chunk whose aliases point at a collection not pushed yet', async () => {
    const figma = newFile();
    await expect(push(figma, { scope: ['component'] })).rejects.toThrow(
      /component\.button\.bg \(Default\) needs semantic\.color\.surface\.accent, which is not in Figma and not part of this push/,
    );
    expect(figma.writes).toEqual([]);
  });
});

describe('figma:push safety checks', () => {
  it('writes nothing when the payload no longer matches its checksum', async () => {
    const figma = newFile();
    const { payload, checksum } = buildPushPayload(model);
    payload.model.collections[0].variables[0].valuesByMode.Default.value.r = 0.5;
    await expect(hdsRunPush(figma, payload, checksum)).rejects.toThrow(
      /does not match its checksum/,
    );
    expect(figma.writes).toEqual([]);
  });

  it('says a failed push may be partly applied, and a re-run finishes it', async () => {
    const figma = newFile({ modeLimit: 1 });
    await expect(push(figma)).rejects.toThrow(
      /Could not add mode "Dark" to Hirobius\/Semantic.*may already be applied.*run the push again/,
    );
    expect(figma.writes.length).toBeGreaterThan(0);

    figma.setModeLimit(10);
    const retry = await push(figma);
    expect(retry.summary.variables.created).toBeGreaterThan(0);
    expect((await push(figma)).line).toBe('updated 0 · created 0 · deleted 0');
  });

  it('writes nothing when a text style font is not installed', async () => {
    const figma = createFakeFigma({
      fonts: FIXTURE_FONTS.filter((f) => f.family !== 'Geist Mono'),
    });
    await expect(push(figma)).rejects.toThrow(/needs the font "Geist Mono Medium"/);
    expect(figma.writes).toEqual([]);
  });

  it('a dry run returns the plan and writes nothing', async () => {
    const figma = newFile();
    const report = await push(figma, { dryRun: true });
    expect(report.mode).toBe('dry-run');
    expect(report.summary.variables.created).toBe(
      model.collections.reduce((n, c) => n + c.variables.length, 0),
    );
    expect(figma.writes).toEqual([]);
  });
});

describe('figma:push restores hand edits to styles', () => {
  it('rebinds a text style and restores an effect style edited in Figma', async () => {
    const figma = newFile();
    await push(figma);
    const h1 = (await figma.getLocalTextStylesAsync()).find((s) => s.name === 'typography/h1');
    await figma.loadFontAsync(h1.fontName);
    h1.setBoundVariable('fontSize', null);
    h1.fontSize = 40;
    const subtle = (await figma.getLocalEffectStylesAsync()).find(
      (s) => s.name === 'shadow/subtle',
    );
    subtle.effects = [];

    const report = await push(figma);
    expect(report.changes).toEqual([
      'update text style typography/h1: fontSize, bound:fontSize',
      'update effect style shadow/subtle: effects',
    ]);
    const state = await hdsReadState(figma);
    const restored = state.textStyles.find((s) => s.name === 'typography/h1');
    expect(restored.fontSize).toBe(48);
    expect(restored.boundVariables.fontSize).toBe(
      (await liveVariable(figma, 'typography/h1/font-size')).id,
    );
  });
});

describe('figma:push with the real hirobius.tokens.json', () => {
  it('pushes every variable and style, converges, and reads back with no drift', async () => {
    const real = buildFigmaModel(
      JSON.parse(readFileSync(join(HERE, '..', '..', 'hirobius.tokens.json'), 'utf8')),
    );
    const fonts = [...new Set(real.textStyles.map((s) => `${s.fontFamily}|${s.fontStyle}`))].map(
      (key) => ({ family: key.split('|')[0], style: key.split('|')[1] }),
    );
    const figma = createFakeFigma({ fonts: [{ family: 'Inter', style: 'Regular' }, ...fonts] });

    const report = await push(figma, {}, real);
    const variableCount = real.collections.reduce((n, c) => n + c.variables.length, 0);
    expect(report.summary.variables.created).toBe(variableCount);
    expect(report.summary.textStyles.created).toBe(real.textStyles.length);
    expect(report.summary.effectStyles.created).toBe(real.effectStyles.length);

    const again = await push(figma, {}, real);
    expect(again.line).toBe('updated 0 · created 0 · deleted 0');
  });
});
