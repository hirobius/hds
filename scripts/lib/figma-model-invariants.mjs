/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — Figma model invariants and summary (pure).
 *
 * validateFigmaModel(model) checks a model from buildFigmaModel() against what
 * Figma accepts (value types, scopes per type, modes per plan) and what HDS
 * promises about it (one theme axis, px units behind px scopes, hidden
 * primitives, unique names and codeSyntax, bound styles, scope-less Brand and
 * Density variables, no alias cycles). summarizeFigmaModel(model) gives the
 * counts a reviewer checks first.
 */

import {
  ALL_SCOPES_ALLOWLIST,
  AXIS_COLLECTION_KEYS,
  DENSITY_MODES,
  THEME_MODES,
} from './figma-model.mjs';

// ── Invariants ───────────────────────────────────────────────────────────────
/** Modes per collection on a Figma Professional plan (Organization: 20). */
export const PRO_MODE_LIMIT = 10;

const SCOPES_BY_TYPE = {
  COLOR: new Set([
    'ALL_SCOPES',
    'ALL_FILLS',
    'FRAME_FILL',
    'SHAPE_FILL',
    'TEXT_FILL',
    'STROKE_COLOR',
    'EFFECT_COLOR',
  ]),
  FLOAT: new Set([
    'ALL_SCOPES',
    'TEXT_CONTENT',
    'CORNER_RADIUS',
    'WIDTH_HEIGHT',
    'GAP',
    'OPACITY',
    'STROKE_FLOAT',
    'EFFECT_FLOAT',
    'FONT_WEIGHT',
    'FONT_SIZE',
    'LINE_HEIGHT',
    'LETTER_SPACING',
    'PARAGRAPH_SPACING',
    'PARAGRAPH_INDENT',
  ]),
  STRING: new Set(['ALL_SCOPES', 'TEXT_CONTENT', 'FONT_FAMILY', 'FONT_STYLE']),
};
const SPECIFIC_FILLS = ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'];
/** Scopes Figma applies in px: a variable carrying one must hold a px value. */
const PX_SCOPES = new Set([
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'STROKE_FLOAT',
  'EFFECT_FLOAT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
]);
const TEXT_STYLE_BINDING_TYPES = {
  fontFamily: 'STRING',
  fontSize: 'FLOAT',
  fontWeight: 'FLOAT',
  letterSpacing: 'FLOAT',
  lineHeight: 'FLOAT',
};

const isUnitInterval = (n) => typeof n === 'number' && n >= 0 && n <= 1;
const rawMatchesType = (value, type) => {
  if (type === 'COLOR')
    return Boolean(value) && ['r', 'g', 'b', 'a'].every((k) => isUnitInterval(value[k]));
  if (type === 'FLOAT') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === 'string';
};

function checkVariable(v, c, ctx, flag) {
  const where = `${v.path} (${c.name})`;
  const modes = Object.keys(v.valuesByMode);
  if (modes.length !== c.modes.length || !c.modes.every((m) => modes.includes(m))) {
    flag(`${where} has values for modes [${modes}] but the collection modes are [${c.modes}].`);
  }
  for (const [mode, entry] of Object.entries(v.valuesByMode)) {
    if (entry && 'alias' in entry) {
      const target = ctx.variables.get(entry.alias);
      if (!target)
        flag(`${where} ${mode}: alias to ${entry.alias}, which is not a variable in the model.`);
      else if (target.resolvedType !== v.resolvedType) {
        flag(
          `${where} ${mode}: a ${v.resolvedType} variable cannot alias ${entry.alias} (${target.resolvedType}).`,
        );
      }
    } else if (!rawMatchesType(entry?.value, v.resolvedType)) {
      flag(
        `${where} ${mode}: ${JSON.stringify(entry?.value)} is not a valid ${v.resolvedType} value.`,
      );
    }
  }

  const invalid = v.scopes.filter((s) => !SCOPES_BY_TYPE[v.resolvedType]?.has(s));
  if (invalid.length)
    flag(`${where}: scopes ${invalid} do not apply to ${v.resolvedType} variables.`);
  if (v.scopes.includes('ALL_SCOPES')) {
    if (v.scopes.length > 1) flag(`${where}: ALL_SCOPES cannot be combined with other scopes.`);
    else if (!ALL_SCOPES_ALLOWLIST.some((a) => v.path.startsWith(a.prefix))) {
      flag(
        `${where}: ALL_SCOPES is only allowed on the ALL_SCOPES_ALLOWLIST allow-list; add a scope rule instead.`,
      );
    }
  }
  if (v.scopes.includes('ALL_FILLS') && v.scopes.some((s) => SPECIFIC_FILLS.includes(s))) {
    flag(`${where}: ALL_FILLS cannot be combined with a specific fill scope.`);
  }
  const pxScopes = v.scopes.filter((s) => PX_SCOPES.has(s));
  if (v.resolvedType === 'FLOAT' && pxScopes.length && v.unit !== 'px') {
    flag(`${where}: scopes ${pxScopes} apply the value in px, but its unit is ${v.unit}.`);
  }

  if (v.path.startsWith('primitive.') && !v.hiddenFromPublishing) {
    flag(`${where}: primitives must be hidden from publishing.`);
  }
  if (AXIS_COLLECTION_KEYS.includes(c.key)) {
    if (v.scopes.length) {
      flag(
        `${where}: an axis variable carries no scopes (designers bind the token variable that aliases it), got ${v.scopes}.`,
      );
    }
    if (v.codeSyntax?.WEB) {
      flag(
        `${where}: an axis variable has no CSS variable of its own, so it carries no codeSyntax, got ${v.codeSyntax.WEB}.`,
      );
    }
  } else {
    const expectedSyntax = `var(--${v.path.replaceAll('.', '-')})`;
    if (v.codeSyntax?.WEB !== expectedSyntax) {
      flag(`${where}: codeSyntax.WEB should be ${expectedSyntax}, got ${v.codeSyntax?.WEB}.`);
    }
  }
  const prefix = `${v.name}/`;
  if ([...ctx.namesIn(c)].some((name) => name.startsWith(prefix))) {
    flag(`${where}: ${v.name} is both a variable and a group in ${c.name}.`);
  }
}

/**
 * Alias cycles over every mode at once: a frame can pair any mode of one
 * collection with any mode of another, so Figma checks the union of edges.
 * Each cycle is reported once, starting where the walk first entered it.
 */
function aliasCycles(variables) {
  const edges = (v) =>
    [...new Set(Object.values(v.valuesByMode).map((e) => e?.alias))].filter((t) =>
      variables.has(t),
    );
  const state = new Map();
  const cycles = [];
  const seen = new Set();
  const visit = (path, stack) => {
    state.set(path, 'open');
    stack.push(path);
    for (const target of edges(variables.get(path))) {
      if (state.get(target) === 'open') {
        const cycle = [...stack.slice(stack.indexOf(target)), target];
        const key = [...new Set(cycle)].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (!state.has(target)) visit(target, stack);
    }
    stack.pop();
    state.set(path, 'done');
  };
  for (const path of variables.keys()) if (!state.has(path)) visit(path, []);
  return cycles;
}

/**
 * Checks a model against what Figma accepts and what HDS promises about it.
 * Returns one human-readable line per violation; an empty array is a pass.
 *
 * @param {object} model  The result of buildFigmaModel().
 * @returns {string[]}
 */
export function validateFigmaModel(model) {
  const violations = [];
  const flag = (msg) => violations.push(msg);
  const variables = new Map();
  const collectionsByName = new Map();
  const names = new Map();

  for (const c of model.collections) {
    if (c.modes.length > PRO_MODE_LIMIT) {
      flag(
        `${c.name} has ${c.modes.length} modes; a Professional plan allows ${PRO_MODE_LIMIT} per collection.`,
      );
    }
    if (c.key === 'primitive' && !c.hiddenFromPublishing)
      flag(`${c.name} must be hidden from publishing.`);
    if (c.key === 'density' && c.modes.join('|') !== DENSITY_MODES.join('|')) {
      flag(
        `${c.name} modes must be ${DENSITY_MODES.join(' and ')} (comfortable = no data-density, compact = [data-density="compact"]), got [${c.modes}].`,
      );
    }
    names.set(c, new Set(c.variables.map((v) => v.name)));
    for (const v of c.variables) {
      variables.set(v.path, v);
      if (!collectionsByName.has(v.name)) collectionsByName.set(v.name, []);
      collectionsByName.get(v.name).push(c.name);
    }
  }

  // Figma picks a mode per collection and an unset one falls back to its first
  // mode, so two Light/Dark collections can disagree inside one Dark frame.
  const themeAxes = model.collections.filter((c) => c.modes.some((m) => THEME_MODES.includes(m)));
  if (themeAxes.length > 1) {
    flag(
      `Light/Dark modes on ${themeAxes.map((c) => c.name).join(' and ')}: HDS keeps one theme axis, so a themed token belongs in Hirobius/Semantic.`,
    );
  }

  // hds#252: the published Figma library once had every one of its 189
  // mode-aware variables holding a byte-identical Light/Dark alias — dark
  // mode existed as a mode and did nothing. That was traced to a stale FILE
  // (generated by the archived figma-agent-plugin, never re-pushed with the
  // current model), not to this generator — but nothing asserted that fact,
  // so it could regress here silently. If a themed collection ever again
  // emits zero variables that differ between modes, fail loudly rather than
  // rely on a human re-deriving the count by hand.
  // Only checked when there is exactly one theme axis (the compliant shape) —
  // a second theme axis is already its own violation above, and stacking this
  // one on top would just be noise about the same underlying mutation.
  if (themeAxes.length === 1) {
    const axis = themeAxes[0];
    const [modeA, modeB] = axis.modes;
    const differing = axis.variables.filter(
      (v) => JSON.stringify(v.valuesByMode?.[modeA]) !== JSON.stringify(v.valuesByMode?.[modeB]),
    );
    if (axis.variables.length > 0 && differing.length === 0) {
      flag(
        `${axis.name}: all ${axis.variables.length} variable(s) hold identical ${modeA}/${modeB} values — dark mode would be a no-op in Figma (hds#252).`,
      );
    }
  }

  const ctx = { variables, namesIn: (c) => names.get(c) };
  for (const c of model.collections) {
    for (const v of c.variables) checkVariable(v, c, ctx, flag);
  }
  for (const cycle of aliasCycles(variables)) {
    flag(
      `Alias cycle across modes: ${cycle.join(' → ')}. Figma refuses an alias that closes a cycle in any mode.`,
    );
  }
  const pathsBySyntax = new Map();
  for (const v of variables.values()) {
    const syntax = v.codeSyntax?.WEB;
    if (!syntax) continue;
    if (!pathsBySyntax.has(syntax)) pathsBySyntax.set(syntax, []);
    pathsBySyntax.get(syntax).push(v.path);
  }
  for (const [syntax, paths] of pathsBySyntax) {
    if (paths.length > 1) {
      flag(
        `codeSyntax ${syntax} is used by ${paths.sort().join(' and ')}; figma:push matches unkeyed Figma variables by codeSyntax, so it must be unique.`,
      );
    }
  }
  for (const [name, owners] of collectionsByName) {
    if (owners.length > 1) {
      flag(
        `Variable name ${name} is used in ${owners.join(' and ')}; names must be unique across collections.`,
      );
    }
  }

  for (const style of model.textStyles ?? []) {
    for (const [field, type] of Object.entries(TEXT_STYLE_BINDING_TYPES)) {
      const path = style.boundVariables?.[field];
      const target = variables.get(path);
      if (!target)
        flag(`Text style ${style.name}: ${field} is bound to ${path}, which is not a variable.`);
      else if (target.resolvedType !== type) {
        flag(
          `Text style ${style.name}: ${field} needs a ${type} variable, but ${path} is ${target.resolvedType}.`,
        );
      }
    }
  }

  for (const style of model.effectStyles ?? []) {
    for (const [slot, path] of Object.entries(style.pairsWith ?? {})) {
      if (path != null && !variables.has(path)) {
        flag(`Effect style ${style.name}: ${slot} pairs with ${path}, which is not a variable.`);
      }
    }
    style.effects.forEach((effect, i) => {
      for (const key of ['radius', 'spread']) {
        if (!Number.isFinite(effect[key]))
          flag(`Effect style ${style.name} effect ${i}: ${key} is not a number.`);
      }
      if (!Number.isFinite(effect.offset?.x) || !Number.isFinite(effect.offset?.y)) {
        flag(`Effect style ${style.name} effect ${i}: offset is not numeric.`);
      }
      if (!rawMatchesType(effect.color, 'COLOR')) {
        flag(`Effect style ${style.name} effect ${i}: color is not a valid COLOR value.`);
      }
    });
  }

  return violations;
}

// ── Summary ──────────────────────────────────────────────────────────────────
/**
 * The numbers a reviewer checks first: variables per collection, how many
 * differ between Light and Dark, style counts, and exclusions per reason.
 *
 * @param {object} model  The result of buildFigmaModel().
 */
export function summarizeFigmaModel(model) {
  const all = model.collections.flatMap((c) => c.variables);
  return {
    collections: model.collections.map((c) => ({
      name: c.name,
      modes: c.modes,
      variables: c.variables.length,
    })),
    variables: all.length,
    themeDifferences: all.filter(
      (v) =>
        'Dark' in v.valuesByMode &&
        JSON.stringify(v.valuesByMode.Light) !== JSON.stringify(v.valuesByMode.Dark),
    ).length,
    textStyles: model.textStyles.length,
    effectStyles: model.effectStyles.length,
    notInFigma: Object.fromEntries(model.notInFigma.map((e) => [e.id, e.tokens.length])),
  };
}
