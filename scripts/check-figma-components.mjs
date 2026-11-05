#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-figma-components.mjs — code <-> Figma COMPONENT parity (piloted on Button).
 *
 * Code is truth. The contract (figma/contracts/<Name>.json) is GENERATED from the
 * component source and its spec sheet (figma/spec-sheets/<Name>.json); never edit it
 * by hand. It describes the condensed Figma shape the component should have:
 *   - variant axes only for Variant x Size x State (rest, hover, pressed, disabled);
 *   - tone as a variable-mode collection, not a variant axis;
 *   - loading and focus as boolean properties;
 *   - icon-only as its own component, IconButton (owner decision 2026-11-05): Button's
 *     Variant axis minus link, a square root bound to button/size/<s>/height with padding 0,
 *     an "Icon" layer bound to button/size/<s>/iconSize; same tone modes. No Figma node yet;
 *   - every Figma property mapped to a code prop;
 *   - size-driven variable bindings on the key layers (root, lead icon).
 *
 * The Figma side is a committed snapshot (figma/components/<Name>.snapshot.json),
 * taken read-only with the generated use_figma script, the same way
 * figma/push/use-figma/snapshot-diff.js re-bases figma/snapshot.json: the script
 * embeds the committed snapshot's checksum and returns `{ unchanged: true }` when
 * Figma still matches, or the full new snapshot when it does not.
 *
 * Usage:
 *   node scripts/check-figma-components.mjs --check        exit 1 on a stale contract or any mismatch
 *   node scripts/check-figma-components.mjs --report       same output, exit 0 (advisory; wired into pretest)
 *   node scripts/check-figma-components.mjs --write        regenerate figma/contracts/*.json from code
 *   node scripts/check-figma-components.mjs --emit-script  write figma/push/use-figma/component-snapshot-<Name>.js
 *   node scripts/check-figma-components.mjs --ingest <file> [--component Button]
 *                                                          verify and write the snapshot use_figma returned
 *   --root <dir>   read inputs from <dir> instead of the repo (fixtures/tests)
 *
 * Advisory until the condensed Figma Button lands; then pretest switches --report to --check.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hdsChecksum } from './lib/figma-runtime.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Components under parity. Each entry names its source and Figma node. */
export const COMPONENTS = Object.freeze({
  Button: {
    source: 'src/app/components/button.tsx',
    specSheet: 'figma/spec-sheets/Button.json',
    nodeId: '28:138',
  },
  // <Button iconOnly> in code. nodeId is null until it is drawn in the library.
  IconButton: {
    source: 'src/app/components/button.tsx',
    specSheet: 'figma/spec-sheets/Button.json',
    nodeId: null,
    shape: 'iconOnly',
  },
});

/** Code interaction state -> the class prefix that proves the code has it, and its Figma value. */
const STATES = [
  ['rest', null],
  ['hover', 'hover:'],
  ['pressed', 'active:'],
  ['disabled', 'disabled:'],
];

const SCRIPT_MAX_CHARS = 40000;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const stable = (v) =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, stable(v[k])]),
        )
      : v;
const pretty = (v) => JSON.stringify(v, null, 2) + '\n';
/** `component.button.size.md.height` -> `button/size/md/height` (the library's variable names). */
const tokenToVariable = (token) => token.replace(/^component\./, '').replaceAll('.', '/');

// ── Contract (generated from code) ──────────────────────────────────────────

export function buildContract(name, { root = REPO } = {}) {
  const def = COMPONENTS[name];
  if (!def) throw new Error(`No parity definition for ${name}.`);
  const source = readFileSync(join(root, def.source), 'utf8');
  const sheet = readJson(join(root, def.specSheet));
  const prop = (n) => {
    const p = sheet.props.find((x) => x.name === n);
    if (!p)
      throw new Error(
        `${def.specSheet} has no prop "${n}"; regenerate it (pnpm figma:spec-sheets).`,
      );
    return p;
  };
  // Enum values come from the spec sheet (itself generated from the cva); order is code's cva order.
  const cvaOrder = (key, values) => {
    const block = source.match(new RegExp(`\\n\\s{6}${key}: \\{([\\s\\S]*?)\\n\\s{6}\\},`));
    if (!block) throw new Error(`${def.source}: no cva "${key}" block found.`);
    const keys = [...block[1].matchAll(/^\s{8}([a-z]+):/gm)].map((m) => m[1]);
    const missing = values.filter((v) => !keys.includes(v));
    if (missing.length) throw new Error(`${def.source}: cva ${key} lacks ${missing.join(', ')}.`);
    return keys.filter((k) => values.includes(k));
  };
  const variants = cvaOrder('variant', prop('variant').values);
  const sizes = cvaOrder('size', prop('size').values);
  const tones = cvaOrder('tone', prop('tone').values);
  for (const p of ['iconOnly', 'loading', 'iconLeft', 'iconRight', 'label', 'disabled']) prop(p);

  const states = STATES.filter(([, prefix]) => prefix === null || source.includes(prefix)).map(
    ([s]) => s,
  );
  if (!source.includes('focus-visible:'))
    throw new Error(`${def.source}: no focus-visible styling.`);

  const bindings = {};
  for (const { size, values } of sheet.sizes) {
    const v = (k) => tokenToVariable(values[k].token);
    bindings[size] = {
      'root.height': v('height'),
      'root.paddingLeft': v('paddingX'),
      'root.paddingRight': v('paddingX'),
      'root.itemSpacing': v('itemSpacing'),
      'Lead Icon.width': v('iconSize'),
    };
  }

  // A variant whose code sets px-0 (link) has no horizontal padding to bind.
  const zeroPadX = [
    ...source.matchAll(/\{\s*variant: '([a-z]+)',\s*className:\s*'([^']*)',?\s*\}/g),
  ]
    .filter((m) => m[2].split(/\s+/).includes('px-0'))
    .map((m) => m[1]);
  const modeCollections = { 'Button tone': { prop: 'tone', modes: tones } };
  const comment = `GENERATED by scripts/check-figma-components.mjs --write from ${def.source} and ${def.specSheet}. Do not edit by hand.`;

  if (def.shape === 'iconOnly') {
    // A link with no label and no fill does not read as a link: no link variant.
    const iconVariants = variants.filter((v) => v !== 'link');
    const iconBindings = {};
    for (const { size, values } of sheet.sizes) {
      const v = (k) => tokenToVariable(values[k].token);
      iconBindings[size] = {
        'root.width': v('height'),
        'root.height': v('height'),
        'Icon.width': v('iconSize'),
        'Icon.height': v('iconSize'),
      };
    }
    return stable({
      $comment: comment,
      component: name,
      nodeId: def.nodeId,
      code: '<Button iconOnly label="…" iconLeft={…} />',
      variantAxes: {
        Variant: { prop: 'variant', values: iconVariants },
        Size: { prop: 'size', values: sizes },
        State: { prop: 'interaction state (:hover, :active, disabled)', values: states },
      },
      variantCount: iconVariants.length * sizes.length * states.length,
      booleans: {
        Loading: { prop: 'loading', default: false },
        Focus: { prop: ':focus-visible', default: false },
      },
      instanceSwaps: { Icon: { prop: 'iconLeft' } },
      texts: {},
      modeCollections,
      sizeBindings: iconBindings,
      rootPadding: 0,
      unboundRootFills: [],
    });
  }

  return stable({
    zeroPaddingXVariants: zeroPadX,
    $comment: comment,
    component: name,
    nodeId: def.nodeId,
    variantAxes: {
      Variant: { prop: 'variant', values: variants },
      Size: { prop: 'size', values: sizes },
      State: {
        prop: 'interaction state (:hover, :active, disabled)',
        values: states,
      },
    },
    variantCount: variants.length * sizes.length * states.length,
    booleans: {
      Loading: { prop: 'loading', default: false },
      Focus: { prop: ':focus-visible', default: false },
      'Show icon': { prop: 'iconLeft', default: false },
      'Show trail icon': { prop: 'iconRight', default: false },
    },
    instanceSwaps: {
      Icon: { prop: 'iconLeft' },
      'Trail Icon': { prop: 'iconRight' },
    },
    texts: { Label: { prop: 'label' } },
    modeCollections,
    sizeBindings: bindings,
    unboundRootFills: [],
  });
}

// ── Diff ─────────────────────────────────────────────────────────────────────

const sameList = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

/** Every way the snapshot differs from the contract, one human line each. Empty = parity. */
export function diffContract(contract, snap) {
  const out = [];
  const ca = contract.variantAxes;
  const sa = snap.variantAxes || {};
  for (const axis of Object.keys(ca)) {
    if (!sa[axis]) out.push(`variant axis "${axis}" (code: ${ca[axis].prop}) is missing`);
    else if (!sameList(ca[axis].values, sa[axis]))
      out.push(
        `variant axis "${axis}" values differ: contract [${ca[axis].values.join(', ')}], Figma [${sa[axis].join(', ')}]`,
      );
  }
  for (const axis of Object.keys(sa))
    if (!ca[axis])
      out.push(`extra variant axis "${axis}" [${sa[axis].join(', ')}] maps to no contract axis`);
  if (snap.variantCount !== contract.variantCount)
    out.push(`variant count: contract ${contract.variantCount}, Figma ${snap.variantCount}`);

  const kinds = [
    ['booleans', 'boolean'],
    ['instanceSwaps', 'instance-swap'],
    ['texts', 'text'],
  ];
  for (const [key, label] of kinds) {
    const want = contract[key];
    const have = snap[key] || {};
    for (const n of Object.keys(want)) {
      if (!(n in have)) out.push(`${label} property "${n}" (code: ${want[n].prop}) is missing`);
      else if ('default' in want[n] && have[n] !== want[n].default)
        out.push(`${label} property "${n}" default: contract ${want[n].default}, Figma ${have[n]}`);
    }
    for (const n of Object.keys(have))
      if (!(n in want)) out.push(`extra ${label} property "${n}" maps to no code prop`);
  }

  const haveCols = snap.modeCollections || {};
  for (const [n, c] of Object.entries(contract.modeCollections)) {
    if (!haveCols[n]) out.push(`variable-mode collection "${n}" (code: ${c.prop}) is missing`);
    else if (!sameList(c.modes, haveCols[n]))
      out.push(
        `collection "${n}" modes: contract [${c.modes.join(', ')}], Figma [${haveCols[n].join(', ')}]`,
      );
  }

  const haveB = snap.sizeBindings || {};
  for (const [size, fields] of Object.entries(contract.sizeBindings)) {
    for (const [field, variable] of Object.entries(fields)) {
      const got = haveB[size]?.[field];
      if (!got || !sameList([variable], got))
        out.push(
          `Size=${size} ${field} binding: contract ${variable}, Figma ${got && got.length ? got.join(' | ') : '(unbound)'}`,
        );
    }
  }
  if ('rootPadding' in contract && snap.rootPadding !== contract.rootPadding)
    out.push(
      `root padding: contract ${contract.rootPadding}, Figma ${snap.rootPadding ?? '(unknown)'}`,
    );
  const unbound = snap.unboundRootFills || [];
  if (unbound.length)
    out.push(
      `${unbound.length} variant(s) have a root fill not bound to a variable, e.g. ${unbound.slice(0, 3).join('; ')}`,
    );
  return out;
}

// ── Snapshot script (use_figma, read only) ───────────────────────────────────

export function buildSnapshotScript(name, { root = REPO } = {}) {
  const def = COMPONENTS[name];
  if (!def.nodeId)
    throw new Error(
      `${name} is not drawn in the library yet (no nodeId); draw it from figma/contracts/${name}.json first.`,
    );
  const links = readJson(join(root, 'figma/links.json'));
  const retired = (links.retiredFiles || []).map((f) => f.fileKey);
  const snapPath = join(root, 'figma/components', `${name}.snapshot.json`);
  const zeroPadX = buildContract(name, { root }).zeroPaddingXVariants;
  const committed = existsSync(snapPath) ? readJson(snapPath).checksum : null;
  const script = `// HDS component snapshot for ${name}. Generated by scripts/check-figma-components.mjs --emit-script; run it unmodified.
// Reads only. Save the returned JSON, then: node scripts/check-figma-components.mjs --ingest <file> --component ${name}
if (figma.fileKey !== '${links.libraryFileKey}' || ${JSON.stringify(retired)}.indexOf(figma.fileKey) !== -1) {
  throw new Error('Refused: this is not the HDS library (${links.libraryFileKey}). Nothing was read or written.');
}
const COMMITTED = ${JSON.stringify(committed)};
const ZERO_PAD_X = ${JSON.stringify(zeroPadX)};
${hdsChecksum.toString()}
const stable = ${stable.toString().replace(/\bstable\b/g, 'stable')};
const set = await figma.getNodeByIdAsync('${def.nodeId}');
if (!set || set.type !== 'COMPONENT_SET') throw new Error('${def.nodeId} is not a component set.');
const clean = (k) => k.replace(/#[^#]*$/, '');
const snap = { component: '${name}', nodeId: set.id, variantAxes: {}, booleans: {}, instanceSwaps: {}, texts: {}, modeCollections: {}, sizeBindings: {}, unboundRootFills: [] };
for (const [k, d] of Object.entries(set.componentPropertyDefinitions)) {
  if (d.type === 'VARIANT') snap.variantAxes[k] = d.variantOptions;
  else if (d.type === 'BOOLEAN') snap.booleans[clean(k)] = d.defaultValue;
  else if (d.type === 'INSTANCE_SWAP') snap.instanceSwaps[clean(k)] = true;
  else if (d.type === 'TEXT') snap.texts[clean(k)] = true;
}
snap.variantCount = set.children.length;
for (const c of await figma.variables.getLocalVariableCollectionsAsync())
  if (/tone/i.test(c.name)) snap.modeCollections[c.name] = c.modes.map((m) => m.name);
const names = {};
const varName = async (a) => { if (!a) return null; if (!(a.id in names)) { const v = await figma.variables.getVariableByIdAsync(a.id); names[a.id] = v ? v.name : '(missing ' + a.id + ')'; } return names[a.id]; };
const add = (size, field, n) => { const s = (snap.sizeBindings[size] = snap.sizeBindings[size] || {}); const l = (s[field] = s[field] || []); if (l.indexOf(n) === -1) l.push(n); };
for (const v of set.children) {
  const size = (v.variantProperties || {}).Size || '?';
  const bv = v.boundVariables || {};
  const zeroPad = ZERO_PAD_X.indexOf(String((v.variantProperties || {}).Variant).toLowerCase()) !== -1;
  for (const f of ['height', 'paddingLeft', 'paddingRight', 'itemSpacing']) if (!(zeroPad && /^padding/.test(f))) add(size, 'root.' + f, (await varName(bv[f])) || '(unbound)');
  const icon = v.findOne((n) => n.name === 'Lead Icon');
  add(size, 'Lead Icon.width', (icon && (await varName((icon.boundVariables || {}).width))) || '(unbound)');
  const fills = Array.isArray(v.fills) ? v.fills.filter((p) => p.visible !== false) : [];
  if (fills.length && !(bv.fills && bv.fills.length)) snap.unboundRootFills.push(v.name);
}
for (const s of Object.values(snap.sizeBindings)) for (const k of Object.keys(s)) s[k].sort();
const out = stable(snap);
const checksum = hdsChecksum(JSON.stringify(out));
if (checksum === COMMITTED) return { unchanged: true, checksum };
return { snapshot: out, checksum };
`;
  if (script.length > SCRIPT_MAX_CHARS)
    throw new Error(
      `use_figma script is ${script.length} chars, over the ${SCRIPT_MAX_CHARS} limit.`,
    );
  return script;
}

/** Verify what use_figma returned and the committed-file form of it. */
export function ingestResult(result) {
  if (result.unchanged) return null;
  if (!result.snapshot || !result.checksum) throw new Error('Not a component snapshot result.');
  const got = hdsChecksum(JSON.stringify(stable(result.snapshot)));
  if (got !== result.checksum)
    throw new Error(
      `Checksum mismatch (${got} != ${result.checksum}): save the use_figma result unedited.`,
    );
  return { checksum: result.checksum, snapshot: stable(result.snapshot) };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export function run(argv, { log = console.log, error = console.error } = {}) {
  const arg = (f) => {
    const i = argv.indexOf(f);
    return i === -1 ? null : argv[i + 1];
  };
  const root = arg('--root') ? resolve(arg('--root')) : REPO;
  const names = arg('--component') ? [arg('--component')] : Object.keys(COMPONENTS);

  if (argv.includes('--write')) {
    for (const n of names) {
      mkdirSync(join(root, 'figma/contracts'), { recursive: true });
      writeFileSync(join(root, 'figma/contracts', `${n}.json`), pretty(buildContract(n, { root })));
      log(`wrote figma/contracts/${n}.json`);
    }
    return 0;
  }
  if (argv.includes('--emit-script')) {
    for (const n of names) {
      if (!COMPONENTS[n].nodeId && !arg('--component')) {
        log(`skipped ${n}: not drawn in the library yet (no nodeId)`);
        continue;
      }
      const p = join(root, 'figma/push/use-figma', `component-snapshot-${n}.js`);
      mkdirSync(dirname(p), { recursive: true });
      const s = buildSnapshotScript(n, { root });
      writeFileSync(p, s);
      log(`wrote ${p} (${s.length} chars)`);
    }
    return 0;
  }
  if (arg('--ingest')) {
    const n = names[0];
    const res = ingestResult(readJson(resolve(arg('--ingest'))));
    if (!res) {
      log(`${n}: Figma unchanged since the committed snapshot.`);
      return 0;
    }
    mkdirSync(join(root, 'figma/components'), { recursive: true });
    writeFileSync(join(root, 'figma/components', `${n}.snapshot.json`), pretty(res));
    log(`wrote figma/components/${n}.snapshot.json (${res.checksum})`);
    return 0;
  }

  const enforce = argv.includes('--check');
  let failed = false;
  for (const n of names) {
    const contract = buildContract(n, { root });
    const cPath = join(root, 'figma/contracts', `${n}.json`);
    // Compared as data, not text: lint-staged reformats committed JSON.
    if (
      !existsSync(cPath) ||
      JSON.stringify(stable(readJson(cPath))) !== JSON.stringify(contract)
    ) {
      error(
        `${n}: figma/contracts/${n}.json is stale or missing. Run: node scripts/check-figma-components.mjs --write`,
      );
      failed = true;
    }
    const sPath = join(root, 'figma/components', `${n}.snapshot.json`);
    if (!existsSync(sPath)) {
      error(
        COMPONENTS[n].nodeId === null
          ? `${n}: not drawn in the library yet; draw it from figma/contracts/${n}.json, then add its nodeId.`
          : `${n}: no Figma snapshot at figma/components/${n}.snapshot.json (--emit-script, run it, --ingest).`,
      );
      failed = true;
      continue;
    }
    const diffs = diffContract(contract, readJson(sPath).snapshot);
    if (diffs.length) {
      failed = true;
      error(`${n}: Figma differs from the code contract (${diffs.length}):`);
      for (const d of diffs) error(`  - ${d}`);
    } else log(`${n}: Figma matches the code contract.`);
  }
  if (failed && !enforce) log('check-figma-components: advisory (--report), not failing.');
  return failed && enforce ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv.slice(2));
}
