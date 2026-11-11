/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Builds public/hds-manifest.json from the token tree. Pure: the previous
 * manifest (the system specs, inventory and component specs that
 * generate-manifest and enrich-manifest wrote before build-tokens runs) is
 * passed in, never read here. Split out of scripts/build-tokens.mjs (hds#645).
 */

import { readModes } from './token-modes.mjs';
import { UPGRADE_COMMAND, cdnUrl } from './version-stamp.mjs';
import { resolveAlias } from './token-tree.mjs';
import { ELEVATION_SLOTS, TYPO_PROPS, valueToCSS } from './token-emit/css.mjs';

/**
 * Token paths that stay in the package (CSS variables, types, `$deprecated` notes) but are left out
 * of the manifest, as the docs leave out `$deprecated` tokens: lime / delight is hidden until it
 * comes back (hds#857). Deprecated aliases with a replacement stay listed; these have none.
 */
export const HIDDEN_TOKEN_PREFIXES = ['semantic.accent.delight.', 'primitive.color.lime.'];
const isHiddenToken = (t) => HIDDEN_TOKEN_PREFIXES.some((p) => t.path.join('.').startsWith(p));

/**
 * The Figma master shape and source facts build-tokens lays over each
 * component's spec. Every other spec field comes from the previous manifest.
 */
const COMPONENT_SPEC_SEEDS = {
  Button: {
    sourcePath: 'src/app/components/button.tsx',
    sourceExport: 'Button',
    // No `props` here (hds#390). enrich-manifest owns every spec's props and
    // rebuilds them from component-api.json (the code) on each run; a list
    // written here replaced that refresh whenever `pnpm tokens` ran last, so
    // the manifest depended on which command ran most recently (the hds#379
    // failure, for props). The spread above forwards the refreshed props.
    tokens: {
      background: 'role.primary',
      text: 'role.primary-foreground',
      border: 'role.input',
      hoverSurface: 'role.accent',
      hoverText: 'role.accent-foreground',
      pressedOverlay: 'role.pressed-overlay',
      focusRing: 'role.ring',
      radius: 'role.radius',
    },
    // Figma property names follow the Code Connect registry
    // (figma/code-connect.json, hds#73 inventory); check-figma-mapping fails
    // if the two disagree. Disabled / Loading are options of the Figma State
    // VARIANT, not properties, and Figma has no icon-only property, so
    // disabled, loading and iconOnly have no entry here.
    figmaPropertyMapping: {
      variant: 'Variant',
      tone: 'Tone',
      size: 'Size',
      label: 'Label',
      iconLeft: 'Show icon',
      iconRight: 'Show trail icon',
    },
    variantAxes: ['variant', 'tone', 'size', 'state'],
    componentProperties: [
      {
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Button',
        sourceProp: 'label',
        boundTo: 'characters',
        targetSelector: 'Label',
      },
      {
        name: 'Show icon',
        type: 'BOOLEAN',
        defaultValue: false,
        sourceProp: 'iconLeft',
        boundTo: 'visibility',
        targetSelector: 'IconLeft',
      },
      {
        name: 'Show trail icon',
        type: 'BOOLEAN',
        defaultValue: false,
        sourceProp: 'iconRight',
        boundTo: 'visibility',
        targetSelector: 'IconRight',
      },
    ],
    states: ['default', 'hover', 'focus', 'active', 'disabled', 'loading'],
  },
  Card: {
    sourcePath: 'src/app/components/Card.tsx',
    sourceExport: 'Card',
    // No `props` here: enrich-manifest owns them (hds#390, see Button).
    tokens: {
      background: 'role.card',
      text: 'role.card-foreground',
      border: 'role.border',
      radius: 'role.radius',
      description: 'role.muted-foreground',
    },
    figmaPropertyMapping: {
      padding: 'Padding',
      gap: 'Gap',
      variant: 'Variant',
      tone: 'Tone',
    },
    variantAxes: ['padding', 'variant', 'tone'],
    componentProperties: [],
    states: ['default'],
  },
  Input: {
    sourcePath: 'src/app/components/Input.tsx',
    sourceExport: 'Input',
    // No `props` here: enrich-manifest owns them (hds#390, see Button).
    tokens: {
      background: 'role.background',
      text: 'role.foreground',
      border: 'role.input',
      borderError: 'role.destructive',
      radius: 'role.radius',
      focusRing: 'role.ring',
      placeholder: 'role.muted-foreground',
      helperText: 'role.muted-foreground',
      errorText: 'role.destructive',
      disabledBg: 'role.muted',
      disabledText: 'role.muted-foreground',
    },
    // Figma property names follow the Code Connect registry
    // (figma/code-connect.json, hds#73 inventory: State, Size, Label, Value,
    // Show label); check-figma-mapping fails if the two disagree. Error and
    // Disabled are options of the Figma State VARIANT, and Figma has no
    // Type / Placeholder / Helper text / Error message / Loading property.
    figmaPropertyMapping: {
      size: 'Size',
      label: 'Label',
    },
    variantAxes: ['size', 'state'],
    componentProperties: [
      {
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Label',
        sourceProp: 'label',
        boundTo: 'characters',
        targetSelector: 'Label',
      },
    ],
    states: ['default', 'focus', 'filled', 'error', 'disabled', 'loading'],
  },
  Dialog: {
    sourcePath: 'src/app/components/Dialog.tsx',
    sourceExport: 'Dialog',
    // No `props` here: enrich-manifest owns them (hds#390, see Button).
    // title / description / hideClose are NOT Dialog root props: they live
    // on the compound parts (Dialog.Title / Dialog.Description children,
    // Dialog.Content hideClose), bound below as `Part.prop`.
    tokens: {
      background: 'role.popover',
      text: 'role.popover-foreground',
      border: 'role.border',
      radius: 'role.radius',
      shadow: 'semantic.shadow.overlay',
      scrim: 'role.scrim',
      descriptionText: 'role.muted-foreground',
      closeHover: 'role.accent',
      closeHoverText: 'role.accent-foreground',
      focusRing: 'role.ring',
    },
    figmaPropertyMapping: {
      'Title.children': 'Title',
      'Description.children': 'Description',
      'Content.hideClose': 'Show close',
      modal: 'Modal',
    },
    variantAxes: ['state'],
    componentProperties: [
      {
        name: 'Title',
        type: 'TEXT',
        defaultValue: 'Dialog title',
        sourceProp: 'Title.children',
        boundTo: 'characters',
        targetSelector: 'Title',
      },
      {
        name: 'Description',
        type: 'TEXT',
        defaultValue: 'Dialog description',
        sourceProp: 'Description.children',
        boundTo: 'characters',
        targetSelector: 'Description',
      },
      {
        // Visibility toggle (true = close button shown), inverted onto
        // Dialog.Content's hideClose. Name matches the live Figma property
        // recorded in hds#73 ("Show close").
        name: 'Show close',
        type: 'BOOLEAN',
        defaultValue: true,
        sourceProp: 'Content.hideClose',
        boundTo: 'visibility',
        targetSelector: 'Close',
        invert: true,
      },
    ],
    states: ['closed', 'open'],
    // No `slots` here (hds#379). generate-manifest owns every spec's slots:
    // it keeps the hand-kept entries already in public/hds-manifest.json and
    // merges the component's JSDoc `@slot` tags into them (mergeSlots,
    // hds#339). A list written here replaced that merge, because build-tokens
    // runs after generate-manifest in `pnpm tokens`, and dropped Dialog's
    // `@slot trigger`. The spread above forwards the merged list as is.
  },
  // ── Generative-subset components without bespoke seed data ──────────────
  // These get full props/tokens via auto-discovery + tokenMapping preservation.
  // We only seed the Figma master shape: variantAxes, componentProperties, states.
  Alert: {
    variantAxes: ['tone', 'size'],
    componentProperties: [
      {
        name: 'Title',
        type: 'TEXT',
        defaultValue: 'Alert title',
        sourceProp: 'title',
        boundTo: 'characters',
        targetSelector: 'Title',
      },
      {
        name: 'Body',
        type: 'TEXT',
        defaultValue: 'Alert message',
        sourceProp: 'children',
        boundTo: 'characters',
        targetSelector: 'Body',
      },
    ],
    states: ['default'],
  },
  Stack: {
    variantAxes: ['direction'],
    componentProperties: [],
    states: ['default'],
  },
  Badge: {
    variantAxes: ['tone'],
    componentProperties: [
      {
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Badge',
        sourceProp: 'children',
        boundTo: 'characters',
        targetSelector: 'Label',
      },
    ],
    states: ['default'],
  },
  // Avatar has a Code Connect template (figma/code-connect.json), so its
  // cva-backed `size` axis must be declared (check-figma-mapping).
  Avatar: {
    variantAxes: ['size'],
  },
  Surface: {
    variantAxes: [],
    componentProperties: [],
    states: ['default'],
  },
  Grid: {
    variantAxes: [],
    componentProperties: [],
    states: ['default'],
  },
  Icon: {
    variantAxes: ['size'],
    componentProperties: [],
    states: ['default'],
  },
  Tag: {
    variantAxes: ['active'],
    componentProperties: [
      {
        name: 'Label',
        type: 'TEXT',
        defaultValue: 'Tag',
        sourceProp: 'children',
        boundTo: 'characters',
        targetSelector: 'Label',
      },
    ],
    states: ['default', 'hover', 'disabled'],
  },
  Divider: {
    variantAxes: ['orientation', 'variant'],
    componentProperties: [],
    states: ['default'],
  },
  // Size is the Figma variant for the `size` prop (sm/md/lg = ui/body/title).
  // The icon binds to component/inlineLink/size/<size>/iconSize in Figma; code
  // draws it at iconSize (0.75em) so it follows any font size.
  InlineLink: {
    tokens: {
      iconSize: 'component.inlineLink.iconSize',
      iconGap: 'component.inlineLink.iconGap',
    },
    figmaPropertyMapping: { size: 'Size' },
    variantAxes: ['size'],
    componentProperties: [],
    states: ['default'],
  },
};

/**
 * The previous manifest's componentSpecs with each seed laid over its
 * component (seed keys win; specs with no seed pass through unchanged).
 */
export function seedComponentSpecs(previous = {}) {
  const seeded = Object.fromEntries(
    Object.entries(COMPONENT_SPEC_SEEDS).map(([name, seed]) => [
      name,
      { ...(previous[name] ?? {}), ...structuredClone(seed) },
    ]),
  );
  return { ...previous, ...seeded };
}

/** A token value as CSS, with `{ref}` aliases resolved against `raw` (null when one cannot be). */
function makeResolveValue(raw) {
  return (val, type) => {
    if (typeof val === 'string' && val.startsWith('{')) {
      try {
        return valueToCSS(resolveAlias(val, raw), type, false, raw);
      } catch {
        return null;
      }
    }
    return valueToCSS(val, type, false, raw);
  };
}

/** One token's manifest entry. */
function formatTokenEntry(t, raw, resolveValue) {
  const entry = {
    path: t.path.join('.'),
    cssVar: t.type === 'motion' ? `--hds-motion-${t.path[2]}` : `--${t.path.join('-')}`,
  };
  if (t.type) entry.type = t.type;
  if (t.description) entry.description = t.description;

  if (t.type === 'typography') {
    const composite = {};
    for (const [, key, type] of TYPO_PROPS) {
      if (t.value[key] != null) composite[key] = resolveValue(t.value[key], type);
    }
    // Optional typography keys (e.g. maxWidth) are simply omitted when the
    // composite did not define them — no null marker, no schema noise.
    entry.composite = composite;
  } else if (t.type === 'motion') {
    entry.composite = {
      duration: resolveValue(t.value.duration, 'duration'),
      easing: resolveValue(t.value.easing, 'motionEasing'),
    };
  } else if (t.type === 'transition') {
    entry.composite = {
      duration: resolveValue(t.value.duration, 'duration'),
      delay: resolveValue(t.value.delay, 'duration'),
      timingFunction: resolveValue(t.value.timingFunction, 'cubicBezier'),
    };
  } else if (t.type === 'elevation') {
    const composite = {};
    for (const slot of ELEVATION_SLOTS) {
      const slotVal = t.value?.[slot];
      if (slotVal == null) {
        composite[slot] = null;
      } else if (typeof slotVal === 'string' && slotVal.startsWith('{')) {
        composite[slot] = {
          alias: slotVal,
          resolvedValue: resolveValue(slotVal, slot === 'shadow' ? 'shadow' : 'color'),
        };
      } else {
        composite[slot] = String(slotVal);
      }
    }
    entry.composite = composite;
  } else if (typeof t.value === 'string' && t.value.startsWith('{')) {
    entry.alias = t.value;
    entry.resolvedValue = resolveValue(t.value, t.type);
    const dark = readModes(t.extensions)?.Dark;
    if (dark) entry.dark = { alias: dark, resolvedValue: resolveValue(dark, t.type) };
  } else {
    entry.value = valueToCSS(t.value, t.type, false, raw);
    const dark = readModes(t.extensions)?.Dark;
    if (dark) entry.dark = { alias: dark, resolvedValue: resolveValue(dark, t.type) };
  }
  // Compact density (data-density="compact"): the value under that scope. A
  // composite's Compact mode is partial, so it lists only the keys that move.
  const compact = readModes(t.extensions)?.Compact;
  if (typeof compact === 'string') {
    entry.compact = { alias: compact, resolvedValue: resolveValue(compact, t.type) };
  } else if (compact && typeof compact === 'object') {
    entry.compact = Object.fromEntries(
      Object.entries(compact).map(([k, ref]) => [
        k,
        { alias: ref, resolvedValue: resolveValue(ref, 'dimension') },
      ]),
    );
  }

  return entry;
}

/**
 * Builds public/hds-manifest.json — a machine-readable snapshot of the full
 * token system for AI agents and LLMs building with or on top of HDS.
 * Auto-generated on every `pnpm tokens` run alongside tokens.generated.css.
 *
 * @param {Array} allTokens        walkTokens(raw), spread
 * @param {object} raw             the token tree
 * @param {object} [systemManifest] the previous public/hds-manifest.json
 * @param {string} [packageVersion] the release this manifest describes (hds#463)
 */
export function buildManifest(allTokens, raw, systemManifest = {}, packageVersion = '0.0.0') {
  const listedTokens = allTokens.filter((t) => !isHiddenToken(t));
  const resolveValue = makeResolveValue(raw);

  // Brand values — derived from token file so manifest stays in sync automatically.
  // 12t-typography-truth-up: corrected path (was raw.primitive.font.family.primary —
  // a non-existent path, which silently fell back to the literal "Atkinson Hyperlegible
  // Next" while real tokens carried Clash Grotesk).
  const fontFamRaw = raw.primitive?.typography?.family?.primary?.$value;
  const fontName = Array.isArray(fontFamRaw) ? fontFamRaw[0] : String(fontFamRaw ?? 'Sora');
  const componentSpecs = seedComponentSpecs(systemManifest.componentSpecs);
  const formatToken = (t) => formatTokenEntry(t, raw, resolveValue);

  return {
    name: 'Hirobius Design System',
    description:
      "Three-tier design token system for Adrian Milsap's portfolio site. Tokens flow primitive → semantic → component. All visual decisions trace back to hirobius.tokens.json.",
    version: '1',
    generated: new Date().toISOString(),
    source: 'hirobius.tokens.json',
    format: 'W3C DTCG 2025.10',
    docs: 'https://hirobius-hds-components.vercel.app/',
    // hds#463: the release this manifest describes, and how to move off it.
    // llmsTxt is pinned to that release, so an installed copy never points at
    // text written for a newer one.
    packageVersion,
    // Kept to the command: the entry is at its hds#413 size budget. The
    // removed-name table is public/llms/upgrade.txt, the guide UPGRADING.md.
    upgrade: { command: UPGRADE_COMMAND },
    llmsTxt: cdnUrl(packageVersion, 'llms.txt'),
    systemSpecs: systemManifest.systemSpecs ?? {
      engine: 'React + TypeScript',
      icons: 'Phosphor (Bold)',
      tokens: 'W3C DTCG',
      styling: 'CSS Variables',
    },
    architecture: {
      tiers: ['primitive', 'semantic', 'component', 'role'],
      aliasRule:
        'Semantic, component, and role tokens must alias an upstream token, except computed oklch() color values for derived tints.',
      darkMode:
        '[data-theme="dark"] on <html>. Semantic tokens auto-switch via CSS var chain — no JS re-renders.',
      density:
        'Default rhythm is roomy, for sites. [data-density="compact"] on <html> or any ancestor applies the tokens\' Compact mode, for dense apps: semantic.space.scale sm–xl 12/16/24/32px, layout.* 12/16/24/32px, section.stack 48px, type body 15 / ui 14 / caption 13 / title 24px. Each token entry lists its `compact` value.',
      cssVarFormat: '--{tier}-{...path-segments}',
      consumeInCSS: 'var(--semantic-color-surface-page)',
      consumeInJS: 'hds.space.px16  |  ct(isDark).content.primary from theme.ts',
      consumeTypography: 'hds.typeStyles.h1 (inline style object) — never Tailwind font classes',
    },
    brand: {
      // #246: was `primitive.color.blue.500`, hardcoded, emitting electric blue
      // into an agent-facing artifact three days after #208 made the accent a
      // neutral. Resolved from the semantic layer with
      // lib/token-tree.mjs's resolveAlias.
      primaryColor: resolveValue(raw.semantic?.accent?.rest?.$value, 'color') ?? '',
      primaryColorToken: 'semantic.accent.rest',
      font: fontName + ' variable 100–800, self-hosted',
      spacingBase: resolveValue(raw.primitive?.space?.['1']?.$value, 'dimension') ?? '',
      buttonBorderRadius: resolveValue(raw.primitive?.radius?.[0]?.$value, 'dimension') ?? '',
      cardBorderRadius: resolveValue(raw.primitive?.radius?.[8]?.$value, 'dimension') ?? '',
      neutralScale: 'true monochromatic (equal RGB channels)',
      accentCount: 1,
    },
    componentInventory: systemManifest.componentInventory ?? [
      'Button',
      'Card',
      'Input',
      'Nav',
      'Alert',
      'Tag',
      'Stack',
      'Divider',
      'Icon',
      'SegmentedControl',
      'InlineCode',
      'InlineLink',
      'CodeBlock',
    ],
    typographyRamp: systemManifest.typographyRamp ?? null,
    patternInventory: systemManifest.patternInventory ?? [],
    // hds#342: forwarded verbatim from generate-manifest (build-tokens runs after it).
    ...(systemManifest.iconSet ? { iconSet: systemManifest.iconSet } : {}),
    // No `health` (hds#431) and no `phases` (hds#442): both were frozen
    // snapshots no script wrote, forwarded unchanged into ./manifest. Dropping
    // a key here also drops it from public/hds-manifest.json on the next run.
    inventory: systemManifest.inventory ?? {},
    agentEntrypoint: 'llms.txt',
    // hds#463: `upgrade` replaces the old free-text breakingChangePolicy.
    componentSpecs,
    // utilities is produced by generate-manifest's tier-based section split
    // (8x-5). build-tokens runs after generate-manifest in `pnpm tokens`, so
    // we forward it through verbatim — losing it here would empty the peer
    // on every tokens rebuild.
    utilities: systemManifest.utilities ?? {},
    tokens: {
      primitive: listedTokens.filter((t) => t.path[0] === 'primitive').map(formatToken),
      semantic: listedTokens.filter((t) => t.path[0] === 'semantic').map(formatToken),
      component: listedTokens.filter((t) => t.path[0] === 'component').map(formatToken),
      role: listedTokens.filter((t) => t.path[0] === 'role').map(formatToken),
    },
    // hds#449: generate-manifest writes publicClasses (scripts/lib/public-classes.mjs);
    // forwarded verbatim, last, where that generator appends it.
    publicClasses: systemManifest.publicClasses ?? [],
  };
}
