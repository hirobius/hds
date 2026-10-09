/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Multi-part agent sync (ADR-033 amendment): a plan too big for one delta.js
 * is cut into ordered parts, delta-1-of-N.js to delta-N-of-N.js, each run in
 * its own use_figma call. See scripts/lib/figma-agent-sync.mjs.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { parse } from 'acorn';
import {
  hdsChecksum,
  hdsPlan,
  hdsRunPush,
  hdsRunSnapshot,
  hdsSummarize,
  hdsSummaryLine,
} from '../lib/figma-runtime.mjs';
import { buildPushPayload, buildUseFigmaReceiptScript } from '../lib/figma-scripts.mjs';
import { DELTA_PRUNE_REFUSAL, buildUseFigmaDeltaScript } from '../lib/figma-agent-sync.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { FIXTURE_TOKENS_PATH, fixtureModel } from './helpers/figma-fixture.mjs';
import { ingestReceipt } from '../figma-snapshot.mjs';
import { formatDeltaRun, runDeltaCommand, writeDeltaScript } from '../figma-push.mjs';
import { createFakeFigma, textStyleFonts } from './helpers/fake-figma.mjs';

// Real-model scenarios build and run dozens of scripts; a loaded CI runner needs the room.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const LINKS = Object.freeze({
  storybookUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: 'RETIREDKEY000000000000', fileName: 'HDS Tokens & Components (old)' }],
  stagingFileKey: 'STAGINGKEY000000000000',
  stagingFileName: 'HDS Staging',
});
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const copy = (value) => JSON.parse(JSON.stringify(value));
const variableOf = (model, path) =>
  model.collections.flatMap((c) => c.variables).find((v) => v.path === path);

let dirs = [];
afterEach(() => {
  vi.useRealTimers();
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-agent-parts-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(LINKS, null, 2));
  return root;
};
const pushedLibrary = async (model) => {
  const figma = createFakeFigma({
    fileName: LINKS.libraryFileName,
    fonts: textStyleFonts(model.textStyles),
  });
  figma.fileKey = LINKS.libraryFileKey;
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  return figma;
};
/** The library after `base` was pushed, its snapshot committed, and main moved to `edit(base)`. */
async function pending({ base = fixtureModel(), edit, ...options }) {
  const root = tempRoot();
  const figma = await pushedLibrary(base);
  const path = join(root, 'figma', 'snapshot.json');
  writeFileSync(path, serializeSnapshotFile(await hdsRunSnapshot(figma)));
  const snapshotFile = parseSnapshotFile(readFileSync(path, 'utf8'));
  const next = edit(copy(base));
  const built = buildUseFigmaDeltaScript(next, {
    snapshotFile,
    links: LINKS,
    commit: COMMIT,
    ...options,
  });
  figma.useFigma();
  return { root, figma, next, built, snapshotFile };
}

describe('a plan that fits one delta.js is unchanged by the multi-part builder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T00:00:00.000Z'));
  });

  it('builds the same delta.js, byte for byte (golden; re-captured for hds#565 when the runtime guard became whitespace-insensitive)', async () => {
    const s = await pending({
      edit: (model) => {
        variableOf(model, 'primitive.space.2').description = 'Two steps: tight gap and more.';
        variableOf(model, 'semantic.color.surface.accent').description = 'Accent surface, new.';
        return model;
      },
    });
    const sha = createHash('sha256').update(s.built.text).digest('hex');
    expect({ chars: s.built.chars, sha }).toEqual({
      chars: 41162,
      sha: '0a620dd66a0a556d72037e161f524c2a3c3d83b1c58201101a721ecf4af94fad',
    });
  });
});

// ── Harness ──────────────────────────────────────────────────────────────────
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const real = loadFigmaInputs(REPO).model;
const NOTHING_LINE = 'updated 0 · created 0 · deleted 0';

/** Runs a script the way use_figma does: async, top-level await and return, `figma` in scope. */
async function run(text, figma) {
  const result = await vm.runInNewContext(`(async () => {\n${text}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
}
const rootData = (figma, key) => figma.root.getSharedPluginData('hirobius', key);
/** receipt.js read of page `page`, as an agent runs it when a part returns only its head. */
const readPage = async (figma, page) =>
  run(
    buildUseFigmaReceiptScript(LINKS).replace(/^const PAGE = 0;$/m, `const PAGE = ${page};`),
    figma,
  );

/**
 * What an agent does: run each part in order, and save what it returns (the
 * receipt.js pages too, when a part returns only the head). Returns the saved
 * results in order.
 */
async function runParts(parts, figma) {
  const saved = [];
  for (const part of parts) {
    const result = await run(part.text, figma);
    saved.push(result);
    if (!('text' in result)) {
      const { pages } = JSON.parse(result.head);
      for (let page = 0; page < pages; page++) saved.push(await readPage(figma, page));
    }
  }
  return saved;
}
const ingest = (root, reads) =>
  ingestReceipt({
    root,
    files: reads.map((read, i) => {
      const path = join(root, `result-${i}.json`);
      writeFileSync(path, JSON.stringify(read));
      return path;
    }),
  });
/**
 * A snapshot without what two runs of the same plan do not share: the clocks
 * a run stamps, and the ids Figma hands out (parts create an aliased variable
 * before the ones that alias it, so ids differ; aliases are compared by label).
 */
const timeless = (snapshot) => {
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (value === null || typeof value !== 'object') return value;
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (key === 'id') continue;
      out[key] = key === 'alias' && typeof value.to === 'string' ? value.to : strip(inner);
    }
    return out;
  };
  return strip({
    ...snapshot,
    takenAt: null,
    lastPush: { ...snapshot.lastPush, pushedAt: null },
  });
};
const planLine = (model, snapshotFile) =>
  hdsSummaryLine(hdsSummarize(hdsPlan(model, snapshotFile.snapshot, { prune: false })));

/** A type-ramp change: every typography token and text style reworded (the case that grew to ~57,000 characters). */
const typeRamp = (model) => {
  model.collections
    .flatMap((c) => c.variables)
    .filter((v) => /^(primitive|semantic)\.typography\./.test(v.path))
    .forEach((v) => {
      v.description = `${v.description} Type ramp 2026-10.`;
    });
  model.textStyles.forEach((style) => {
    style.description = `${style.description} Re-tuned with the ramp.`;
  });
  return model;
};

/** A new variable like `from`, at `path`, named `name`, with `valuesByMode`. */
const newVariable = (model, from, path, name, valuesByMode) => ({
  ...copy(variableOf(model, from)),
  path,
  name,
  codeSyntax: { WEB: `var(--${path.replaceAll('.', '-')})` },
  valuesByMode,
});
/** A semantic token with a role aliasing it, and a description rewritten. */
const describeAndCreate = (model) => {
  variableOf(model, 'primitive.space.2').description = 'Two steps, retuned.';
  model.collections
    .find((c) => c.key === 'semantic')
    .variables.push(
      newVariable(
        model,
        'semantic.color.surface.page',
        'semantic.color.state.pressed.overlay',
        'color/state/pressed/overlay',
        {
          Light: { alias: 'primitive.color.neutral.black' },
          Dark: { alias: 'primitive.color.neutral.white' },
        },
      ),
    );
  model.collections
    .find((c) => c.key === 'role')
    .variables.push(
      newVariable(model, 'role.background', 'role.pressed-overlay', 'pressed-overlay', {
        Default: { alias: 'semantic.color.state.pressed.overlay' },
      }),
    );
  return model;
};

/** The PLAN a script carries, and a copy of the script with PLAN edited and PLAN_CHECKSUM recomputed. */
const planOf = (text) => JSON.parse(text.match(/^const PLAN = (.*);$/m)[1]);
const forged = (text, edit) => {
  const plan = edit(planOf(text));
  return text
    .replace(/^const PLAN = .*;$/m, () => `const PLAN = ${JSON.stringify(plan)};`)
    .replace(
      /^const PLAN_CHECKSUM = '[0-9a-f]{8}';$/m,
      `const PLAN_CHECKSUM = '${hdsChecksum(JSON.stringify(plan))}';`,
    );
};

describe('a type-ramp change too big for one delta.js (57,000 characters, refused until now)', () => {
  let s;
  let single;
  beforeEach(async () => {
    s = await pending({ base: real, edit: typeRamp });
    single = await pending({ base: real, edit: typeRamp, maxChars: Infinity });
  });

  it('is more than one delta.js holds, and becomes ordered parts that each fit', () => {
    expect(single.built.chars, 'the one-script size of the scenario').toBeGreaterThan(55000);
    expect(single.built.chars).toBeLessThan(60000);
    const { parts } = s.built;
    expect(s.built.text).toBeNull();
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.map((p) => p.file)).toEqual(
      parts.map((_, i) => `delta-${i + 1}-of-${parts.length}.js`),
    );
    parts.forEach((part) => {
      expect(part.text.length).toBe(part.chars);
      expect(part.chars).toBeLessThanOrEqual(45000);
    });
    expect(s.built.chars).toBe(Math.max(...parts.map((p) => p.chars)));
    expect(s.built.line).toBe(single.built.line);
  });

  it('every part carries the guards of delta.js, and none can prune', () => {
    s.built.parts.forEach((part, k) => {
      const ast = parse(part.text, {
        ecmaVersion: 2020,
        sourceType: 'script',
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
      });
      // The first statement refuses any file but the library, retired files by name.
      const first = part.text.slice(ast.body[0].start, ast.body[0].end);
      expect(ast.body[0].type).toBe('IfStatement');
      expect(first).toContain(`figma.fileKey !== '${LINKS.libraryFileKey}'`);
      expect(first).toContain(`'${LINKS.retiredFiles[0].fileKey}'`);
      // It checks its own data and its own code, and never prunes.
      expect(part.text).toMatch(/^const PLAN_CHECKSUM = '[0-9a-f]{8}';$/m);
      expect(part.text).toMatch(/hdsVerifyRuntime\(\[.*\], '[0-9a-f]{8}', false\);/);
      expect(part.text).toMatch(/^return await hdsAgentPartRun\(figma, PLAN, PLAN_CHECKSUM\);$/m);
      expect(part.text).not.toMatch(/hdsAgentRun\(/);
      const plan = planOf(part.text);
      expect(plan.options.prune).toBe(false);
      expect(plan.options.scope).toBeNull();
      expect(plan.files).toEqual({
        library: LINKS.libraryFileKey,
        retired: [LINKS.retiredFiles[0].fileKey],
      });
      // Its place: the same run and plan hash in every part, its index and N.
      expect(plan.part).toEqual({
        run: s.built.run,
        plan: s.built.planHash,
        i: k + 1,
        n: s.built.parts.length,
      });
      expect(plan.base.checksum).toBe(s.snapshotFile.checksum);
      expect(plan.modelHash).toBe(buildPushPayload(s.next).payload.modelHash);
    });
  });

  it('the builder never prunes: asking for it is refused, and flipping a part to prune is caught', async () => {
    expect(() =>
      buildUseFigmaDeltaScript(s.next, {
        snapshotFile: s.snapshotFile,
        links: LINKS,
        commit: COMMIT,
        prune: true,
      }),
    ).toThrow(DELTA_PRUNE_REFUSAL);
    // Mutation: a part whose PLAN says prune, even with PLAN_CHECKSUM recomputed, must delete nothing.
    // The library holds a variable the model no longer has: under prune a partial slice would remove it.
    const [part1] = s.built.parts;
    const flipped = forged(part1.text, (plan) => {
      plan.options.prune = true;
      return plan;
    });
    const before = s.figma.writes.length;
    await expect(run(flipped, s.figma)).rejects.toThrow(
      /the plan deletes, and delta\.js never deletes|plan made in the library/,
    );
    expect(s.figma.writes.length).toBe(before);
    expect(rootData(s.figma, 'deltaRun')).toBe('');
  });

  it('runs part by part to the same snapshot a single delta.js gives', async () => {
    const reads = await runParts(s.built.parts, s.figma);
    const lastPush = JSON.parse(rootData(s.figma, 'lastPush'));
    expect(lastPush).toMatchObject({ modelHash: buildPushPayload(s.next).payload.modelHash });
    const chained = ingest(s.root, reads);
    expect(chained.head.parts).toBe(s.built.parts.length);

    const one = await run(single.built.text, single.figma);
    const whole = ingest(single.root, [one]);
    expect(timeless(chained.snapshot)).toEqual(timeless(whole.snapshot));
    // The library the parts left plans to nothing against the new snapshot.
    expect(planLine(s.next, { snapshot: chained.snapshot })).toBe(NOTHING_LINE);
  });

  it("every result stays under use_figma's 20 KB output cap", async () => {
    const reads = await runParts(s.built.parts, s.figma);
    reads.forEach((read) => expect(JSON.stringify(read).length).toBeLessThan(20000));
    reads
      .filter((read) => read.head)
      .forEach((read) => expect(read.head.length).toBeLessThanOrEqual(1024));
  });
});

describe('the parts of a run', () => {
  const edit = (model) => {
    // Three descriptions and a created semantic token with a role aliasing it.
    variableOf(model, 'primitive.space.2').description = 'Two steps, retuned.';
    variableOf(model, 'semantic.color.surface.accent').description = 'Accent surface, retuned.';
    variableOf(model, 'primitive.space.4').description = 'Four steps, retuned.';
    return model;
  };
  /** One unit per part: the smallest parts a plan can be cut into. */
  const tiny = { split: true, partChars: 1 };

  it('refuse to run out of order, writing nothing', async () => {
    const s = await pending({ edit, ...tiny });
    const { parts } = s.built;
    expect(parts.length).toBeGreaterThanOrEqual(3);
    const writes = s.figma.writes.length;
    // Part 2 first: part 1 has not run.
    await expect(run(parts[1].text, s.figma)).rejects.toThrow(
      /part 2 of \d+ cannot run now \(part 1 has not run\).*Nothing was written/s,
    );
    await run(parts[0].text, s.figma);
    const after = s.figma.writes.length;
    // Part 3 after part 1: part 2 is missing.
    await expect(run(parts[2].text, s.figma)).rejects.toThrow(
      /part 3 of \d+ cannot run now \(part 1 ran last\)/,
    );
    expect(s.figma.writes.length).toBe(after);
    expect(after).toBeGreaterThan(writes);
    expect(JSON.parse(rootData(s.figma, 'deltaRun'))).toMatchObject({ run: s.built.run, part: 1 });
  });

  it('refuse a part of another run, and a first part on a library that is not the snapshot', async () => {
    const a = await pending({ edit, ...tiny });
    const other = buildUseFigmaDeltaScript(
      edit(
        (() => {
          const m = copy(a.next);
          variableOf(m, 'primitive.radius.8').description = 'Another change.';
          return m;
        })(),
      ),
      { snapshotFile: a.snapshotFile, links: LINKS, commit: COMMIT, ...tiny },
    );
    expect(other.run).not.toBe(a.built.run);
    await run(a.built.parts[0].text, a.figma);
    const writes = a.figma.writes.length;
    await expect(run(other.parts[1].text, a.figma)).rejects.toThrow(/cannot run now/);
    await expect(run(other.parts[0].text, a.figma)).rejects.toThrow(
      /is not the committed figma\/snapshot\.json/,
    );
    expect(a.figma.writes.length).toBe(writes);
  });

  it('refuse when the library changed between two parts (a hand edit, another push)', async () => {
    const s = await pending({ edit, ...tiny });
    await run(s.built.parts[0].text, s.figma);
    const [variable] = await s.figma.variables.getLocalVariablesAsync();
    variable.description = 'Typed in Figma between two parts.';
    const writes = s.figma.writes.length;
    await expect(run(s.built.parts[1].text, s.figma)).rejects.toThrow(
      /is not what part 1 left.*Ask Adrian to run Sync/s,
    );
    expect(s.figma.writes.length).toBe(writes);
  });

  it('are idempotent: running a part again changes nothing, and from part 1 is safe', async () => {
    const s = await pending({ edit, ...tiny });
    const { parts } = s.built;
    await run(parts[0].text, s.figma);
    await run(parts[1].text, s.figma);
    const writes = s.figma.writes.length;
    const marker = rootData(s.figma, 'deltaRun');
    const receipt = rootData(s.figma, 'syncReceipt');
    // The part just run, and an earlier one, again.
    const again = await run(parts[1].text, s.figma);
    expect(again).toMatchObject({ replay: true, part: 2 });
    expect(again.next).toMatch(/Continue with part 3/);
    expect(await run(parts[0].text, s.figma)).toMatchObject({ replay: true, part: 1 });
    expect(s.figma.writes.length).toBe(writes);
    expect(rootData(s.figma, 'deltaRun')).toBe(marker);
    expect(rootData(s.figma, 'syncReceipt')).toBe(receipt);
    // And the run goes on from where it was.
    const reads = await runParts(parts.slice(2), s.figma);
    expect(reads.length).toBeGreaterThan(0);
    // After the last part, every part is a replay and the library is as it was.
    const done = s.figma.writes.length;
    for (const part of parts) expect(await run(part.text, s.figma)).toMatchObject({ replay: true });
    expect(s.figma.writes.length).toBe(done);
  });

  it('do not claim the model until the last part: only it stamps lastPush', async () => {
    const s = await pending({ edit, ...tiny });
    const lastPush = rootData(s.figma, 'lastPush');
    const { parts } = s.built;
    for (const part of parts.slice(0, -1)) {
      await run(part.text, s.figma);
      expect(rootData(s.figma, 'lastPush')).toBe(lastPush);
    }
    await run(parts.at(-1).text, s.figma);
    expect(JSON.parse(rootData(s.figma, 'lastPush')).modelHash).toBe(
      buildPushPayload(s.next).payload.modelHash,
    );
  });

  it('a tampered part is refused before anything is read but the file key', async () => {
    const s = await pending({ edit, ...tiny });
    const tampered = s.built.parts[0].text.replace('retuned', 'retunEd');
    expect(tampered).not.toBe(s.built.parts[0].text);
    const writes = s.figma.writes.length;
    await expect(run(tampered, s.figma)).rejects.toThrow(
      /PLAN does not match PLAN_CHECKSUM.*Nothing was written/s,
    );
    s.figma.fileKey = LINKS.stagingFileKey;
    await expect(run(s.built.parts[0].text, s.figma)).rejects.toThrow(/not the HDS library/);
    expect(s.figma.writes.length).toBe(writes);
  });

  it('a part whose plan in the library differs from the one it was built with is refused', async () => {
    const s = await pending({ edit, ...tiny });
    const forgery = forged(s.built.parts[0].text, (plan) => {
      const own = plan.slice.flatMap((c) => c[3]).find((v) => v[2].description);
      own[2].description = 'Forged.';
      return plan;
    });
    await expect(run(forgery, s.figma)).rejects.toThrow(
      /the plan made in the library is not the one pnpm figma:push --delta made for part 1 of/,
    );
  });

  it('are cut so that no part needs a later one: aliases follow their targets, styles come last', async () => {
    const s = await pending({
      edit: (model) => {
        const next = describeAndCreate(model);
        model.textStyles.find((t) => t.path === 'semantic.typography.h1').description = 'Retuned.';
        return next;
      },
      ...tiny,
    });
    const order = s.built.parts.map((part) => {
      const plan = planOf(part.text);
      return [
        ...plan.slice.flatMap((c) => c[3]).filter((v) => !v[1] || Object.keys(v[2]).length),
        ...plan.textStyles,
      ].map((x) => (Array.isArray(x) ? x[0] : x.path));
    });
    const flat = order.flat();
    const at = (path) => order.findIndex((paths) => paths.includes(path));
    expect(at('semantic.color.state.pressed.overlay')).toBeLessThan(at('role.pressed-overlay'));
    expect(at('semantic.typography.h1')).toBe(order.length - 1);
    expect(flat.length).toBeGreaterThan(3);
    const { snapshot } = ingest(s.root, await runParts(s.built.parts, s.figma));
    expect(planLine(s.next, { snapshot })).toBe(NOTHING_LINE);
  });
});

// ── Every kind of change lands the same through parts as through one script ──
const collectionOf = (model, key) => model.collections.find((c) => c.key === key);
const kinds = {
  'created variables with a role aliasing them': { edit: describeAndCreate },
  'a new mode on a collection': {
    edit: (model) => {
      const semantic = collectionOf(model, 'semantic');
      semantic.modes.push('Dim');
      semantic.variables.forEach((v) => (v.valuesByMode.Dim = v.valuesByMode.Dark));
      return model;
    },
  },
  'a new collection whose variables alias an existing one and each other': {
    edit: (model) => {
      model.collections.push({
        key: 'extra',
        name: 'Hirobius/Extra',
        modes: ['Default'],
        hiddenFromPublishing: false,
        variables: [
          newVariable(model, 'role.background', 'extra.b', 'b', {
            Default: { alias: 'extra.a' },
          }),
          newVariable(model, 'role.background', 'extra.a', 'a', {
            Default: { alias: 'semantic.color.surface.page' },
          }),
        ],
      });
      return model;
    },
  },
  'text and effect styles': {
    edit: (model) => {
      const h1 = model.textStyles.find((t) => t.path === 'semantic.typography.h1');
      h1.letterSpacing = { unit: 'PERCENT', value: -3 };
      h1.description = 'Page title, tightened.';
      const subtle = model.effectStyles.find((e) => e.path === 'semantic.shadow.subtle');
      subtle.effects[0].radius = 3;
      return model;
    },
  },
  'a variable rebound to another alias target': {
    edit: (model) => {
      variableOf(model, 'role.background').valuesByMode.Default = {
        alias: 'semantic.color.surface.accent',
      };
      variableOf(model, 'semantic.color.surface.accent').valuesByMode.Light = {
        alias: 'primitive.color.blue.600',
      };
      return model;
    },
  },
};

describe('parts converge to what one delta.js gives, whatever the change', () => {
  for (const [label, { edit }] of Object.entries(kinds)) {
    it(`${label}`, async () => {
      const split = await pending({ edit, split: true, partChars: 1 });
      const whole = await pending({ edit, maxChars: Infinity });
      expect(split.built.parts.length).toBeGreaterThanOrEqual(2);
      const reads = await runParts(split.built.parts, split.figma);
      const chained = ingest(split.root, reads);
      const one = ingest(whole.root, [await run(whole.built.text, whole.figma)]);
      expect(timeless(chained.snapshot)).toEqual(timeless(one.snapshot));
      expect(planLine(split.next, { snapshot: chained.snapshot })).toBe(NOTHING_LINE);
    });
  }

  it('the 19-variable Primitives space/* rename on the real model, one variable per part', async () => {
    const spaces = collectionOf(real, 'primitive').variables.filter((v) =>
      v.name.startsWith('space/'),
    );
    const renames = Object.fromEntries(
      spaces.map((v) => [
        v.path,
        `primitive.space-px.${String(v.valuesByMode.Default.value).replace('.', '_')}`,
      ]),
    );
    const renamed = (model) => {
      const to = (path) => renames[path] || path;
      model.collections.forEach((c) =>
        c.variables.forEach((v) => {
          if (renames[v.path]) {
            v.path = to(v.path);
            v.name = v.path.replace('primitive.space-px.', 'space-px/');
            v.codeSyntax = { WEB: `var(--${v.path.replaceAll('.', '-')})` };
          }
          Object.values(v.valuesByMode).forEach(
            (entry) => 'alias' in entry && (entry.alias = to(entry.alias)),
          );
        }),
      );
      model.textStyles.forEach((style) =>
        Object.keys(style.boundVariables).forEach(
          (field) => (style.boundVariables[field] = to(style.boundVariables[field])),
        ),
      );
      return model;
    };
    const split = await pending({
      base: real,
      edit: renamed,
      renames,
      split: true,
      partChars: 1,
    });
    const whole = await pending({ base: real, edit: renamed, renames, maxChars: Infinity });
    expect(split.built.parts.length).toBeGreaterThanOrEqual(19);
    const chained = ingest(split.root, await runParts(split.built.parts, split.figma));
    const one = ingest(whole.root, [await run(whole.built.text, whole.figma)]);
    expect(timeless(chained.snapshot)).toEqual(timeless(one.snapshot));
  });
});

// ── Receipts: pages, and the chain --from-receipt rebuilds ───────────────────
describe('the receipts of a run chain into one snapshot', () => {
  const edit = describeAndCreate;
  const tiny = { split: true, partChars: 1 };

  it('a part whose receipt needs several pages returns only its head, and receipt.js collects the pages', async () => {
    const s = await pending({ edit, pageChars: 60, ...tiny });
    const first = await run(s.built.parts[0].text, s.figma);
    const head = JSON.parse(first.head);
    expect(head.pages).toBeGreaterThan(1);
    expect(head.part).toEqual([1, s.built.parts.length, s.built.run]);
    expect(first).not.toHaveProperty('text');
    expect(first.next).toMatch(
      new RegExp(`^Run receipt.js with PAGE 0 to ${head.pages - 1}.*then run part 2 of `),
    );
    const reads = [first];
    for (let page = 0; page < head.pages; page++) reads.push(await readPage(s.figma, page));
    for (const part of s.built.parts.slice(1)) reads.push(...(await runParts([part], s.figma)));
    const whole = await pending({ edit, maxChars: Infinity });
    const one = ingest(whole.root, [await run(whole.built.text, whole.figma)]);
    expect(timeless(ingest(s.root, reads).snapshot)).toEqual(timeless(one.snapshot));
  });

  it('every head is at most 1,024 characters with its part, and a small part returns its receipt inline', async () => {
    const s = await pending({ edit, ...tiny });
    const reads = await runParts(s.built.parts, s.figma);
    expect(reads).toHaveLength(s.built.parts.length);
    reads.forEach((read, i) => {
      expect(read.head.length).toBeLessThanOrEqual(1024);
      expect(read).toMatchObject({ page: 0, part: i + 1, of: s.built.parts.length });
      expect(JSON.parse(read.head).base).toBe(
        i === 0 ? s.snapshotFile.checksum : JSON.parse(reads[i - 1].head).post,
      );
    });
    expect(reads.at(-1).next).toMatch(
      /^Save this result, then pnpm figma:snapshot --from-receipt with every saved result, in order\.$/,
    );
  });

  it('--from-receipt takes the files in any order, and names the part that is missing', async () => {
    const s = await pending({ edit, ...tiny });
    const reads = await runParts(s.built.parts, s.figma);
    const without = reads.filter((read) => read.part !== 2);
    expect(() => ingest(s.root, without)).toThrow(
      new RegExp(`Part 2 of ${reads.length} \\(run ${s.built.run}\\) has no receipt page`),
    );
    const shuffled = [...reads].reverse();
    expect(ingest(s.root, shuffled).checksum).toBe(JSON.parse(reads.at(-1).head).post);
  });

  it('--from-receipt refuses a chain whose link was taken from another library state', async () => {
    const a = await pending({ edit, ...tiny });
    const b = await pending({ edit, ...tiny });
    const readsA = await runParts(a.built.parts, a.figma);
    // Part 2 of the same run, read from a library that was not at the state part 1 left.
    await run(b.built.parts[0].text, b.figma);
    const [variable] = await b.figma.variables.getLocalVariablesAsync();
    variable.description = 'Typed in Figma.';
    const readsB = await runParts(b.built.parts.slice(0, 1), b.figma).catch(() => []);
    expect(readsB).toEqual([]);
    // A forged read: part 2 with a base that is not what part 1 left.
    const forged2 = {
      ...readsA[1],
      head: readsA[1].head.replace(/"base":"[0-9a-f]{8}"/, '"base":"00000000"'),
    };
    expect(() => ingest(a.root, [readsA[0], forged2, ...readsA.slice(2)])).toThrow(
      /Part 2 of \d+: This receipt is a delta against base snapshot 00000000/,
    );
  });
});

// ── pnpm figma:push --delta writes the parts ─────────────────────────────────
describe('pnpm figma:push --delta with a change that needs parts', () => {
  const limits = { split: true, partChars: 1 };
  const rootWithChange = async () => {
    const root = tempRoot();
    const figma = await pushedLibrary(fixtureModel());
    writeFileSync(
      join(root, 'figma', 'snapshot.json'),
      serializeSnapshotFile(await hdsRunSnapshot(figma)),
    );
    const tokens = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
    const walk = (node) => {
      if (node && typeof node === 'object') {
        if (node.$description === 'Pure white.') node.$description = 'Pure white, retuned.';
        if (node.$description === 'Page background.')
          node.$description = 'Page background, retuned.';
        if (node.$description === 'HSL channels for shadow tints.') {
          node.$description = 'HSL channels for shadow tints, retuned.';
        }
        Object.values(node).forEach(walk);
      }
    };
    walk(tokens);
    writeFileSync(join(root, 'hirobius.tokens.json'), JSON.stringify(tokens, null, 2));
    return { root, outDir: join(root, 'figma', 'push') };
  };
  const names = (outDir) =>
    readdirSync(join(outDir, 'use-figma')).filter((name) => /^delta/.test(name));

  it('writes delta-i-of-N.js and no delta.js, and prints N, the exact order and the receipt step', async () => {
    const { root, outDir } = await rootWithChange();
    const result = writeDeltaScript({ root, outDir, commit: COMMIT, limits });
    const n = result.parts.length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(names(outDir)).toEqual(result.parts.map((_, i) => `delta-${i + 1}-of-${n}.js`));
    result.parts.forEach((part) =>
      expect(readFileSync(join(outDir, 'use-figma', part.file), 'utf8')).toBe(part.text),
    );
    const out = formatDeltaRun(result);
    expect(out).toContain(`${n} PARTS`);
    expect(out).toContain(`run ${result.run}`);
    const listed = [...out.matchAll(/^ {4}(\d+)\. (\S+) \(/gm)].map((m) => [Number(m[1]), m[2]]);
    expect(listed).toEqual(
      result.parts.map((part, i) => [i + 1, `figma/push/use-figma/${part.file}`]),
    );
    expect(out).toMatch(/refuses to run out of order and re-running one changes nothing/);
    expect(out).toContain(
      `When part ${n} is done: pnpm figma:snapshot --from-receipt <every saved file`,
    );
  });

  it('removes the earlier delta.js and parts: one shape replaces the other, and a refusal leaves none', async () => {
    const { root, outDir } = await rootWithChange();
    const resolveCommit = () => COMMIT;
    runDeltaCommand({ root, resolveCommit });
    expect(names(outDir)).toEqual(['delta.js']);
    const printed = runDeltaCommand({ root, resolveCommit, limits });
    expect(printed).toMatch(/ PARTS, too big for one delta\.js/);
    expect(names(outDir)).not.toContain('delta.js');
    expect(names(outDir).length).toBeGreaterThanOrEqual(2);
    runDeltaCommand({ root, resolveCommit });
    expect(names(outDir)).toEqual(['delta.js']);
    runDeltaCommand({ root, resolveCommit, limits });
    rmSync(join(root, 'figma', 'snapshot.json'));
    expect(() => runDeltaCommand({ root, resolveCommit, limits })).toThrow(/Route it to Sync/);
    expect(names(outDir)).toEqual([]);
    expect(existsSync(join(outDir, 'use-figma', 'receipt.js'))).toBe(true);
  });
});
