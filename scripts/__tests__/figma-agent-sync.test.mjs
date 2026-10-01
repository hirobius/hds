/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Zero-click agent sync (hds#418, hds#397 C3): after a token change merges,
 * an agent runs `pnpm figma:push --delta` and passes the delta.js it writes
 * to one use_figma call on staging. delta.js refuses anything but staging,
 * checks its own data and code, pins staging to the committed
 * figma/snapshot.json, applies only the changes, re-plans to 0, writes
 * lastPush and the C2 receipt, and returns the receipt for
 * `pnpm figma:snapshot --from-receipt`.
 *
 * Seams: the delta.js text exactly as the builder writes it, run in a V8
 * context the way use_figma runs it (async, top-level return, `figma` in
 * scope) against an in-memory Figma file (helpers/fake-figma.mjs) that reads
 * as use_figma does (escaped variable descriptions, root named "Document");
 * hdsAgentReadState, the in-sandbox reader; and the ingest and plan commands
 * on a temporary repo root. Nothing here reaches a network or Figma.
 */
import { describe, it, expect, afterEach } from 'vitest';
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
  hdsReadState,
  hdsRunPush,
  hdsRunSnapshot,
  hdsSummarize,
  hdsSummaryLine,
} from '../lib/figma-runtime.mjs';
import {
  agentRuntimeSource,
  buildPushPayload,
  buildUseFigmaReceiptScript,
} from '../lib/figma-scripts.mjs';
import { hdsAgentReadState, hdsAgentSlice } from '../lib/figma-agent-runtime.mjs';
import { buildUseFigmaDeltaScript } from '../lib/figma-agent-sync.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { formatDeltaRun, planAgainstSnapshot, writeDeltaScript } from '../figma-push.mjs';
import { ingestReceipt } from '../figma-snapshot.mjs';
import { FIXTURE_TOKENS_PATH, fixtureModel } from './helpers/figma-fixture.mjs';
import { createFakeFigma, seededFakeFigma, textStyleFonts } from './helpers/fake-figma.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';

const LINKS = Object.freeze({
  storybookUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  stagingFileKey: 'STAGINGKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  stagingFileName: 'HDS Tokens & Components (Copy)',
});
const NOTHING_LINE = 'updated 0 · created 0 · deleted 0';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMMIT = '0123456789abcdef0123456789abcdef01234567';

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-agent-sync-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(LINKS, null, 2));
  return root;
};
const snapshotPath = (root) => join(root, 'figma', 'snapshot.json');
/** Every character use_figma escapes, plus an entity typed as text (it must come back as typed). */
const TRICKY = `Use "brand" tones, don't <mix> & match; x&quot;y stays literal.`;

const copy = (value) => JSON.parse(JSON.stringify(value));
const variableOf = (model, path) =>
  model.collections.flatMap((c) => c.variables).find((v) => v.path === path);
/** The fixture model with descriptions use_figma would escape. */
const trickyModel = () => {
  const model = copy(fixtureModel());
  variableOf(model, 'primitive.color.neutral.white').description = TRICKY;
  variableOf(model, 'semantic.color.surface.page').description = `"${TRICKY}"`;
  return model;
};
const lineOf = (model, state) => hdsSummaryLine(hdsSummarize(hdsPlan(model, state)));
/** A staging file the Sync plugin pushed `model` into (it writes and reads raw text). */
const pushedStaging = async (model) => {
  const figma = createFakeFigma({
    fileName: LINKS.stagingFileName,
    fonts: textStyleFonts(model.textStyles),
  });
  figma.fileKey = LINKS.stagingFileKey;
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  return figma;
};

describe('hdsAgentReadState: staging as use_figma reads it, made comparable with figma/snapshot.json', () => {
  it('decodes the HTML-escaped descriptions: the plan reaches 0 · 0 · 0 only with decoding on', async () => {
    const model = trickyModel();
    const figma = await pushedStaging(model);
    const plugin = await hdsReadState(figma);
    expect(lineOf(model, plugin)).toBe(NOTHING_LINE);

    figma.useFigma();
    const escaped = await hdsReadState(figma);
    expect(lineOf(model, escaped)).toBe('updated 2 · created 0 · deleted 0');

    const decoded = await hdsAgentReadState(figma, plugin.file);
    expect(lineOf(model, decoded)).toBe(NOTHING_LINE);
    // The committed file, not use_figma's "Document": the state hashes like the plugin's read.
    expect(decoded.file).toEqual(plugin.file);
    expect({ ...decoded, takenAt: plugin.takenAt }).toEqual(plugin);
  });
});

describe('the pin on the committed figma/snapshot.json', () => {
  it('staging read through use_figma decodes, normalizes and hashes to the committed checksum', async () => {
    const committed = parseSnapshotFile(readFileSync(join(REPO, 'figma', 'snapshot.json'), 'utf8'));
    const figma = seededFakeFigma(committed.snapshot);
    // The seeded file is the snapshot, ids included, as a plugin reads it.
    const plugin = await hdsReadState(figma);
    expect(hdsChecksum(JSON.stringify({ ...plugin, takenAt: committed.snapshot.takenAt }))).toBe(
      committed.checksum,
    );

    figma.fileKey = '2VgBbVpKiDnu0aftJEVyBQ';
    figma.useFigma();
    const pin = (state) =>
      hdsChecksum(JSON.stringify({ ...state, takenAt: committed.snapshot.takenAt }));
    const raw = await hdsReadState(figma);
    const decoded = await hdsAgentReadState(figma, committed.snapshot.file);
    expect(raw.file).toEqual({ name: 'Document', key: '2VgBbVpKiDnu0aftJEVyBQ' });
    // Undecoded, the pin fails exactly when a description holds a character use_figma escapes (6 on 2026-10-01).
    const escapable = committed.snapshot.collections.some((c) =>
      c.variables.some((v) => /["'<>&]/.test(v.description)),
    );
    expect(pin({ ...raw, file: committed.snapshot.file }) === committed.checksum).toBe(!escapable);
    expect(pin(decoded)).toBe(committed.checksum);
  });
});

// ── The fast path ────────────────────────────────────────────────────────────
/** A new variable like `from`, at `path`, named `name`, with `valuesByMode`. */
const newVariable = (model, from, path, name, valuesByMode) => {
  const like = variableOf(model, from);
  return {
    ...copy(like),
    path,
    name,
    codeSyntax: { WEB: `var(--${path.replaceAll('.', '-')})` },
    valuesByMode,
  };
};
/** Today's kind of change (2026-10-01): descriptions rewritten, and a semantic token with a role that aliases it. */
const describeAndCreate = (model) => {
  variableOf(model, 'primitive.space.2').description = `Two steps: "tight" <gap> & more.`;
  variableOf(model, 'semantic.color.surface.accent').description = "Accent surface, it's new.";
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

/** Runs delta.js the way use_figma does: async, top-level await and return, `figma` in scope. */
async function runDelta(text, figma) {
  const result = await vm.runInNewContext(`(async () => {\n${text}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
}

/**
 * Staging after the Sync plugin pushed `base` (then `stage` edited it) and
 * main committed its snapshot; then main's model became `edit(base)`. Returns delta.js built
 * for that change, and the staging file, reading from now on as use_figma does.
 */
async function pending({
  base = trickyModel(),
  edit = describeAndCreate,
  stage = async () => {},
  renames = {},
  ...options
} = {}) {
  const root = tempRoot();
  const figma = await pushedStaging(base);
  await stage(figma);
  writeFileSync(snapshotPath(root), serializeSnapshotFile(await hdsRunSnapshot(figma)));
  const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath(root), 'utf8'));
  const next = edit(copy(base));
  const built = buildUseFigmaDeltaScript(next, {
    renames,
    snapshotFile,
    links: LINKS,
    commit: COMMIT,
    ...options,
  });
  figma.useFigma();
  return { root, figma, next, renames, built, snapshotFile };
}

/** Saves what use_figma returned, as an agent does, and ingests it with --from-receipt. */
const ingest = (root, reads) =>
  ingestReceipt({
    root,
    files: reads.map((read, i) => {
      const path = join(root, `result-${i}.json`);
      writeFileSync(path, JSON.stringify(read));
      return path;
    }),
  });
const committedPlanLine = (s) =>
  planAgainstSnapshot({
    model: s.next,
    renames: s.renames,
    snapshotFile: parseSnapshotFile(readFileSync(snapshotPath(s.root), 'utf8')),
  }).line;

describe('delta.js on staging', () => {
  it('applies the change, re-plans to 0, stamps lastPush and the receipt, and returns the receipt inline', async () => {
    const s = await pending();
    expect(s.built.line).toBe('updated 2 · created 2 · deleted 0');
    const read = await runDelta(s.built.text, s.figma);

    // The receipt, as receipt.js would read page 0 of it, plus the plan line.
    expect(read).toMatchObject({ file: LINKS.stagingFileKey, page: 0, line: s.built.line });
    const head = JSON.parse(read.head);
    expect(head).toMatchObject({
      commit: COMMIT,
      base: s.snapshotFile.checksum,
      format: 'json',
      pages: 1,
      lastPush: { modelHash: buildPushPayload(s.next).payload.modelHash, scope: null },
    });
    expect(JSON.stringify(read).length).toBeLessThanOrEqual(15000);

    // --from-receipt rebuilds the live state, and the plan against it is 0 · 0 · 0.
    const { checksum } = ingest(s.root, [read]);
    expect(checksum).toBe(head.post);
    const live = await hdsAgentReadState(s.figma, s.snapshotFile.snapshot.file);
    expect(hdsChecksum(JSON.stringify({ ...live, takenAt: head.takenAt }))).toBe(checksum);
    expect(committedPlanLine(s)).toBe(NOTHING_LINE);

    // Written raw: a plugin reads back exactly the model's text (no double escape).
    s.figma.useFigma(false);
    const plugin = await hdsReadState(s.figma);
    expect(lineOf(s.next, plugin)).toBe(NOTHING_LINE);
  });
});

describe('delta.js lands every kind of change a push makes without deleting', () => {
  const cases = {
    'a text style value (its bound variables bound again) and an effect style': (model) => {
      const h1 = model.textStyles.find((t) => t.path === 'semantic.typography.h1');
      h1.letterSpacing = { unit: 'PERCENT', value: -3 };
      h1.description = 'Page title, "tight".';
      model.effectStyles[0].effects[0].radius += 2;
      return model;
    },
    'a new mode on a collection': (model) => {
      const role = model.collections.find((c) => c.key === 'role');
      role.modes.push('Contrast');
      role.variables.forEach((v) => (v.valuesByMode.Contrast = v.valuesByMode.Default));
      return model;
    },
    'a new collection': (model) => {
      model.collections.push({
        key: 'motion',
        name: 'Hirobius/Motion',
        modes: ['Default'],
        hiddenFromPublishing: true,
        variables: [
          {
            path: 'motion.duration.fast',
            name: 'duration/fast',
            resolvedType: 'FLOAT',
            description: "Fast: 120 ms, don't animate layout.",
            scopes: [],
            hiddenFromPublishing: true,
            codeSyntax: { WEB: 'var(--motion-duration-fast)' },
            valuesByMode: { Default: { value: 120 } },
          },
        ],
      });
      return model;
    },
  };
  for (const [label, edit] of Object.entries(cases)) {
    it(label, async () => {
      const s = await pending({ edit });
      expect(s.built.line).not.toBe(NOTHING_LINE);
      const read = await runDelta(s.built.text, s.figma);
      expect(ingest(s.root, [read]).checksum).toBe(JSON.parse(read.head).post);
      expect(committedPlanLine(s)).toBe(NOTHING_LINE);
    });
  }
});

describe('delta.js after the apply', () => {
  const rootData = (figma, key) => figma.root.getSharedPluginData('hirobius', key);

  it('writes neither lastPush nor a receipt when the re-plan is not 0 (Figma did not keep a write)', async () => {
    const s = await pending();
    const lastPush = rootData(s.figma, 'lastPush');
    const space = (await s.figma.variables.getLocalVariablesAsync()).find(
      (v) => v.getSharedPluginData('hirobius', 'path') === 'primitive.space.2',
    );
    const kept = space.description;
    Object.defineProperty(space, 'description', {
      get: () => kept,
      set: () => {},
      configurable: true,
    });
    await expect(runDelta(s.built.text, s.figma)).rejects.toThrow(
      /still differs from the model in 1 item\(s\); lastPush and the receipt were not written.*Sync/s,
    );
    expect(rootData(s.figma, 'lastPush')).toBe(lastPush);
    expect(rootData(s.figma, 'syncReceipt')).toBe('');
  });

  it('returns only the head when the receipt needs more than one page; receipt.js collects the pages', async () => {
    const s = await pending({ pageChars: 400 });
    const result = await runDelta(s.built.text, s.figma);
    const head = JSON.parse(result.head);
    expect(head.pages).toBeGreaterThan(1);
    expect(result).toEqual({
      file: LINKS.stagingFileKey,
      head: result.head,
      line: s.built.line,
      next: `Run receipt.js with PAGE 0 to ${head.pages - 1}, then pnpm figma:snapshot --from-receipt with every result.`,
    });
    // An agent then reads each page with receipt.js and ingests them all.
    const receipt = buildUseFigmaReceiptScript(LINKS);
    const reads = [];
    for (let page = 0; page < head.pages; page++) {
      const code = receipt.replace(/^const PAGE = 0;$/m, `const PAGE = ${page};`);
      reads.push(
        JSON.parse(
          JSON.stringify(
            await vm.runInNewContext(`(async () => {\n${code}\n})()`, { figma: s.figma }),
          ),
        ),
      );
    }
    expect(ingest(s.root, reads).checksum).toBe(head.post);
    expect(committedPlanLine(s)).toBe(NOTHING_LINE);
  });
});

// ── Refusals in Figma: each writes nothing ───────────────────────────────────
/** delta.js with PLAN replaced by `edit(PLAN)` and PLAN_CHECKSUM recomputed: a deliberate forgery that keeps the checksum. */
const forged = (text, edit) => {
  const plan = edit(JSON.parse(text.match(/^const PLAN = (.*);$/m)[1]));
  return text
    .replace(/^const PLAN = .*;$/m, () => `const PLAN = ${JSON.stringify(plan)};`)
    .replace(
      /^const PLAN_CHECKSUM = '[0-9a-f]{8}';$/m,
      `const PLAN_CHECKSUM = '${hdsChecksum(JSON.stringify(plan))}';`,
    );
};

describe('delta.js refuses, writing nothing', () => {
  /** A file whose every property read is logged: what the script touched before it refused. */
  const watched = (figma) => {
    const reads = [];
    const proxy = new Proxy(figma, {
      get(target, prop) {
        reads.push(String(prop));
        return Reflect.get(target, prop);
      },
    });
    return { proxy, reads };
  };
  const refuses = async (s, pattern, text = s.built.text, figma = s.figma) => {
    const before = s.figma.writes.length;
    await expect(runDelta(text, figma)).rejects.toThrow(pattern);
    expect(s.figma.writes.slice(before)).toEqual([]);
  };

  it('is at most 45,000 chars, and its first statement refuses any file but staging', async () => {
    const { built } = await pending();
    expect(built.chars).toBe(built.text.length);
    expect(built.chars).toBeLessThanOrEqual(45000);
    const ast = parse(built.text, {
      ecmaVersion: 2020,
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
    const first = built.text.slice(ast.body[0].start, ast.body[0].end);
    expect(ast.body[0].type).toBe('IfStatement');
    expect(first).toContain(`figma.fileKey !== '${LINKS.stagingFileKey}'`);
    expect(first).toContain(`figma.fileKey === '${LINKS.libraryFileKey}'`);
    expect(first).toMatch(/throw new Error/);
  });

  for (const [label, key] of [
    ['the library key', LINKS.libraryFileKey],
    ['a null key', null],
    ['no key at all', undefined],
    ['any other file', 'SOMEOTHERFILE000000000'],
  ]) {
    it(`${label}: reads nothing but figma.fileKey`, async () => {
      const s = await pending();
      s.figma.fileKey = key;
      const { proxy, reads } = watched(s.figma);
      await refuses(
        s,
        /not the HDS staging file.*Nothing was read or written/s,
        s.built.text,
        proxy,
      );
      expect(reads).toEqual(['fileKey']);
    });
  }

  it('a tampered PLAN (one character retyped wrong)', async () => {
    const s = await pending();
    const tampered = s.built.text.replace('Accent surface', 'Accent surfacE');
    expect(tampered).not.toBe(s.built.text);
    await refuses(s, /PLAN does not match PLAN_CHECKSUM.*Nothing was written/s, tampered);
  });

  it('a tampered runtime function', async () => {
    const s = await pending();
    const tampered = s.built.text.replace("return 'hirobius';", "return 'hirobius' ;");
    expect(tampered).not.toBe(s.built.text);
    await refuses(s, /runtime code does not match its checksum/, tampered);
  });

  it('a pin mismatch: staging changed after figma/snapshot.json was committed', async () => {
    const s = await pending();
    const [variable] = await s.figma.variables.getLocalVariablesAsync();
    variable.description = 'Typed in Figma after the snapshot.';
    await refuses(
      s,
      /staging \([0-9a-f]{8}\) is not the committed figma\/snapshot\.json.*If a Sync ran, collect its receipt \(receipt\.js\); otherwise ask Adrian to run Sync/s,
    );
  });

  /** Staging holds what `drop` takes out of the next model: a variable, or a mode. */
  const deletions = {
    'a variable': {
      base: (model) => {
        model.collections
          .find((c) => c.key === 'role')
          .variables.push(
            newVariable(model, 'role.background', 'role.retired', 'retired', {
              Default: { alias: 'semantic.color.surface.page' },
            }),
          );
        return model;
      },
      drop: (model) => {
        const role = model.collections.find((c) => c.key === 'role');
        role.variables = role.variables.filter((v) => v.path !== 'role.retired');
        return model;
      },
      // A slice is partial: under prune, every variable outside it would go too.
      deletes: (plan) =>
        plan.removals.variables.some((v) => v.path === 'role.retired') &&
        !plan.removals.modes.length,
    },
    'a mode': {
      base: (model) => {
        const semantic = model.collections.find((c) => c.key === 'semantic');
        semantic.modes.push('Dim');
        semantic.variables.forEach((v) => (v.valuesByMode.Dim = v.valuesByMode.Dark));
        return model;
      },
      drop: (model) => {
        const semantic = model.collections.find((c) => c.key === 'semantic');
        semantic.modes = semantic.modes.filter((m) => m !== 'Dim');
        semantic.variables.forEach((v) => delete v.valuesByMode.Dim);
        return model;
      },
      deletes: (plan) => plan.collections.some((c) => c.modes.remove.indexOf('Dim') !== -1),
    },
  };
  for (const [what, { base, drop, deletes }] of Object.entries(deletions)) {
    it(`a plan that would delete ${what}, even forged with both checksums right`, async () => {
      const s = await pending({
        base: base(trickyModel()),
        edit: (model) => describeAndCreate(drop(model)),
      });
      // Without prune the plan keeps it as an extra; a forged PLAN asks for prune.
      const forgery = forged(s.built.text, (plan) => {
        plan.options.prune = true;
        const state = s.snapshotFile.snapshot;
        const pruned = hdsPlan(hdsAgentSlice(state, plan), state, plan.options);
        expect(deletes(pruned)).toBe(true);
        plan.planSum = hdsChecksum(JSON.stringify(pruned));
        return plan;
      });
      await refuses(
        s,
        /the plan deletes, and delta\.js never deletes.*Nothing was written/s,
        forgery,
      );
    });
  }

  it('a text style font this editor does not have', async () => {
    const s = await pending({
      edit: (model) => {
        model.textStyles.find((t) => t.path === 'semantic.typography.h1').fontStyle = 'Black';
        return model;
      },
    });
    await refuses(s, /needs the font "Satoshi Black".*Nothing was written.*Sync/s);
  });
});

// ── Refusals at build time: no delta.js, and the route ───────────────────────
describe('pnpm figma:push --delta refuses to build what Sync must do', () => {
  const ROUTE = /Route it to Sync: ask Adrian to run Sync in staging.*No delta\.js was written/s;

  it('a plan that moves a variable between collections', async () => {
    await expect(
      pending({
        edit: (model) => {
          const component = model.collections.find((c) => c.key === 'component');
          const moved = component.variables.find((v) => v.path === 'component.button.bg');
          component.variables = component.variables.filter((v) => v !== moved);
          const { Default } = moved.valuesByMode;
          moved.valuesByMode = { Light: Default, Dark: Default };
          model.collections.find((c) => c.key === 'semantic').variables.push(moved);
          return model;
        },
      }),
    ).rejects.toThrow(/moves 1 variable\(s\) between collections.*Route it to Sync/s);
  });

  it('a plan with a conflict a person must fix in Figma', async () => {
    await expect(
      pending({
        // A hand-made variable of another type already holds the name the new token needs.
        stage: async (figma) => {
          const semantic = (await figma.variables.getLocalVariableCollectionsAsync()).find(
            (c) => c.name === 'Hirobius/Semantic',
          );
          figma.variables.createVariable('color/state/pressed/overlay', semantic, 'FLOAT');
        },
      }),
    ).rejects.toThrow(/1 conflict\(s\) a person must fix in Figma first.*Route it to Sync/s);
  });

  it('prune: delta.js never deletes', async () => {
    await expect(pending({ prune: true })).rejects.toThrow(
      /never deletes, so --delta refuses --prune.*promote plugin/s,
    );
  });

  it('a delta.js over 45,000 chars', async () => {
    const long = (path) => `${path} `.repeat(60);
    await expect(
      pending({
        edit: (model) => {
          model.collections
            .flatMap((c) => c.variables)
            .slice(0, 30)
            .forEach((v) => (v.description = long(v.path)));
          return model;
        },
      }),
    ).rejects.toThrow(
      /delta\.js would be [\d,]+ characters, over its 45,000 limit.*Route it to Sync/s,
    );
  });

  it('no committed figma/snapshot.json to pin to', () => {
    expect(() =>
      buildUseFigmaDeltaScript(fixtureModel(), {
        snapshotFile: null,
        links: LINKS,
        commit: COMMIT,
      }),
    ).toThrow(ROUTE);
  });

  it('nothing to sync: staging already holds the model, so there is no delta.js', async () => {
    const { built } = await pending({ edit: (model) => model });
    expect(built).toMatchObject({ text: null, line: NOTHING_LINE });
    expect(built.nothing).toMatch(/nothing to sync/);
  });
});

// ── The real model ───────────────────────────────────────────────────────────
describe('delta.js for the real model (staging pushed from main, then a change)', () => {
  const real = loadFigmaInputs(REPO).model;
  const collectionOf = (model, key) => model.collections.find((c) => c.key === key);

  /** Today's kind of change (2026-10-01: updated 10 · created 2): ten descriptions, a semantic colour and a role aliasing it. */
  const todayLike = (model) => {
    collectionOf(model, 'semantic')
      .variables.slice(0, 10)
      .forEach((v) => (v.description = `${v.description} Edited: "pressed" isn't <hover> & more.`));
    const [black, white] = collectionOf(model, 'primitive').variables.filter(
      (v) => v.resolvedType === 'COLOR',
    );
    const overlay = 'semantic.color.state.agent-sync-overlay';
    collectionOf(model, 'semantic').variables.push({
      path: overlay,
      name: 'color/state/agent-sync-overlay',
      resolvedType: 'COLOR',
      description: 'Pressed-state overlay. Apply alpha in the class.',
      scopes: ['ALL_FILLS', 'STROKE_COLOR'],
      hiddenFromPublishing: false,
      codeSyntax: { WEB: 'var(--semantic-color-state-agent-sync-overlay)' },
      valuesByMode: { Light: { alias: black.path }, Dark: { alias: white.path } },
    });
    collectionOf(model, 'role').variables.push({
      path: 'role.agent-sync-overlay',
      name: 'agent-sync-overlay',
      resolvedType: 'COLOR',
      description: 'Pressed-state overlay colour role.',
      scopes: ['ALL_FILLS', 'STROKE_COLOR'],
      hiddenFromPublishing: false,
      codeSyntax: { WEB: 'var(--role-agent-sync-overlay)' },
      valuesByMode: { Default: { alias: overlay } },
    });
    return model;
  };

  it("a change like today's (10 descriptions + 2 creates) fits in 45,000 chars and lands in one call", async () => {
    const s = await pending({ base: real, edit: todayLike });
    expect(s.built.line).toBe('updated 10 · created 2 · deleted 0');
    expect(s.built.chars, `delta.js is ${s.built.chars} chars`).toBeLessThanOrEqual(45000);
    const read = await runDelta(s.built.text, s.figma);
    expect(read.page, 'the receipt comes back inline').toBe(0);
    expect(ingest(s.root, [read]).checksum).toBe(JSON.parse(read.head).post);
    expect(committedPlanLine(s)).toBe(NOTHING_LINE);
  });

  it('the 19-variable Primitives space/* rename (hds#206 item 2) returns at most 15,000 chars, inline', async () => {
    const spaces = collectionOf(real, 'primitive').variables.filter((v) =>
      v.name.startsWith('space/'),
    );
    expect(
      spaces,
      'the case hds#397 measured: re-point this test if the space scale was renamed',
    ).toHaveLength(19);
    // Each step renamed to its pixel value, as TOKEN_MIGRATION.md would record it.
    const renames = Object.fromEntries(
      spaces.map((v) => [
        v.path,
        `primitive.space-px.${String(v.valuesByMode.Default.value).replace('.', '_')}`,
      ]),
    );
    expect(new Set(Object.values(renames)).size).toBe(19);
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
    const s = await pending({ base: real, edit: renamed, renames });
    expect(s.built.line).toBe('updated 19 · created 0 · deleted 0');
    expect(s.built.chars).toBeLessThanOrEqual(45000);
    const read = await runDelta(s.built.text, s.figma);
    expect(JSON.stringify(read).length).toBeLessThanOrEqual(15000);
    expect(read.page, 'the receipt comes back inline').toBe(0);
    expect(ingest(s.root, [read]).checksum).toBe(JSON.parse(read.head).post);
    expect(committedPlanLine(s)).toBe(NOTHING_LINE);
  });
});

// ── The command ──────────────────────────────────────────────────────────────
describe('pnpm figma:push --delta', () => {
  /** A repo root whose committed snapshot is staging pushed from its tokens, before `edit` changed them. */
  const rootWithChange = async (edit) => {
    const root = tempRoot();
    const figma = await pushedStaging(fixtureModel());
    writeFileSync(snapshotPath(root), serializeSnapshotFile(await hdsRunSnapshot(figma)));
    const tokens = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
    edit(tokens);
    writeFileSync(join(root, 'hirobius.tokens.json'), JSON.stringify(tokens, null, 2));
    return { root, outDir: join(root, 'figma', 'push') };
  };
  const whiteRewritten = (tokens) => {
    const white = JSON.stringify(tokens).match(
      /"white":\{"\$value":"#ffffff","\$description":"Pure white\."\}/,
    );
    expect(white, 'the fixture still has primitive white').not.toBeNull();
    const walk = (node) => {
      if (node && typeof node === 'object') {
        if (node.$description === 'Pure white.') node.$description = 'Pure white, "#fff".';
        Object.values(node).forEach(walk);
      }
    };
    walk(tokens);
  };

  it('writes the carriers and figma/push/use-figma/delta.js, and prints its size and the next step', async () => {
    const { root, outDir } = await rootWithChange(whiteRewritten);
    const result = writeDeltaScript({ root, outDir, commit: COMMIT });
    expect(result.line).toBe('updated 1 · created 0 · deleted 0');
    const path = join(outDir, 'use-figma', 'delta.js');
    expect(readFileSync(path, 'utf8')).toBe(result.text);
    expect(readdirSync(join(outDir, 'use-figma'))).toEqual(
      expect.arrayContaining(['delta.js', 'receipt.js', 'snapshot.js']),
    );
    const out = formatDeltaRun(result);
    expect(out).toContain(
      `figma/push/use-figma/delta.js (${result.chars.toLocaleString('en-US')} of 45,000 chars)`,
    );
    expect(out).toContain('updated 1 · created 0 · deleted 0');
    expect(out).toContain('update variable primitive.color.neutral.white: description');
    expect(out).toMatch(/use_figma.*staging.*figma\/README\.md "Agent sync \(zero clicks\)"/s);
  });

  it('refuses, leaving no delta.js (not even an earlier one), when Sync must do it', async () => {
    const { root, outDir } = await rootWithChange(whiteRewritten);
    writeDeltaScript({ root, outDir, commit: COMMIT });
    rmSync(snapshotPath(root));
    expect(() => writeDeltaScript({ root, outDir, commit: COMMIT })).toThrow(/Route it to Sync/);
    expect(existsSync(join(outDir, 'use-figma', 'delta.js'))).toBe(false);
    expect(existsSync(join(outDir, 'use-figma', 'receipt.js'))).toBe(true);
  });

  it('says there is nothing to sync, and writes no delta.js, when staging holds the model', async () => {
    const { root, outDir } = await rootWithChange(() => {});
    const result = writeDeltaScript({ root, outDir, commit: COMMIT });
    expect(result.text).toBeNull();
    expect(existsSync(join(outDir, 'use-figma', 'delta.js'))).toBe(false);
    expect(formatDeltaRun(result)).toMatch(/nothing to sync/);
  });
});

// ── What delta.js carries ────────────────────────────────────────────────────
describe('figma-agent-runtime.mjs can be copied into delta.js', () => {
  const source = readFileSync(join(REPO, 'scripts', 'lib', 'figma-agent-runtime.mjs'), 'utf8');

  it('holds only exported functions and its imports of the runtime, the codec and the Sync runtime, in ES2020', () => {
    const allowed = [
      './figma-runtime.mjs',
      './figma-snapshot-delta.mjs',
      './figma-sync-runtime.mjs',
    ];
    const ast = parse(source, { ecmaVersion: 2020, sourceType: 'module' });
    const offenders = ast.body
      .filter((node) =>
        node.type === 'ImportDeclaration'
          ? !allowed.includes(node.source.value)
          : node.type !== 'ExportNamedDeclaration' ||
            node.declaration?.type !== 'FunctionDeclaration',
      )
      .map((node) => source.slice(node.start, node.end).split('\n')[0]);
    expect(offenders).toEqual([]);
  });

  it('becomes a plain script without export, import or comments', () => {
    const script = agentRuntimeSource();
    expect(script).not.toMatch(/^\s*(export|import)\b/m);
    const comments = [];
    parse(script, { ecmaVersion: 2020, sourceType: 'script', onComment: comments });
    expect(comments).toEqual([]);
  });

  it('delta.js carries the apply, plan, read and font engine, the codec and the receipt writer, and nothing that needs a plugin window', async () => {
    const { built } = await pending();
    const carried = built.text.match(/^hdsVerifyRuntime\(\[([^\]]*)\]/m)[1].split(', ');
    for (const name of [
      'hdsApply',
      'hdsPlan',
      'hdsReadState',
      'hdsFontPreflight',
      'snapshotDelta',
      'applySnapshotDelta',
      'hdsSyncReceipt',
      'hdsSyncWriteReceipt',
      'hdsAgentDecode',
      'hdsAgentRun',
    ]) {
      expect(carried).toContain(name);
    }
    for (const name of [
      'hdsRunPush',
      'hdsRunSnapshot',
      'hdsSyncMain',
      'hdsSyncAsk',
      'hdsSyncStamp',
    ]) {
      expect(carried).not.toContain(name);
    }
    expect(built.text).not.toMatch(/CompressionStream|figma\.ui|loadAllPagesAsync|setPluginData\(/);
  });
});
