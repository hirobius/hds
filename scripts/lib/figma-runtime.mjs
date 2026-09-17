/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the code that runs inside Figma.
 *
 * `pnpm figma:push` and `pnpm figma:snapshot` (scripts/lib/figma-scripts.mjs)
 * copy this file's text, with `export ` removed, into a `use_figma` script or
 * a local development plugin. Node imports the same functions to plan a push
 * against a committed snapshot and to report drift, so the Figma side and the
 * repo side share one reader, one matcher and one diff.
 *
 * Rules for this file (scripts/__tests__/figma-runtime.test.mjs enforces them):
 *   - top level holds only `export function` / `export async function`
 *   - no imports, no module-level constants, no Node or browser globals
 *   - ES2020 syntax (the Figma plugin sandbox)
 *
 * Identity. A Figma variable, collection or style is matched to the model by
 * a stable key, strongest first: the token path stored as shared plugin data
 * (namespace "hirobius"), a TOKEN_MIGRATION.md rename of that path, the
 * variable's codeSyntax.WEB, then its name. Matching never crosses collections
 * or types, so a push updates what it owns (keeping ids, and with them every
 * binding) and creates only what is missing. Nothing is deleted unless the
 * payload asks for prune.
 */

// ── Primitives ───────────────────────────────────────────────────────────────
export function hdsNamespace() {
  return 'hirobius';
}

/** FNV-1a (32-bit) of a string, as 8 hex digits. Detects a corrupted payload or snapshot. */
export function hdsChecksum(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ('00000000' + hash.toString(16)).slice(-8);
}

/** Six decimals: below Figma's 32-bit float noise, far below an 8-bit color step. */
export function hdsRound(n) {
  const rounded = Math.round(n * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
}

export function hdsByName(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function hdsGetKey(node, key) {
  try {
    return node.getSharedPluginData(hdsNamespace(), key) || null;
  } catch (_error) {
    return null;
  }
}

export function hdsSetKey(node, key, value) {
  try {
    node.setSharedPluginData(hdsNamespace(), key, value || '');
    return true;
  } catch (_error) {
    return false;
  }
}

export function hdsNormalizeValue(raw) {
  if (typeof raw === 'number') return hdsRound(raw);
  if (raw && typeof raw === 'object' && typeof raw.r === 'number') {
    return {
      r: hdsRound(raw.r),
      g: hdsRound(raw.g),
      b: hdsRound(raw.b),
      a: hdsRound(typeof raw.a === 'number' ? raw.a : 1),
    };
  }
  return raw;
}

export function hdsNormalizeEffect(effect) {
  const out = { type: effect.type };
  if (effect.color) out.color = hdsNormalizeValue(effect.color);
  if (effect.offset) out.offset = { x: hdsRound(effect.offset.x), y: hdsRound(effect.offset.y) };
  if (typeof effect.radius === 'number') out.radius = hdsRound(effect.radius);
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    out.spread = hdsRound(effect.spread || 0);
  }
  out.visible = effect.visible !== false;
  if (effect.blendMode) out.blendMode = effect.blendMode;
  if (effect.type === 'DROP_SHADOW')
    out.showShadowBehindNode = Boolean(effect.showShadowBehindNode);
  return out;
}

/** Numbers within 1e-4 (relative above 1) count as equal: Figma stores 32-bit floats. */
export function hdsSameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-4 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => hdsSameValue(item, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a).concat(Object.keys(b).filter((k) => !(k in a)));
    return keys.every((k) => hdsSameValue(a[k], b[k]));
  }
  return a === b;
}

/** "#rrggbb" for a Figma RGB(A) color (alpha is not part of the hex). */
export function hdsHex(color) {
  const channel = (v) => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  return '#' + channel(color.r) + channel(color.g) + channel(color.b);
}

export function hdsSameSet(a, b) {
  return a.length === b.length && a.every((item) => b.indexOf(item) !== -1);
}

/**
 * The current path for an old one under TOKEN_MIGRATION.md renames. A rename of
 * a composite (semantic.typography.caption -> …eyebrow) carries its
 * sub-paths (…caption.font-size -> …eyebrow.font-size); chains are followed.
 */
export function hdsRenamedPath(path, renames) {
  if (!path || !renames) return null;
  let current = path;
  for (let hop = 0; hop < 16; hop++) {
    let old = null;
    Object.keys(renames).forEach((candidate) => {
      const covers = current === candidate || current.indexOf(candidate + '.') === 0;
      if (covers && (!old || candidate.length > old.length)) old = candidate;
    });
    if (!old) break;
    current = renames[old] + current.slice(old.length);
  }
  return current === path ? null : current;
}

// ── Read ─────────────────────────────────────────────────────────────────────
/**
 * The file's variables, text styles and effect styles, normalized: mode values
 * keyed by mode name, numbers rounded, aliases as the target id plus a readable
 * "Collection: name". This object is what `pnpm figma:snapshot` commits.
 */
export async function hdsReadState(figma) {
  const collections = (await figma.variables.getLocalVariableCollectionsAsync()).filter(
    (c) => !c.remote,
  );
  const variables = await figma.variables.getLocalVariablesAsync();
  const variableById = new Map(variables.map((v) => [v.id, v]));
  const collectionById = new Map(collections.map((c) => [c.id, c]));

  const entry = (raw) => {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS') {
      const target = variableById.get(raw.id);
      const home = target ? collectionById.get(target.variableCollectionId) : null;
      return {
        alias: raw.id,
        to: target ? (home ? home.name : 'remote') + ': ' + target.name : null,
      };
    }
    return { value: hdsNormalizeValue(raw) };
  };

  let lastPush = null;
  try {
    lastPush = JSON.parse(hdsGetKey(figma.root, 'lastPush') || 'null');
  } catch (_error) {
    lastPush = null;
  }

  return {
    schemaVersion: 1,
    takenAt: new Date().toISOString(),
    file: {
      name: figma.root.name,
      key: typeof figma.fileKey === 'string' ? figma.fileKey : null,
    },
    lastPush,
    collections: collections.map((c) => {
      const modes = c.modes.map((m) => m.name);
      const duplicate = modes.find((name, i) => modes.indexOf(name) !== i);
      if (duplicate !== undefined) {
        throw new Error(
          `Collection "${c.name}" has two modes named "${duplicate}". Rename one in Figma, then run again.`,
        );
      }
      const defaultMode = c.modes.find((m) => m.modeId === c.defaultModeId);
      return {
        id: c.id,
        name: c.name,
        key: hdsGetKey(c, 'collection'),
        hiddenFromPublishing: Boolean(c.hiddenFromPublishing),
        defaultMode: defaultMode ? defaultMode.name : modes[0],
        modes,
        variables: c.variableIds
          .map((id) => variableById.get(id))
          .filter(Boolean)
          .map((v) => {
            const values = v.valuesByMode;
            return {
              id: v.id,
              name: v.name,
              path: hdsGetKey(v, 'path'),
              resolvedType: v.resolvedType,
              description: v.description || '',
              scopes: v.scopes.slice(),
              hiddenFromPublishing: Boolean(v.hiddenFromPublishing),
              codeSyntax: Object.assign({}, v.codeSyntax),
              valuesByMode: Object.fromEntries(
                c.modes.map((m) => [m.name, entry(values[m.modeId])]),
              ),
            };
          })
          .sort(hdsByName),
      };
    }),
    textStyles: (await figma.getLocalTextStylesAsync())
      .map((s) => {
        const bound = s.boundVariables || {};
        const lineHeight = s.lineHeight;
        return {
          id: s.id,
          name: s.name,
          path: hdsGetKey(s, 'path'),
          description: s.description || '',
          fontFamily: s.fontName.family,
          fontStyle: s.fontName.style,
          fontSize: hdsRound(s.fontSize),
          lineHeight:
            lineHeight.unit === 'AUTO'
              ? { unit: 'AUTO' }
              : { unit: lineHeight.unit, value: hdsRound(lineHeight.value) },
          letterSpacing: {
            unit: s.letterSpacing.unit,
            value: hdsRound(s.letterSpacing.value),
          },
          textCase: s.textCase,
          boundVariables: Object.fromEntries(
            Object.keys(bound)
              .sort()
              .map((field) => [field, bound[field].id]),
          ),
        };
      })
      .sort(hdsByName),
    effectStyles: (await figma.getLocalEffectStylesAsync())
      .map((s) => ({
        id: s.id,
        name: s.name,
        path: hdsGetKey(s, 'path'),
        description: s.description || '',
        effects: s.effects.map(hdsNormalizeEffect),
      }))
      .sort(hdsByName),
  };
}

// ── Match ────────────────────────────────────────────────────────────────────
/**
 * Pairs model items with Figma items by stable key (see the file header).
 * `renames` maps an old token path to its new path (TOKEN_MIGRATION.md).
 */
export function hdsMatch(model, state, renames) {
  const modelPaths = new Set();
  model.collections.forEach((c) => c.variables.forEach((v) => modelPaths.add(v.path)));
  const unowned = (item, paths) => !item.path || !paths.has(item.path);

  const collectionOf = new Map();
  const claimedCollections = new Set();
  const modelKeys = new Set(model.collections.map((c) => c.key));
  const collectionPasses = [
    (m, s) => s.key === m.key,
    (m, s) => s.name === m.name && (!s.key || !modelKeys.has(s.key)),
  ];
  for (const pass of collectionPasses) {
    for (const m of model.collections) {
      if (collectionOf.has(m.key)) continue;
      const hit = state.collections.find((s) => !claimedCollections.has(s.id) && pass(m, s));
      if (hit) {
        collectionOf.set(m.key, hit);
        claimedCollections.add(hit.id);
      }
    }
  }

  const variableOf = new Map();
  const claimedVariables = new Set();
  const variablePasses = [
    (m, s) => s.path === m.path,
    (m, s) => hdsRenamedPath(s.path, renames) === m.path,
    (m, s) =>
      unowned(s, modelPaths) &&
      Boolean(m.codeSyntax && m.codeSyntax.WEB) &&
      s.codeSyntax.WEB === m.codeSyntax.WEB,
    (m, s) => unowned(s, modelPaths) && s.name === m.name,
  ];
  for (const pass of variablePasses) {
    for (const mc of model.collections) {
      const sc = collectionOf.get(mc.key);
      if (!sc) continue;
      for (const mv of mc.variables) {
        if (variableOf.has(mv.path)) continue;
        const hit = sc.variables.find(
          (sv) =>
            !claimedVariables.has(sv.id) && sv.resolvedType === mv.resolvedType && pass(mv, sv),
        );
        if (hit) {
          variableOf.set(mv.path, hit);
          claimedVariables.add(hit.id);
        }
      }
    }
  }

  const matchStyles = (modelStyles, stateStyles) => {
    const paths = new Set(modelStyles.map((s) => s.path));
    const of = new Map();
    const claimed = new Set();
    const passes = [
      (m, s) => s.path === m.path,
      (m, s) => hdsRenamedPath(s.path, renames) === m.path,
      (m, s) => unowned(s, paths) && s.name === m.name,
    ];
    for (const pass of passes) {
      for (const m of modelStyles) {
        if (of.has(m.path)) continue;
        const hit = stateStyles.find((s) => !claimed.has(s.id) && pass(m, s));
        if (hit) {
          of.set(m.path, hit);
          claimed.add(hit.id);
        }
      }
    }
    return { of, claimed };
  };

  const pathById = new Map();
  variableOf.forEach((sv, path) => pathById.set(sv.id, path));
  return {
    collectionOf,
    claimedCollections,
    variableOf,
    claimedVariables,
    pathById,
    textStyles: matchStyles(model.textStyles, state.textStyles),
    effectStyles: matchStyles(model.effectStyles, state.effectStyles),
  };
}

// ── Plan ─────────────────────────────────────────────────────────────────────
/** Does Figma's mode entry already hold the model's entry? */
export function hdsSameEntry(want, have, pathById) {
  if (!have) return false;
  if (want.alias !== undefined)
    return have.alias !== undefined && pathById.get(have.alias) === want.alias;
  return have.value !== undefined && hdsSameValue(want.value, have.value);
}

/**
 * What a push must do to make `state` (Figma) hold `model`, as plain data.
 *
 * @param {object} model    The Figma model (scripts/lib/figma-model.mjs).
 * @param {object} state    hdsReadState() output, or a committed snapshot.
 * @param {{prune?: boolean, scope?: string[]|null, renames?: object}} [options]
 *   scope: collection keys and/or 'styles'; null means everything.
 */
export function hdsPlan(model, state, options) {
  const opts = options || {};
  const prune = Boolean(opts.prune);
  const inScope = (key) => !opts.scope || opts.scope.indexOf(key) !== -1;
  const match = hdsMatch(model, state, opts.renames);
  const plan = {
    prune,
    scope: opts.scope || null,
    collections: [],
    variables: [],
    textStyles: [],
    effectStyles: [],
    removals: { variables: [], textStyles: [], effectStyles: [], modes: [] },
    extras: { variables: [], textStyles: [], effectStyles: [], modes: [] },
    unmanagedCollections: state.collections
      .filter((c) => !match.claimedCollections.has(c.id))
      .map((c) => c.name),
    conflicts: [],
    index: {},
  };

  const homeOf = new Map();
  model.collections.forEach((mc) =>
    mc.variables.forEach((mv) => {
      homeOf.set(mv.path, mc.key);
      const sv = match.variableOf.get(mv.path);
      if (sv) plan.index[mv.path] = sv.id;
    }),
  );
  const willExist = (path) =>
    match.variableOf.has(path) || (homeOf.has(path) && inScope(homeOf.get(path)));
  const needTarget = (owner, path) => {
    if (!willExist(path)) {
      plan.conflicts.push(
        `${owner} needs ${path}, which is not in Figma and not part of this push. Push ${homeOf.get(path) || 'its collection'} first.`,
      );
    }
  };

  // Collections and modes.
  const sourceModeOf = {};
  for (const mc of model.collections) {
    if (!inScope(mc.key)) continue;
    const sc = match.collectionOf.get(mc.key);
    if (!sc) {
      sourceModeOf[mc.key] = () => null;
      plan.collections.push({
        key: mc.key,
        action: 'create',
        name: mc.name,
        hiddenFromPublishing: mc.hiddenFromPublishing,
        changes: [],
        modes: { initial: mc.modes[0], rename: [], add: mc.modes.slice(1), remove: [] },
        stampKey: true,
      });
      continue;
    }
    const rename = [];
    if (mc.modes.indexOf(sc.defaultMode) === -1 && sc.modes.indexOf(mc.modes[0]) === -1) {
      rename.push({ from: sc.defaultMode, to: mc.modes[0] });
    }
    const renamedFrom = (mode) => {
      const r = rename.find((item) => item.to === mode);
      return r ? r.from : null;
    };
    sourceModeOf[mc.key] = (mode) =>
      renamedFrom(mode) || (sc.modes.indexOf(mode) !== -1 ? mode : null);
    const add = mc.modes.filter((m) => sc.modes.indexOf(m) === -1 && !renamedFrom(m));
    const extraModes = sc.modes.filter(
      (m) => mc.modes.indexOf(m) === -1 && !rename.some((r) => r.from === m),
    );
    extraModes.forEach((mode) =>
      (prune ? plan.removals.modes : plan.extras.modes).push({ collection: mc.name, mode }),
    );
    const changes = [];
    if (sc.name !== mc.name) changes.push('name');
    if (sc.hiddenFromPublishing !== mc.hiddenFromPublishing) changes.push('hiddenFromPublishing');
    const remove = prune ? extraModes : [];
    plan.collections.push({
      key: mc.key,
      id: sc.id,
      action:
        changes.length || rename.length || add.length || remove.length ? 'update' : 'unchanged',
      name: mc.name,
      previousName: sc.name,
      hiddenFromPublishing: mc.hiddenFromPublishing,
      changes,
      modes: { rename, add, remove },
      stampKey: sc.key !== mc.key,
    });
  }

  // Variables.
  for (const mc of model.collections) {
    if (!inScope(mc.key)) continue;
    const sc = match.collectionOf.get(mc.key);
    for (const mv of mc.variables) {
      const sv = match.variableOf.get(mv.path);
      const values = [];
      for (const mode of mc.modes) {
        const want = mv.valuesByMode[mode];
        if (want.alias !== undefined) needTarget(`${mv.path} (${mode})`, want.alias);
        const from = sv ? sourceModeOf[mc.key](mode) : null;
        const have = sv && from ? sv.valuesByMode[from] : null;
        if (!hdsSameEntry(want, have, match.pathById)) values.push({ mode, from: have, to: want });
      }
      const set = {
        name: mv.name,
        description: mv.description,
        hiddenFromPublishing: mv.hiddenFromPublishing,
        scopes: mv.scopes,
        codeSyntaxWeb: (mv.codeSyntax && mv.codeSyntax.WEB) || null,
      };
      if (!sv) {
        plan.variables.push({
          path: mv.path,
          collection: mc.key,
          action: 'create',
          resolvedType: mv.resolvedType,
          set,
          changes: [],
          values,
          stampKey: true,
        });
        continue;
      }
      const changes = [];
      if (sv.name !== mv.name) changes.push('name');
      if (sv.description !== mv.description) changes.push('description');
      if (sv.hiddenFromPublishing !== mv.hiddenFromPublishing) changes.push('hiddenFromPublishing');
      if (!hdsSameSet(sv.scopes, mv.scopes)) changes.push('scopes');
      if ((sv.codeSyntax.WEB || null) !== set.codeSyntaxWeb) changes.push('codeSyntax');
      plan.variables.push({
        path: mv.path,
        collection: mc.key,
        id: sv.id,
        action: changes.length || values.length ? 'update' : 'unchanged',
        resolvedType: mv.resolvedType,
        previousName: sv.name,
        set,
        changes,
        values,
        stampKey: sv.path !== mv.path,
      });
    }

    if (!sc) continue;
    const kept = [];
    for (const sv of sc.variables) {
      if (match.claimedVariables.has(sv.id)) continue;
      const item = { id: sv.id, collection: mc.name, name: sv.name, path: sv.path };
      if (prune) plan.removals.variables.push(item);
      else {
        plan.extras.variables.push(item);
        kept.push(item);
      }
    }
    const holders = {};
    kept.forEach((item) => (holders[item.name] = item));
    for (const mv of mc.variables) {
      const holder = holders[mv.name];
      if (holder) {
        plan.conflicts.push(
          `${mc.name}: "${mv.name}" (${mv.path}) is taken by a variable the model does not own (${holder.id}${holder.path ? ', path ' + holder.path : ''}). Rename or delete it in Figma, or push with --prune to remove it.`,
        );
      }
    }
  }

  // Styles.
  if (inScope('styles')) {
    const styleKinds = [
      { kind: 'textStyles', label: 'Text style' },
      { kind: 'effectStyles', label: 'Effect style' },
    ];
    for (const { kind, label } of styleKinds) {
      const matched = match[kind];
      for (const ms of model[kind]) {
        const ss = matched.of.get(ms.path);
        const changes = [];
        if (kind === 'textStyles') {
          Object.keys(ms.boundVariables).forEach((field) =>
            needTarget(`${label} ${ms.name} (${field})`, ms.boundVariables[field]),
          );
          if (ss) {
            if (ss.fontFamily !== ms.fontFamily || ss.fontStyle !== ms.fontStyle)
              changes.push('font');
            ['fontSize', 'lineHeight', 'letterSpacing', 'textCase'].forEach((key) => {
              if (!hdsSameValue(ss[key], ms[key])) changes.push(key);
            });
            const fields = Object.keys(ms.boundVariables).concat(
              Object.keys(ss.boundVariables).filter((f) => !(f in ms.boundVariables)),
            );
            fields.forEach((field) => {
              const want = ms.boundVariables[field] || null;
              const have = ss.boundVariables[field]
                ? match.pathById.get(ss.boundVariables[field]) || '?'
                : null;
              if (want !== have) changes.push('bound:' + field);
            });
          }
        } else if (ss && !hdsSameValue(ss.effects, ms.effects)) {
          changes.push('effects');
        }
        if (ss && ss.name !== ms.name) changes.unshift('name');
        if (ss && ss.description !== ms.description) changes.push('description');
        plan[kind].push({
          path: ms.path,
          id: ss ? ss.id : undefined,
          action: !ss ? 'create' : changes.length ? 'update' : 'unchanged',
          previousName: ss ? ss.name : undefined,
          currentFont:
            ss && kind === 'textStyles'
              ? { family: ss.fontFamily, style: ss.fontStyle }
              : undefined,
          changes,
          set: ms,
          stampKey: !ss || ss.path !== ms.path,
        });
      }
      for (const ss of state[kind]) {
        if (matched.claimed.has(ss.id) || !ss.path) continue;
        const item = { id: ss.id, name: ss.name, path: ss.path };
        (prune ? plan.removals[kind] : plan.extras[kind]).push(item);
      }
    }
  }
  return plan;
}

export function hdsSummarize(plan) {
  const tally = (items, deleted) => ({
    created: items.filter((i) => i.action === 'create').length,
    updated: items.filter((i) => i.action === 'update').length,
    deleted: deleted.length,
    unchanged: items.filter((i) => i.action === 'unchanged').length,
  });
  const modes = {
    added: plan.collections.reduce((n, c) => n + c.modes.add.length, 0),
    renamed: plan.collections.reduce((n, c) => n + c.modes.rename.length, 0),
    deleted: plan.removals.modes.length,
  };
  const summary = {
    collections: tally(plan.collections, []),
    modes,
    variables: tally(plan.variables, plan.removals.variables),
    textStyles: tally(plan.textStyles, plan.removals.textStyles),
    effectStyles: tally(plan.effectStyles, plan.removals.effectStyles),
    extras:
      plan.extras.variables.length +
      plan.extras.textStyles.length +
      plan.extras.effectStyles.length +
      plan.extras.modes.length,
    unmanagedCollections: plan.unmanagedCollections.length,
    conflicts: plan.conflicts.length,
  };
  const kinds = [summary.collections, summary.variables, summary.textStyles, summary.effectStyles];
  summary.totals = {
    created: kinds.reduce((n, k) => n + k.created, 0) + modes.added,
    updated: kinds.reduce((n, k) => n + k.updated, 0),
    deleted: kinds.reduce((n, k) => n + k.deleted, 0) + modes.deleted,
  };
  return summary;
}

export function hdsSummaryLine(summary) {
  const t = summary.totals;
  return `updated ${t.updated} · created ${t.created} · deleted ${t.deleted}`;
}

/** One line per planned change, for the plugin UI and the terminal. */
export function hdsDescribePlan(plan) {
  const lines = [];
  plan.collections.forEach((c) => {
    if (c.action === 'create')
      lines.push(
        `create collection ${c.name} [${[c.modes.initial].concat(c.modes.add).join(', ')}]`,
      );
    if (c.action !== 'update') return;
    if (c.changes.length)
      lines.push(`update collection ${c.previousName}: ${c.changes.join(', ')}`);
    c.modes.rename.forEach((r) => lines.push(`rename mode ${c.name}: ${r.from} -> ${r.to}`));
    c.modes.add.forEach((m) => lines.push(`add mode ${c.name}: ${m}`));
  });
  plan.variables.forEach((v) => {
    if (v.action === 'unchanged') return;
    const modes = v.values.map((x) => x.mode);
    const parts = v.changes.concat(modes.length ? ['value (' + modes.join(', ') + ')'] : []);
    lines.push(
      `${v.action} variable ${v.path}${v.action === 'update' ? ': ' + parts.join(', ') : ''}`,
    );
  });
  ['textStyles', 'effectStyles'].forEach((kind) =>
    plan[kind].forEach((s) => {
      if (s.action === 'unchanged') return;
      const label = kind === 'textStyles' ? 'text style' : 'effect style';
      lines.push(
        `${s.action} ${label} ${s.set.name}${s.action === 'update' ? ': ' + s.changes.join(', ') : ''}`,
      );
    }),
  );
  plan.removals.variables.forEach((v) => lines.push(`delete variable ${v.collection}: ${v.name}`));
  plan.removals.textStyles.forEach((s) => lines.push(`delete text style ${s.name}`));
  plan.removals.effectStyles.forEach((s) => lines.push(`delete effect style ${s.name}`));
  plan.removals.modes.forEach((m) => lines.push(`delete mode ${m.collection}: ${m.mode}`));
  return lines;
}

// ── Apply ────────────────────────────────────────────────────────────────────
/**
 * Executes a plan made from a fresh hdsReadState() of the same file. Order:
 * prune removals (frees names) → collections and modes → variable UPDATEs →
 * variable CREATEs → raw values → alias values → styles → prune mode removals.
 */
export async function hdsApply(figma, plan) {
  const collections = new Map(
    (await figma.variables.getLocalVariableCollectionsAsync()).map((c) => [c.id, c]),
  );
  const variables = new Map((await figma.variables.getLocalVariablesAsync()).map((v) => [v.id, v]));
  const need = (map, id, what) => {
    const hit = map.get(id);
    if (!hit) throw new Error(`${what} ${id} disappeared while the push ran. Run the push again.`);
    return hit;
  };
  const modeId = (collection, name) => {
    const mode = collection.modes.find((m) => m.name === name);
    if (!mode) throw new Error(`Mode "${name}" is missing from ${collection.name}.`);
    return mode.modeId;
  };
  const created = { collections: [], variables: [], textStyles: [], effectStyles: [] };
  const byPath = {};
  Object.keys(plan.index).forEach((path) => {
    const v = variables.get(plan.index[path]);
    if (v) byPath[path] = v;
  });

  // 1. Prune removals first, so the names they held are free.
  plan.removals.variables.forEach((item) => {
    const v = variables.get(item.id);
    if (v) v.remove();
    variables.delete(item.id);
  });
  const textStyles = new Map((await figma.getLocalTextStylesAsync()).map((s) => [s.id, s]));
  const effectStyles = new Map((await figma.getLocalEffectStylesAsync()).map((s) => [s.id, s]));
  plan.removals.textStyles.forEach((item) => {
    if (textStyles.has(item.id)) textStyles.get(item.id).remove();
  });
  plan.removals.effectStyles.forEach((item) => {
    if (effectStyles.has(item.id)) effectStyles.get(item.id).remove();
  });

  // 2. Collections and modes.
  const collectionByKey = {};
  for (const pc of plan.collections) {
    let collection;
    if (pc.action === 'create') {
      collection = figma.variables.createVariableCollection(pc.name);
      created.collections.push(collection.id);
      if (collection.hiddenFromPublishing !== pc.hiddenFromPublishing) {
        collection.hiddenFromPublishing = pc.hiddenFromPublishing;
      }
      const initial = collection.modes.find((m) => m.modeId === collection.defaultModeId);
      if (!initial || initial.name !== pc.modes.initial) {
        collection.renameMode(collection.defaultModeId, pc.modes.initial);
      }
    } else {
      collection = need(collections, pc.id, 'Collection');
      if (pc.changes.indexOf('name') !== -1) collection.name = pc.name;
      if (pc.changes.indexOf('hiddenFromPublishing') !== -1) {
        collection.hiddenFromPublishing = pc.hiddenFromPublishing;
      }
      pc.modes.rename.forEach((r) => collection.renameMode(modeId(collection, r.from), r.to));
    }
    if (pc.stampKey) hdsSetKey(collection, 'collection', pc.key);
    for (const name of pc.modes.add) {
      try {
        collection.addMode(name);
      } catch (error) {
        throw new Error(
          `Could not add mode "${name}" to ${pc.name}: ${error.message}. Check the plan's modes-per-collection limit (Professional: 10).`,
        );
      }
    }
    collectionByKey[pc.key] = collection;
  }

  // 3. UPDATE before CREATE: renames go through temporary names when a target
  //    name is still held by another variable, so swaps and chains succeed.
  const updates = plan.variables.filter((pv) => pv.action !== 'create');
  const renaming = updates.filter((pv) => pv.changes.indexOf('name') !== -1);
  const held = (pv) => {
    const self = need(variables, pv.id, 'Variable');
    for (const other of variables.values()) {
      if (
        other.id !== self.id &&
        other.variableCollectionId === self.variableCollectionId &&
        other.name === pv.set.name
      ) {
        return true;
      }
    }
    return false;
  };
  if (renaming.some(held)) {
    renaming.forEach((pv, i) => (need(variables, pv.id, 'Variable').name = 'hds-renaming-' + i));
  }
  for (const pv of updates) {
    const v = need(variables, pv.id, 'Variable');
    const has = (field) => pv.changes.indexOf(field) !== -1;
    if (has('name')) v.name = pv.set.name;
    if (has('description')) v.description = pv.set.description;
    if (has('hiddenFromPublishing')) v.hiddenFromPublishing = pv.set.hiddenFromPublishing;
    if (has('scopes')) v.scopes = pv.set.scopes;
    if (has('codeSyntax')) {
      if (pv.set.codeSyntaxWeb) v.setVariableCodeSyntax('WEB', pv.set.codeSyntaxWeb);
      else v.removeVariableCodeSyntax('WEB');
    }
    if (pv.stampKey) hdsSetKey(v, 'path', pv.path);
    byPath[pv.path] = v;
  }

  // 4. CREATE what no key matched.
  for (const pv of plan.variables.filter((item) => item.action === 'create')) {
    const v = figma.variables.createVariable(
      pv.set.name,
      collectionByKey[pv.collection],
      pv.resolvedType,
    );
    created.variables.push(v.id);
    if (pv.set.description) v.description = pv.set.description;
    if (pv.set.hiddenFromPublishing) v.hiddenFromPublishing = true;
    v.scopes = pv.set.scopes;
    if (pv.set.codeSyntaxWeb) v.setVariableCodeSyntax('WEB', pv.set.codeSyntaxWeb);
    hdsSetKey(v, 'path', pv.path);
    byPath[pv.path] = v;
  }

  // 5. Values: raw values first, so an old alias that would close a cycle with
  //    a new one is replaced before the new alias is set.
  const valueChanges = [];
  plan.variables.forEach((pv) => pv.values.forEach((change) => valueChanges.push({ pv, change })));
  const setValue = ({ pv, change }) => {
    const v = byPath[pv.path];
    const collection = collectionByKey[pv.collection];
    let value = change.to.value;
    if (change.to.alias !== undefined) {
      const target = byPath[change.to.alias];
      if (!target) throw new Error(`${pv.path} aliases ${change.to.alias}, which is not in Figma.`);
      value = figma.variables.createVariableAlias(target);
    }
    v.setValueForMode(modeId(collection, change.mode), value);
  };
  valueChanges.filter((c) => c.change.to.alias === undefined).forEach(setValue);
  valueChanges.filter((c) => c.change.to.alias !== undefined).forEach(setValue);

  // 6. Text styles: load every font a style has or gets before touching it.
  const pendingText = plan.textStyles.filter((ps) => ps.action !== 'unchanged' || ps.stampKey);
  const fonts = {};
  pendingText
    .filter((ps) => ps.action !== 'unchanged')
    .forEach((ps) => {
      [ps.currentFont, { family: ps.set.fontFamily, style: ps.set.fontStyle }].forEach((font) => {
        if (font) fonts[font.family + '|' + font.style] = font;
      });
    });
  for (const key of Object.keys(fonts)) await figma.loadFontAsync(fonts[key]);
  for (const ps of pendingText) {
    const isNew = ps.action === 'create';
    const style = isNew ? figma.createTextStyle() : need(textStyles, ps.id, 'Text style');
    if (isNew) created.textStyles.push(style.id);
    const has = (field) => isNew || ps.changes.indexOf(field) !== -1;
    if (has('name')) style.name = ps.set.name;
    if (has('description') && (!isNew || ps.set.description))
      style.description = ps.set.description;
    if (has('font')) style.fontName = { family: ps.set.fontFamily, style: ps.set.fontStyle };
    ['fontSize', 'lineHeight', 'letterSpacing', 'textCase'].forEach((key) => {
      if (has(key)) style[key] = ps.set[key];
    });
    const fields = Object.keys(ps.set.boundVariables);
    ps.changes
      .filter((c) => c.indexOf('bound:') === 0)
      .map((c) => c.slice(6))
      .forEach((field) => {
        if (fields.indexOf(field) === -1) fields.push(field);
      });
    fields.forEach((field) => {
      if (!has('bound:' + field)) return;
      const path = ps.set.boundVariables[field];
      if (path && !byPath[path])
        throw new Error(`Text style ${ps.set.name} binds ${path}, which is not in Figma.`);
      style.setBoundVariable(field, path ? byPath[path] : null);
    });
    if (ps.stampKey) hdsSetKey(style, 'path', ps.path);
  }

  // 7. Effect styles.
  for (const ps of plan.effectStyles.filter(
    (item) => item.action !== 'unchanged' || item.stampKey,
  )) {
    const isNew = ps.action === 'create';
    const style = isNew ? figma.createEffectStyle() : need(effectStyles, ps.id, 'Effect style');
    if (isNew) created.effectStyles.push(style.id);
    const has = (field) => isNew || ps.changes.indexOf(field) !== -1;
    if (has('name')) style.name = ps.set.name;
    if (has('description') && (!isNew || ps.set.description))
      style.description = ps.set.description;
    if (has('effects') && (!isNew || ps.set.effects.length)) style.effects = ps.set.effects;
    if (ps.stampKey) hdsSetKey(style, 'path', ps.path);
  }

  // 8. Prune extra modes last: values are already in place.
  for (const pc of plan.collections) {
    pc.modes.remove.forEach((name) => {
      const collection = collectionByKey[pc.key];
      collection.removeMode(modeId(collection, name));
    });
  }
  return created;
}

// ── Entry points ─────────────────────────────────────────────────────────────
export async function hdsFontPreflight(figma, plan) {
  const pending = plan.textStyles.filter((ps) => ps.action !== 'unchanged');
  if (!pending.length) return [];
  const available = new Set(
    (await figma.listAvailableFontsAsync()).map((f) => f.fontName.family + '|' + f.fontName.style),
  );
  const problems = [];
  pending.forEach((ps) => {
    const wanted = ps.set.fontFamily + '|' + ps.set.fontStyle;
    if (!available.has(wanted)) {
      problems.push(
        `Text style ${ps.set.name} needs the font "${ps.set.fontFamily} ${ps.set.fontStyle}", which this Figma editor does not have. Install it on this machine (Figma desktop reads installed fonts), then run the push again.`,
      );
    }
    if (ps.currentFont && !available.has(ps.currentFont.family + '|' + ps.currentFont.style)) {
      problems.push(
        `Text style ${ps.previousName} uses the missing font "${ps.currentFont.family} ${ps.currentFont.style}", so Figma will not let the push edit it. Install that font or delete the style, then run the push again.`,
      );
    }
  });
  return problems.filter((p, i) => problems.indexOf(p) === i);
}

/**
 * Plans, checks and applies a push, then re-reads the file and fails loudly
 * if Figma still differs from the model.
 *
 * @param {object} figma     The Plugin API global.
 * @param {object} payload   { modelHash, options: { prune, scope, renames, dryRun }, model }
 * @param {string} checksum  hdsChecksum(JSON.stringify(payload)) from `pnpm figma:push`.
 * @param {object} [override]  Option overrides (the dev plugin's dry-run command).
 */
export async function hdsRunPush(figma, payload, checksum, override) {
  if (hdsChecksum(JSON.stringify(payload)) !== checksum) {
    throw new Error(
      'The push payload does not match its checksum: it changed after `pnpm figma:push` generated it (a copy or transcription error). Nothing was written. Regenerate with `pnpm figma:push` and run the script unmodified.',
    );
  }
  const options = Object.assign({}, payload.options, override || {});
  const state = await hdsReadState(figma);
  const plan = hdsPlan(payload.model, state, options);
  const problems = plan.conflicts.concat(await hdsFontPreflight(figma, plan));
  const summary = hdsSummarize(plan);
  const report = {
    mode: options.dryRun ? 'dry-run' : 'push',
    file: state.file,
    scope: plan.scope,
    prune: plan.prune,
    modelHash: payload.modelHash,
    line: hdsSummaryLine(summary),
    summary,
    changes: hdsDescribePlan(plan),
    problems,
    extras: plan.extras,
    unmanagedCollections: plan.unmanagedCollections,
  };
  if (options.dryRun) return report;
  if (problems.length) {
    throw new Error('Nothing was written. ' + problems.join(' | '));
  }
  const changed = summary.totals.created + summary.totals.updated + summary.totals.deleted > 0;
  try {
    report.created = await hdsApply(figma, plan);
  } catch (error) {
    throw new Error(
      `${error.message} Some changes may already be applied. A push is idempotent: fix the cause, then run the push again (a dry run shows what is left).`,
    );
  }

  const after = hdsSummarize(hdsPlan(payload.model, await hdsReadState(figma), options)).totals;
  if (after.created + after.updated + after.deleted > 0) {
    throw new Error(
      `The push ran but Figma still differs from the model (${hdsSummaryLine({ totals: after })}). Run pnpm figma:snapshot and pnpm check:figma-drift to see what did not stick.`,
    );
  }
  if (changed || !state.lastPush || state.lastPush.modelHash !== payload.modelHash) {
    hdsSetKey(
      figma.root,
      'lastPush',
      JSON.stringify({
        modelHash: payload.modelHash,
        pushedAt: new Date().toISOString(),
        scope: plan.scope,
      }),
    );
  }
  return report;
}

/** The snapshot `pnpm figma:snapshot --ingest` accepts: the state plus its checksum. */
export async function hdsRunSnapshot(figma) {
  const snapshot = await hdsReadState(figma);
  return { checksum: hdsChecksum(JSON.stringify(snapshot)), snapshot };
}
