/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The snapshot delta codec (scripts/lib/figma-snapshot-delta.mjs, hds#417):
 * the Sync plugin writes `snapshotDelta(base, post)` into the receipt pages,
 * and `pnpm figma:snapshot --from-receipt` rebuilds the snapshot with
 * `applySnapshotDelta(base, delta)`. The rebuilt snapshot must hash to the
 * plugin's `post` checksum, so the round trip has to be byte-identical.
 *
 * Seams: the two pure functions, real committed snapshots (pinned as gzipped
 * fixtures, so the size asserts do not move when figma/snapshot.json does),
 * and the module source copied into the plugin's code.js.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync, gzipSync } from 'zlib';
import { parse } from 'acorn';
import { applySnapshotDelta, snapshotDelta } from '../lib/figma-snapshot-delta.mjs';
import { parseSnapshotFile } from '../lib/figma-snapshot.mjs';
import { hdsByName, hdsChecksum } from '../lib/figma-runtime.mjs';
import { deltaRuntimeSource } from '../lib/figma-scripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures', 'figma-sync');
/** figma/snapshot.json exactly as committed at `commit`, checksum verified. */
const committedSnapshot = (commit) =>
  parseSnapshotFile(
    gunzipSync(readFileSync(join(FIXTURES, `snapshot-${commit}.json.gz`))).toString('utf8'),
  );
const copy = (value) => JSON.parse(JSON.stringify(value));
const roundTrips = (base, post) => {
  const delta = snapshotDelta(base, post);
  const text = JSON.stringify(delta);
  // The delta travels as text: rebuild from what the pages would hold.
  const rebuilt = applySnapshotDelta(base, JSON.parse(text));
  return { delta, text, same: JSON.stringify(rebuilt) === JSON.stringify(post) };
};
/** Base64 of gzip at level 6: CompressionStream's default level, in Chrome and in Node. */
const gzipChars = (text) => gzipSync(text, { level: 6 }).toString('base64').length;
const PAGE_CHARS = 15000;
const RAW_CHARS = 12000;

const BEFORE_PRUNE = committedSnapshot('74bfb21');
const AFTER_PRUNE = committedSnapshot('150cbe3');

describe('the pinned fixtures are the committed snapshots', () => {
  it('74bfb21 and 150cbe3 verify against the checksums main recorded', () => {
    expect(BEFORE_PRUNE.checksum).toBe('cd1b6c37');
    expect(AFTER_PRUNE.checksum).toBe('50d3fa5e');
  });
});

// ── Property: 200 random edits round-trip byte-identically ───────────────────
/** mulberry32: a seeded PRNG, so a failure names a run that can be replayed. */
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Random edits that keep a snapshot shaped the way hdsReadState reads one:
 * variables and styles sorted by name, an alias's `to` naming its target,
 * every variable holding one value per mode of its collection.
 */
function editor(random) {
  let serial = 0;
  const pick = (list) => list[Math.floor(random() * list.length)];
  const allVariables = (s) => s.collections.flatMap((c) => c.variables.map((v) => ({ c, v })));
  const resort = (s) => {
    s.collections.forEach((c) => c.variables.sort(hdsByName));
    s.textStyles.sort(hdsByName);
    s.effectStyles.sort(hdsByName);
  };
  /** Every alias's `to` from its target's current name, as hdsReadState writes it. */
  const relink = (s) => {
    const byId = new Map(allVariables(s).map(({ c, v }) => [v.id, `${c.name}: ${v.name}`]));
    allVariables(s).forEach(({ v }) =>
      Object.values(v.valuesByMode).forEach((entry) => {
        if (entry && 'alias' in entry) entry.to = byId.get(entry.alias) ?? null;
      }),
    );
  };
  const newVariable = (c, template) => {
    serial += 1;
    const v = copy(template);
    v.id = `VariableID:9000:${serial}`;
    v.name = `property/new-${serial}`;
    v.path = `semantic.property.new-${serial}`;
    v.description = `Added by edit ${serial}.`;
    v.valuesByMode = Object.fromEntries(c.modes.map((m) => [m, { value: serial }]));
    v.resolvedType = 'FLOAT';
    return v;
  };
  const kinds = {
    'create variable': (s) => {
      const c = pick(s.collections);
      c.variables.push(newVariable(c, pick(allVariables(s)).v));
    },
    'rename variable': (s) => {
      const { v } = pick(allVariables(s));
      serial += 1;
      v.name = `${v.name}-r${serial}`;
    },
    'revalue variable': (s) => {
      const { c, v } = pick(allVariables(s));
      const mode = pick(c.modes);
      const entry = v.valuesByMode[mode];
      if (entry && typeof entry.value === 'number') entry.value += 1;
      else if (entry && entry.value && typeof entry.value === 'object') entry.value.r = random();
      else if (entry && typeof entry.value === 'string') entry.value += ' edited';
      else {
        const target = pick(allVariables(s).filter((x) => x.v.id !== v.id));
        v.valuesByMode[mode] = { alias: target.v.id, to: null };
      }
    },
    'describe variable': (s) => {
      pick(allVariables(s)).v.description = `Description ${(serial += 1)}.`;
    },
    'delete variable': (s) => {
      const c = pick(s.collections.filter((x) => x.variables.length));
      c.variables.splice(Math.floor(random() * c.variables.length), 1);
    },
    'new collection': (s) => {
      serial += 1;
      const c = {
        id: `VariableCollectionId:9000:${serial}`,
        name: `Hirobius/Property${serial}`,
        key: null,
        hiddenFromPublishing: false,
        defaultMode: 'Default',
        modes: ['Default'],
        variables: [],
      };
      const template = pick(allVariables(s)).v;
      c.variables.push(newVariable(c, template), newVariable(c, template));
      s.collections.push(c);
    },
    'rename collection': (s) => {
      pick(s.collections).name += ` ${(serial += 1)}`;
    },
    'rename mode': (s) => {
      const c = pick(s.collections);
      const at = Math.floor(random() * c.modes.length);
      const old = c.modes[at];
      const next = `${old}-m${(serial += 1)}`;
      c.modes[at] = next;
      if (c.defaultMode === old) c.defaultMode = next;
      c.variables.forEach((v) => {
        v.valuesByMode = Object.fromEntries(
          c.modes.map((m) => [m, m === next ? v.valuesByMode[old] : v.valuesByMode[m]]),
        );
      });
    },
    'remove or add a mode': (s) => {
      const multi = s.collections.filter((c) => c.modes.length > 1);
      if (multi.length) {
        const c = pick(multi);
        const gone = c.modes.splice(Math.floor(random() * c.modes.length), 1)[0];
        if (c.defaultMode === gone) c.defaultMode = c.modes[0];
        c.variables.forEach((v) => delete v.valuesByMode[gone]);
        return;
      }
      const c = pick(s.collections);
      const mode = `Added${(serial += 1)}`;
      c.modes.push(mode);
      c.variables.forEach((v) => (v.valuesByMode[mode] = copy(v.valuesByMode[c.modes[0]])));
    },
    'text style edit': (s) => {
      const style = pick(s.textStyles);
      const field = pick(['fontSize', 'description', 'name', 'binding']);
      if (field === 'fontSize') style.fontSize += 1;
      else if (field === 'description') style.description = `Text ${(serial += 1)}.`;
      else if (field === 'name') style.name = `typography/renamed-${(serial += 1)}`;
      else delete style.boundVariables[pick(Object.keys(style.boundVariables).concat('none'))];
    },
    'effect style edit': (s) => {
      const style = pick(s.effectStyles);
      if (style.effects.length && random() < 0.5) style.effects[0].radius = serial += 1;
      else
        style.effects.push({
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 1 },
          radius: 2,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
          showShadowBehindNode: false,
        });
    },
    'create or delete a style': (s) => {
      if (random() < 0.5 && s.textStyles.length > 1) {
        s.textStyles.splice(Math.floor(random() * s.textStyles.length), 1);
        return;
      }
      const style = copy(pick(s.effectStyles));
      style.id = `S:${(serial += 1)},`;
      style.name = `elevation/new-${serial}`;
      s.effectStyles.push(style);
    },
    'push stamp': (s) => {
      s.lastPush = {
        modelHash: hdsChecksum(String(serial)),
        pushedAt: `t${(serial += 1)}`,
        scope: null,
      };
      s.takenAt = `2026-10-01T00:00:${String(serial % 60).padStart(2, '0')}.000Z`;
    },
  };
  return {
    kinds,
    edit(snapshot) {
      const next = copy(snapshot);
      const used = [];
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const name = pick(Object.keys(kinds));
        kinds[name](next);
        used.push(name);
      }
      relink(next);
      resort(next);
      return { next, used };
    },
  };
}

describe('snapshotDelta / applySnapshotDelta', () => {
  it('round-trips 200 random edits byte-identically, as a delta and never as the full snapshot', () => {
    const random = prng(417);
    const { kinds, edit } = editor(random);
    const seen = Object.fromEntries(Object.keys(kinds).map((k) => [k, 0]));
    let state = copy(AFTER_PRUNE.snapshot);
    for (let run = 0; run < 200; run++) {
      const { next, used } = edit(state);
      used.forEach((name) => (seen[name] += 1));
      const { delta, same } = roundTrips(state, next);
      expect(same, `run ${run} (${used.join(', ')}) did not round-trip`).toBe(true);
      expect(
        'full' in delta,
        `run ${run} (${used.join(', ')}) fell back to the full snapshot`,
      ).toBe(false);
      state = next;
    }
    for (const [name, count] of Object.entries(seen)) {
      expect(count, `no run made a "${name}" edit`).toBeGreaterThan(0);
    }
  });

  it('is empty when nothing changed, and applying it changes nothing', () => {
    const base = AFTER_PRUNE.snapshot;
    expect(snapshotDelta(base, copy(base))).toEqual({});
    expect(JSON.stringify(applySnapshotDelta(base, {}))).toBe(JSON.stringify(base));
  });

  it('carries only the fields that changed, keyed by id', () => {
    const base = AFTER_PRUNE.snapshot;
    const post = copy(base);
    post.collections[1].variables[0].description = 'Changed.';
    const id = post.collections[1].variables[0].id;
    expect(snapshotDelta(base, post)).toEqual({
      variables: { [post.collections[1].id]: { put: { [id]: { description: 'Changed.' } } } },
    });
  });

  it('round-trips the real prune push (74bfb21 → 150cbe3): updates, 38 deletes and a removed mode', () => {
    const { delta, same } = roundTrips(BEFORE_PRUNE.snapshot, AFTER_PRUNE.snapshot);
    expect(same).toBe(true);
    expect('full' in delta).toBe(false);
  });

  it('falls back to the full snapshot when there is no base or the shape is not a snapshot', () => {
    const post = AFTER_PRUNE.snapshot;
    for (const base of [null, { schemaVersion: 1 }, { ...post, extra: true }]) {
      const delta = snapshotDelta(base, post);
      expect(delta).toEqual({ full: post });
      expect(JSON.stringify(applySnapshotDelta(base, delta))).toBe(JSON.stringify(post));
    }
  });

  it('does not change its inputs', () => {
    const base = copy(BEFORE_PRUNE.snapshot);
    const post = copy(AFTER_PRUNE.snapshot);
    const delta = snapshotDelta(base, post);
    const deltaText = JSON.stringify(delta);
    applySnapshotDelta(base, delta);
    expect(hdsChecksum(JSON.stringify(base))).toBe(BEFORE_PRUNE.checksum);
    expect(hdsChecksum(JSON.stringify(post))).toBe(AFTER_PRUNE.checksum);
    expect(JSON.stringify(delta)).toBe(deltaText);
  });
});

// ── Sizes: what a receipt costs in pages (hds#397 §3) ────────────────────────
describe('receipt sizes, at gzip level 6 (CompressionStream default)', () => {
  /** The 2026-10-01 push against 150cbe3: 2 creates and 10 description updates. */
  const todaysPost = () => {
    const edits = JSON.parse(readFileSync(join(FIXTURES, 'edits-2026-10-01.json'), 'utf8'));
    const post = copy(AFTER_PRUNE.snapshot);
    post.takenAt = edits.takenAt;
    post.lastPush = edits.lastPush;
    for (const { collection, record } of edits.creates) {
      const c = post.collections.find((x) => x.id === collection);
      c.variables.push(record);
      c.variables.sort(hdsByName);
    }
    for (const c of post.collections) {
      for (const v of c.variables) {
        if (v.id in edits.descriptions) v.description = edits.descriptions[v.id];
      }
    }
    return post;
  };

  it("today's delta (2 creates + 10 description updates) is at most 3,000 chars raw: 1 raw page", () => {
    const { text, same } = roundTrips(AFTER_PRUNE.snapshot, todaysPost());
    expect(same).toBe(true);
    expect(text.length).toBeLessThanOrEqual(3000);
  });

  it('the 74bfb21 → 150cbe3 delta (the prune push) is 1 page, and 1 page once gzipped', () => {
    const { text } = roundTrips(BEFORE_PRUNE.snapshot, AFTER_PRUNE.snapshot);
    // The plugin's rule: raw JSON up to 12,000 chars, else gzip + base64.
    const pageText = text.length <= RAW_CHARS ? text : 'x'.repeat(gzipChars(text));
    expect(Math.ceil(pageText.length / PAGE_CHARS)).toBe(1);
    // And gzipped whatever its raw size (8,409 raw chars, 1,536 gzipped on 2026-10-01).
    expect(gzipChars(text)).toBeLessThanOrEqual(PAGE_CHARS);
  });

  it('the full 150cbe3 snapshot (no base) is at most 2 pages once gzipped', () => {
    // 164,703 chars raw → 24,640 base64 chars at level 6 on 2026-10-01: 2 pages
    // with 5,360 chars of headroom (the snapshot can grow about 21%). Past
    // 30,000 chars it takes a 3rd page: one more use_figma read, not a failure.
    const text = JSON.stringify(snapshotDelta(null, AFTER_PRUNE.snapshot));
    expect(gzipChars(text)).toBeLessThanOrEqual(2 * PAGE_CHARS);
  });

  it("Node's CompressionStream gzips at level 6, the level these asserts use", async () => {
    const text = JSON.stringify(snapshotDelta(BEFORE_PRUNE.snapshot, AFTER_PRUNE.snapshot));
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = Buffer.from(await new Response(stream).arrayBuffer());
    expect(gunzipSync(bytes).toString('utf8')).toBe(text);
    expect(Math.abs(bytes.length - gzipSync(text, { level: 6 }).length)).toBeLessThanOrEqual(16);
  });
});

describe('figma-snapshot-delta.mjs can be copied into the Sync plugin', () => {
  const source = readFileSync(join(HERE, '..', 'lib', 'figma-snapshot-delta.mjs'), 'utf8');

  it('holds only exported functions and its one import of figma-runtime.mjs, in ES2020', () => {
    const ast = parse(source, { ecmaVersion: 2020, sourceType: 'module' });
    const offenders = ast.body
      .filter((node) =>
        node.type === 'ImportDeclaration'
          ? node.source.value !== './figma-runtime.mjs'
          : node.type !== 'ExportNamedDeclaration' ||
            node.declaration?.type !== 'FunctionDeclaration',
      )
      .map((node) => source.slice(node.start, node.end).split('\n')[0]);
    expect(offenders).toEqual([]);
  });

  it('becomes a plain script without export, import or comments', () => {
    const script = deltaRuntimeSource();
    expect(script).not.toMatch(/^\s*(export|import)\b/m);
    const comments = [];
    parse(script, { ecmaVersion: 2020, sourceType: 'script', onComment: comments });
    expect(comments).toEqual([]);
    expect(script).toContain('function snapshotDelta(');
    expect(script).toContain('function applySnapshotDelta(');
  });
});
