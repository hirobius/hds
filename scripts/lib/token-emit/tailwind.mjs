/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Token → Tailwind emitter: the theme.extend bridge and the text of
 * tailwind.config.tokens.cjs. Pure (no fs); split out of
 * scripts/build-tokens.mjs (hds#645).
 */

import { dimensionToCSS, pathToCSSVar } from './css.mjs';

/** Puts a `// @deprecated` line above each Tailwind key whose var is a deprecated token. */
export function tagDeprecatedTailwindKeys(json, notes) {
  let out = json;
  for (const { cssVar, note } of notes.values()) {
    out = out.replace(
      new RegExp(`^(\\s*)(".+": "var\\(${cssVar}\\)",?)$`, 'gm'),
      (m, pad, entry) => `${pad}// ${note}\n${pad}${entry}`,
    );
  }
  return out;
}

function trackingUtilities(primitiveLetterSpacing) {
  // letterSpacing — emitted ONLY for token names Tailwind does not already own.
  //
  // fontSize (buildTailwindThemeExtend) deliberately collides: `text-sm` SHOULD mean the HDS rung.
  // Tracking cannot do the same. Five of the six HDS names (tighter, tight,
  // normal, wide, wider) are also Tailwind's, and silently redefining
  // `tracking-tight` from -0.025em to the token's -0.01em changes every
  // existing use of a stock utility — a different value under an unchanged
  // name, which is the hardest kind of change to notice in review.
  //
  // So only the names Tailwind lacks are emitted. Today that is `caps`
  // (0.06em), which is the one that was missing: with no `tracking-caps`,
  // five components reached for `tracking-wide` — Tailwind's stock 0.025em,
  // 42% of what the eyebrow token specifies. The gap in the config WAS the
  // bypass (see #283).
  const TAILWIND_OWNED_TRACKING = new Set([
    'tighter',
    'tight',
    'normal',
    'wide',
    'wider',
    'widest',
  ]);
  const letterSpacing = {};
  for (const t of primitiveLetterSpacing) {
    const name = t.path[t.path.length - 1];
    if (TAILWIND_OWNED_TRACKING.has(name)) continue;
    letterSpacing[name] = `var(${pathToCSSVar(t.path)})`;
  }
  return letterSpacing;
}

// ── Tailwind config emitter ────────────────────────────────────────────
/**
 * Maps role tokens + semantic.shadow.* into a Tailwind theme.extend object.
 * Foreground role tokens (e.g. card-foreground) nest under their base as
 * { DEFAULT, foreground } so utilities like bg-card / text-card-foreground
 * resolve. Flat roles (background, foreground, border, input, ring) emit as
 * top-level color strings. The radius role drives borderRadius: `md` is the
 * role radius itself and lg/sm step +4px/-2px around it, so the utility and
 * --semantic-radius-action cannot diverge. Shadow tokens map by name into
 * boxShadow.
 *
 * `utilityTokens` (all optional, default `[]`) surface the remaining
 * primitive/semantic scales as Tailwind utilities so `p-*`, `gap-*`, `sm:`,
 * `text-*`, `border-*` resolve to HDS tokens instead of Tailwind's built-in
 * scale (ISSUE-01, hirobius/hds#125):
 *   - spacing: every `semantic.space.*` leaf under its own dash-joined name
 *     (e.g. `layout-normal`) PLUS every `primitive.space.*` leaf under its
 *     own key (`0`,`1`,...,`px1`,...) as a fallback so the numeric Tailwind
 *     spacing scale (`p-4`, `gap-6`) is token-sourced. The primitive
 *     fallback entries are not tenant-themeable (tenants may only override
 *     semantic tier) — only the named semantic entries are.
 *   - screens: `primitive.breakpoint.*` under a name+value key (`xs375`,
 *     `sm640`, `md768`, `lg1024`, `xl1280` — deliberately not colliding with
 *     Tailwind's own `sm`/`md`/`lg`/`xl` defaults), value a **resolved px
 *     literal** (e.g. `375px`) — the one documented exception to the
 *     var()-ref rule the other three keys follow, per ADR-024's amendment:
 *     `@media` conditions can't evaluate CSS custom properties in any
 *     browser, so a var() ref here was never a functional breakpoint.
 *   - borderWidth: `semantic.borderWidth.default` → `DEFAULT` (bare
 *     `border`), `semantic.borderWidth.emphasis` → both `emphasis` and `2`
 *     (so `border-2` resolves through the tenant-themeable semantic tier),
 *     plus every `primitive.borderWidth.*` leaf under its own key.
 *   - fontSize: every `primitive.typography.size.*` leaf under its own key
 *     (`xs`,`sm`,`base`,...) — collides with Tailwind's default scale so
 *     `text-sm` resolves to the HDS token.
 *
 * @param {Array} roles  - tokens whose path[0] === 'role'
 * @param {Array} shadows - tokens with path[0]==='semantic' && path[1]==='shadow' && type==='shadow'
 * @param {object} [utilityTokens]
 * @param {Array} [utilityTokens.semanticSpace] - path[0]==='semantic' && path[1]==='space'
 * @param {Array} [utilityTokens.semanticRadius] - path[0]==='semantic' && path[1]==='radius' (only `scale.*` is emitted)
 * @param {Array} [utilityTokens.primitiveSpace] - path[0]==='primitive' && path[1]==='space'
 * @param {Array} [utilityTokens.primitiveBreakpoint] - path[0]==='primitive' && path[1]==='breakpoint'
 * @param {Array} [utilityTokens.semanticBorderWidth] - path[0]==='semantic' && path[1]==='borderWidth'
 * @param {Array} [utilityTokens.primitiveBorderWidth] - path[0]==='primitive' && path[1]==='borderWidth'
 * @param {Array} [utilityTokens.primitiveFontSize] - path[0]==='primitive' && path[1]==='typography' && path[2]==='size'
 * @returns {{ colors: object, borderRadius: object, boxShadow: object, spacing: object, screens: object, borderWidth: object, fontSize: object }}
 */
export function buildTailwindThemeExtend(roles, shadows, utilityTokens = {}) {
  const {
    semanticSpace = [],
    semanticRadius = [],
    primitiveSpace = [],
    primitiveBreakpoint = [],
    semanticBorderWidth = [],
    primitiveBorderWidth = [],
    primitiveFontSize = [],
    primitiveLetterSpacing = [],
  } = utilityTokens;
  const FOREGROUND_SUFFIX = '-foreground';
  const foregroundBases = new Set();
  for (const t of roles) {
    const name = t.path[1];
    if (typeof name === 'string' && name.endsWith(FOREGROUND_SUFFIX)) {
      foregroundBases.add(name.slice(0, -FOREGROUND_SUFFIX.length));
    }
  }

  const colors = {};
  let radiusVar = null;
  for (const t of roles) {
    const name = t.path[1];
    const cssVar = `var(${pathToCSSVar(t.path)})`;

    if (t.type === 'dimension' && name === 'radius') {
      radiusVar = cssVar;
      continue;
    }

    if (name.endsWith(FOREGROUND_SUFFIX)) {
      const base = name.slice(0, -FOREGROUND_SUFFIX.length);
      colors[base] = colors[base] || {};
      colors[base].foreground = cssVar;
    } else if (foregroundBases.has(name)) {
      colors[name] = colors[name] || {};
      colors[name].DEFAULT = cssVar;
    } else {
      colors[name] = cssVar;
    }
  }

  // One shape knob. `md` IS the role radius, so a control styled `rounded-md`
  // and a component binding --semantic-radius-action resolve to the same
  // number. Under the previous shadcn-style mapping (lg = role, md = role-2)
  // they silently disagreed — buttons and inputs rendered 10px while the token
  // and DESIGN.md both said 12px. Containers step up from actions, not down.
  const borderRadius = radiusVar
    ? {
        lg: `calc(${radiusVar} + 4px)`,
        md: radiusVar,
        sm: `calc(${radiusVar} - 2px)`,
      }
    : {};
  // The fixed radius ladder rides beside the role steps as rounded-scale-<step>.
  for (const t of semanticRadius) {
    if (t.path[2] !== 'scale') continue;
    borderRadius[t.path.slice(2).join('-')] = `var(${pathToCSSVar(t.path)})`;
  }

  const boxShadow = {};
  for (const t of shadows) {
    const name = t.path[t.path.length - 1];
    boxShadow[name] = `var(${pathToCSSVar(t.path)})`;
  }

  // spacing — semantic named entries (tenant-themeable) + primitive numeric
  // fallback (not tenant-themeable; primitive tier is immutable per tenant).
  const spacing = {};
  for (const t of semanticSpace) {
    spacing[t.path.slice(2).join('-')] = `var(${pathToCSSVar(t.path)})`;
  }
  for (const t of primitiveSpace) {
    spacing[t.path[2]] = `var(${pathToCSSVar(t.path)})`;
  }

  // screens — per ADR-024's amendment, keyed by name+value (xs375, sm640,
  // ...) so these don't collide with Tailwind's own sm/md/lg/xl defaults,
  // value is a resolved px literal (not a var(--…) ref like the other three
  // categories): @media conditions can't evaluate CSS custom properties in
  // any browser, so a var() ref here was never a functional breakpoint.
  const screens = {};
  for (const t of primitiveBreakpoint) {
    const name = t.path[t.path.length - 1];
    screens[`${name}${t.value.value}`] = dimensionToCSS(t.value);
  }

  // borderWidth — semantic.default → DEFAULT (bare `border`),
  // semantic.emphasis → emphasis + 2 (so `border-2` is tenant-themeable),
  // plus every primitive.borderWidth.* leaf under its own key.
  const borderWidth = {};
  for (const t of semanticBorderWidth) {
    const leaf = t.path[t.path.length - 1];
    const cssVar = `var(${pathToCSSVar(t.path)})`;
    if (leaf === 'default') {
      borderWidth.DEFAULT = cssVar;
    } else if (leaf === 'emphasis') {
      borderWidth.emphasis = cssVar;
      borderWidth['2'] = cssVar;
    }
  }
  for (const t of primitiveBorderWidth) {
    borderWidth[t.path[t.path.length - 1]] = `var(${pathToCSSVar(t.path)})`;
  }

  // fontSize — every primitive.typography.size.* leaf under its own key;
  // collides with Tailwind's default scale (xs, sm, base, lg, ...) so
  // `text-sm` etc. resolve to the HDS token.
  const fontSize = {};
  for (const t of primitiveFontSize) {
    fontSize[t.path[t.path.length - 1]] = `var(${pathToCSSVar(t.path)})`;
  }

  const letterSpacing = trackingUtilities(primitiveLetterSpacing);

  return {
    colors,
    borderRadius,
    boxShadow,
    spacing,
    screens,
    borderWidth,
    fontSize,
    letterSpacing,
  };
}

/**
 * The text of tailwind.config.tokens.cjs (before Prettier).
 *
 * tailwind.config.ts spreads this into its own theme.extend so utility
 * classes like bg-background / text-foreground / shadow-floating resolve to
 * the role/shadow CSS vars. Generated as CJS for compatibility with both
 * Tailwind v3 (CommonJS config) and v4 (loadable from ESM via require()).
 */
export function renderTailwindConfig(allTokens, deprecationNotes) {
  const roles = allTokens.filter((t) => t.path[0] === 'role');
  const semanticShadows = allTokens.filter(
    (t) => t.path[0] === 'semantic' && t.path[1] === 'shadow' && t.type === 'shadow',
  );
  const tailwindExtend = buildTailwindThemeExtend(roles, semanticShadows, {
    semanticSpace: allTokens.filter((t) => t.path[0] === 'semantic' && t.path[1] === 'space'),
    semanticRadius: allTokens.filter((t) => t.path[0] === 'semantic' && t.path[1] === 'radius'),
    primitiveSpace: allTokens.filter((t) => t.path[0] === 'primitive' && t.path[1] === 'space'),
    primitiveBreakpoint: allTokens.filter(
      (t) => t.path[0] === 'primitive' && t.path[1] === 'breakpoint',
    ),
    semanticBorderWidth: allTokens.filter(
      (t) => t.path[0] === 'semantic' && t.path[1] === 'borderWidth',
    ),
    primitiveBorderWidth: allTokens.filter(
      (t) => t.path[0] === 'primitive' && t.path[1] === 'borderWidth',
    ),
    primitiveFontSize: allTokens.filter(
      (t) => t.path[0] === 'primitive' && t.path[1] === 'typography' && t.path[2] === 'size',
    ),
    primitiveLetterSpacing: allTokens.filter(
      (t) =>
        t.path[0] === 'primitive' && t.path[1] === 'typography' && t.path[2] === 'letterSpacing',
    ),
  });
  const tailwindConfigCjs = `// GENERATED FILE — do not edit; mutate hirobius.tokens.json instead.
// Emitted by scripts/build-tokens.mjs.
//
// Tailwind theme extension bridging HDS role + semantic.shadow tokens to
// utility classes. tailwind.config.* imports this and spreads theme.extend.

/** @type {{ theme: { extend: import('tailwindcss').Config['theme']['extend'] } }} */
const config = {
  theme: {
    extend: ${tagDeprecatedTailwindKeys(JSON.stringify(tailwindExtend, null, 6), deprecationNotes).replace(/\n/g, '\n    ')},
  },
};

module.exports = config;
`;
  return tailwindConfigCjs;
}
