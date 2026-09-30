#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-llms-txt.mjs
 *
 * Generates the machine-readable HDS system map for AI agents.
 * Source inputs:
 *   - public/hds-manifest.json
 *   - src/app/data/component-api.json
 *   - hirobius.tokens.json (token source of truth; referenced, not inlined)
 *
 * Output:
 *   - public/llms.txt
 *   - llms.txt (repo-root mirror for local tooling)
 *   - public/llms-full.txt (llms.txt + full DESIGN.md + props digest)
 *   - public/llms/{layout,tokens,scroll,components}.txt (topic slices)
 *
 * Every section is written once (as a `## ` block of the llms.txt template) and
 * the slices pick blocks by heading, so llms.txt and the slices share text.
 */

import { mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { writeStableArtifact } from './lib/stable-artifact.mjs';
import { fileURLToPath } from 'url';
import { writeManifest as writeComponentApiManifest } from './generate-component-api.mjs';
import { buildTokenQuickReference } from './build-token-quick-reference.mjs';
import { buildWhichOneWhen } from './lib/which-one-when.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const manifestPath = join(ROOT, 'public', 'hds-manifest.json');
const componentApiPath = join(ROOT, 'src', 'app', 'data', 'component-api.json');

function phasePercent(criteria = []) {
  if (!criteria.length) return 0;
  const weightedCount = criteria.reduce((sum, item) => {
    if (item.done) return sum + 1;
    if (item.partial) return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((weightedCount / criteria.length) * 100);
}

const layoutRecipeSteps = [
  '`Page` (or `Container`/`Center` for a full-bleed, non-page surface) for the outermost width constraint. Never import `Container` directly inside `src/app/pages/**` — use `Page`, which wraps it and owns vertical rhythm.',
  '`Stack` (vertical rhythm between sections) or `Grid` (two-dimensional/column layout) for the structural skeleton. One section = one Section/Stack — never add a second wrapper to fake a section boundary.',
  'Reach for a named every-layout primitive before hand-rolling flex/grid math for a common intent: `Cluster` (wrapping row of same-ish things), `Center` (centered max-width column with optional gutter), `Sidebar` (fixed-width rail + fluid content, no media query), `Switcher` (row that flips to a column below a threshold, no media query), `Cover` (full-height shell with a centered main region), `Frame` (aspect-ratio-locked clipped media box), `Bleed` (controlled negative margin to escape a parent padding).',
  '`Surface` for any background-bearing, padded wrapper (card, panel, inset). Never a raw element with backgroundColor + padding hand-rolled inline.',
  'Use the screen patterns (`@hirobius/design-system/patterns`) for the parts every screen repeats: `PageHeader` once at the top (breadcrumb, `heading2` title, status, actions), `MetricTiles` for any row of headline numbers, `FormActions` for a form footer (primary right-most and last in DOM order, destructive on the far left). Pick between `MetricTiles`, `Stat`, `Card.Metric` and `StatusTile` with the "Which one, when" table in `DESIGN.md`.',
  '`Box` `sx` LAST — only for genuinely one-off layout that no named primitive covers. `sx` spacing/color keys MUST be HDS token keys, never raw hex/px.',
];

const layoutNegativeRules = [
  'No inline margins on children to fake spacing between siblings — gap/spacing on the parent (Stack/Grid/Cluster/Switcher/Sidebar/Cover) owns rhythm, not margin on the child.',
  'No raw px or hex values in any layout or color prop — every spacing value comes from the semantic gap scale (`tight | normal | inset | spacious`, or a component/subgrid step) and every color comes from a `semantic.color.*` token.',
  'No repeated outlined cards as the default structure for roadmap/status/process/overview UI — use open bands, dividers, rails, disclosures, and whitespace instead.',
];

const scrollRecipeSteps = [
  '`Reveal` (CSS `animation-timeline: view()`) for fade/slide/scale-in-on-enter — zero JS, zero deps. Pick `animation` from `fade | fade-up | fade-down | scale`. Content is visible by DEFAULT; the effect applies only where `animation-timeline` is supported and the user has not requested reduced motion — never gate visibility behind either.',
  '`Pin` (`position: sticky`) for a pinned scroll scene — the dependency-free basis for the "tall section + sticky child" pattern (GSAP\'s `pin: true`, done with zero JS). Give the pinned element a TALLER scrolling parent (e.g. `height: 300vh`) so it has room to travel; `top` is a CSS length offset, not a spacing token.',
  '`useScrollProgress` (from `@hirobius/design-system/scroll`) only when the 0→1 scroll value is needed in React — cross-element choreography, canvas/WebGL, or a Motion (`motion/react`) `useTransform` binding that CSS `animation-timeline` cannot express. Thin, SSR-guarded wrapper over Motion `useScroll`; adds no new dependency.',
  '`SmoothScroll` (from `@hirobius/design-system/scroll`, `lenis` as an OPTIONAL peer dep) only for opt-in momentum ("inertia") scrolling, mounted once at the app/site root. Never imported from the main barrel — consumers who skip it pay nothing. Reduced-motion-first: Lenis is not instantiated when the user prefers reduced motion, unless `ignoreReducedMotion` is set for a deliberate art-directed exception.',
  'Do not adopt GSAP/ScrollTrigger, and do not wire Lenis directly outside `SmoothScroll`, inside the core library — the CSS + Motion stack above covers reveal/pin/scrub without new dependencies. Bespoke GSAP/Lenis/WebGL scenes stay app-level/downstream (marketing sites, the clients factory), composed from these primitives (ADR-021, #116).',
];

const scrollNegativeRules = [
  'No hand-rolled IntersectionObserver reveal-on-scroll logic — use `Reveal`.',
  'No hand-rolled `position: sticky` scroll scenes — use `Pin`.',
  'No GSAP/ScrollTrigger or bespoke Lenis wiring inside `@hirobius/design-system` — those stay app-level/downstream, composed from `Reveal`/`Pin`/`useScrollProgress`/`SmoothScroll`.',
  'Every scroll effect must degrade to fully visible/static content — never gate content visibility behind `animation-timeline` support or a scroll listener with no fallback.',
];

const tokenRules = [
  'Component inventory: read `public/hds-manifest.json`. Do not duplicate inventories in markdown.',
  'Component prop API: read `src/app/data/component-api.json`. Do not inline prop tables in `llms.txt`.',
  'Token source of truth: read `hirobius.tokens.json` (W3C DTCG). Prefer `semantic.*` and `component.*` tokens over `primitive.*` for product UI.',
  'CSS variables: token path `semantic.color.surface.page` maps to `var(--semantic-color-surface-page)` (see generated token refs).',
  'Docs: use `DESIGN.md` as the default lean visual spec. Load `DESIGN-HANDOFF.md` only on-demand.',
  'Load `TOKEN_GOVERNANCE.md` and `SYSTEMS_REGISTRY.md` only on-demand (when explicitly requested or required by the task).',
  'Read `public/llms.txt` before touching code so AI workflows start from the same system map as humans.',
];

const SLICES = [
  { name: 'layout', blurb: 'screen layout recipe, card anatomy, elevation roles' },
  { name: 'tokens', blurb: 'token rules and the quick token reference' },
  { name: 'scroll', blurb: 'scroll-driven section recipe' },
  { name: 'components', blurb: 'component inventory pointer, API pointer, props digest' },
];

/** Split generated text into `## ` sections (heading line + body). */
function parseSections(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      cur = { title: line.slice(3), lines: [line] };
      out.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  return out.map((sec) => ({ title: sec.title, body: sec.lines.join('\n').trimEnd() }));
}

const clip = (v, n) => {
  const one = String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
};

/** Compact per-component digest: no examples, defaults clipped. */
function buildPropsDigest(api) {
  const comps = api.components ?? {};
  return Object.keys(comps)
    .sort()
    .map((name) => {
      const c = comps[name];
      const first = String(c.description ?? '').split('\n')[0];
      const props = (c.props ?? [])
        .map((p) => {
          const def = p.default != null && p.default !== '' ? ` = ${clip(p.default, 40)}` : '';
          return `  - ${p.name}: ${clip(p.type, 80)}${def}`;
        })
        .join('\n');
      return `### ${name}\n${clip(first, 160)}${props ? `\n${props}` : ''}`;
    })
    .join('\n\n');
}

/**
 * @param {{ write?: boolean }} [opts] write:false performs no file writes and
 *   returns { repoRelPath: text } for every output (used as a freshness check).
 */
export function generateLlmsTxt({ write = true } = {}) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (write) writeComponentApiManifest();
  // Keep as an existence check (and to ensure the generated artifact is present).
  const componentApi = JSON.parse(readFileSync(componentApiPath, 'utf8'));

  const tokensPath = join(ROOT, 'hirobius.tokens.json');
  const quickTokenReference = buildTokenQuickReference(tokensPath);

  const phaseLines = manifest.phases
    .map((phase) => {
      const percent = phasePercent(phase.criteria);
      const criteriaSummary = phase.criteria
        .map((item) => `${item.done ? 'done' : item.partial ? 'partial' : 'todo'}: ${item.label}`)
        .join('; ');
      return `- ${phase.id}. ${phase.label} - ${percent}% - ${phase.description}\n  - Criteria: ${criteriaSummary}`;
    })
    .join('\n');

  const patternLines =
    Array.isArray(manifest.patternInventory) && manifest.patternInventory.length > 0
      ? manifest.patternInventory.map((name) => `- ${name}`).join('\n')
      : '';
  const patternSection = patternLines ? `## Pattern Inventory\n\n${patternLines}\n\n` : '';

  const whichOneWhenLines = buildWhichOneWhen(manifest.componentSpecs ?? {});
  const whichOneWhenSection = whichOneWhenLines
    ? `## Which one when\n\nOne line per component that declares when to use it (\`@usage\` / \`@useInstead\` in its JSDoc). Full detail, including \`usage.whenNot\`, \`keyboard\` and \`aiRules\`, is in \`public/hds-manifest.json\` and \`src/app/data/component-api.json\`.\n\n${whichOneWhenLines}\n\n`
    : '';

  const iconNames = manifest.iconSet?.names ?? [];
  const hdsNames = new Set([
    ...(manifest.componentInventory ?? []),
    ...(manifest.patternInventory ?? []),
  ]);
  const iconCollisions = iconNames.filter((n) => hdsNames.has(n));
  const collisionNote = iconCollisions.length
    ? `\n\nName collisions: ${iconCollisions.map((n) => `\`${n}\``).join(' and ')} share names with HDS components; alias the icon: \`import { ${iconCollisions.map((n) => `${n} as ${n}Icon`).join(', ')} } from '${manifest.iconSet.subpath}'\`.`
    : '';
  const lucideVersion = String(pkg.dependencies?.['lucide-react'] ?? '').replace(/^[^\d]*/, '');
  const iconSection = iconNames.length
    ? `## Icons

Icons come from the curated subpath \`${manifest.iconSet.subpath}\`; nothing extra to install.

\`\`\`tsx
import { IconButton } from '@hirobius/design-system';
import { Ellipsis } from '${manifest.iconSet.subpath}';

<IconButton icon={Ellipsis} label="Row actions" />
\`\`\`

Rule: icon-only actions (row menus, close, edit) use \`IconButton\`; do not hand-roll a button with a glyph or text "...".

Names: ${iconNames.join(', ')}

Legacy names map to canonical ones: MoreHorizontal -> Ellipsis, MoreVertical -> EllipsisVertical, AlertTriangle -> TriangleAlert, Home -> House, Filter -> Funnel.${collisionNote} For an icon outside the set, install \`lucide-react@${lucideVersion}\` (same version keeps the \`LucideIcon\` type identical).

`
    : '';

  const generated = new Date().toISOString();
  const SLICE_INDEX = SLICES.map((sl) => `- \`public/llms/${sl.name}.txt\` - ${sl.blurb}`).join(
    '\n',
  );

  const txt = `# Hirobius Design System

Generated: ${generated}
Primary sources: \`public/hds-manifest.json\`, \`src/app/data/component-api.json\`, \`hirobius.tokens.json\`

## System Architecture

- Engine: ${manifest.systemSpecs.engine}
- Icons: ${manifest.systemSpecs.icons}
- Tokens: ${manifest.systemSpecs.tokens}
- Styling: ${manifest.systemSpecs.styling}
- Token pipeline: \`hirobius.tokens.json\` -> \`pnpm tokens\` -> generated CSS vars + generated TS constants
- Docs pipeline: \`public/hds-manifest.json\` + \`src/app/data/component-api.json\` -> reflective docs pages
- AI entrypoint: read \`public/llms.txt\` before editing code

## Phase Snapshot

${phaseLines}

## Component Inventory (Source Of Truth)

This file intentionally does not embed the full component list to avoid duplication and excess context.

- Canonical inventory + metadata: read \`public/hds-manifest.json\`.
- If you see references to \`public/manifest.json\`, treat it as an optional alias; in this repo prefer \`public/hds-manifest.json\`.

## Component API (Source Of Truth)

This file intentionally does not embed prop tables or long-form API docs.

- Detailed prop types, unions, defaults, and descriptions: read \`src/app/data/component-api.json\`.
- Runtime behavior: read the actual component source under \`src/app/components/\` (and associated styles).

${whichOneWhenSection}## Tokens (Primary Source Of Truth)

- Primary token source of truth: \`hirobius.tokens.json\` (W3C DTCG).
- Prefer \`semantic.*\` and \`component.*\` tokens for product UI. Use \`primitive.*\` only when editing the token system itself.
- CSS variable naming convention: token path \`semantic.color.surface.page\` maps to \`var(--semantic-color-surface-page)\`.

## Quick Token Reference

${quickTokenReference}

## How To Lay Out A Screen

Canonical skeleton, outermost to innermost:

${layoutRecipeSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Negative rules (apply everywhere, checked by \`scripts/audit-tokens.mjs --full\`, \`check-hardcoded-spacing.mjs\`, \`check-hardcoded-colors.mjs\`):

${layoutNegativeRules.map((rule) => `- ${rule}`).join('\n')}

Density: put \`data-density="compact"\` on the same \`[data-hds]\` scope element (or \`<html>\`) to tighten \`semantic.space.scale.*\`, surface padding and region gutter; \`Table\` follows it unless given a \`density\` prop.

Reference: \`docs/architecture/variant-contract.md\` for structural/semantic/size/density variance; \`src/app/data/component-api.json\` for every layout primitive's full prop table and \`@ai-rules\` guidance.

## How To Build A Scroll-Driven Section

Canonical primitives, cheapest-first (CSS before JS, JS before an opt-in dependency):

${scrollRecipeSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Negative rules:

${scrollNegativeRules.map((rule) => `- ${rule}`).join('\n')}

Reference: \`src/app/components/reveal.tsx\`, \`src/app/components/pin.tsx\`, \`src/scroll/\` (\`use-scroll-progress.ts\`, \`smooth-scroll.tsx\`), ADR-021, and \`src/stories/patterns-scroll.stories.tsx\` for golden-path examples.

## HDS Card Anatomy (mandatory — every property is non-negotiable)

When building any card component or card-like surface, ALL of the following rules apply. There is no creative latitude here — deviation from any property is a bug.

| Property | Required value | Forbidden |
| --- | --- | --- |
| Background | \`var(--semantic-color-surface-raised)\` | Custom colors, gradients, tinted fills, any non-token value |
| Border | \`1px solid var(--semantic-color-border-default)\` | \`box-shadow\` as an elevation substitute |
| Border radius | \`var(--primitive-radius-8)\` (8 px) | 12 px, 16 px, 20 px, \`rounded-full\`, or any other value |
| Padding | \`var(--semantic-space-surface-padding)\` or \`<Surface padding="component">\` | Raw pixel values, Tailwind spacing classes, ad hoc insets |
| Shadow | Resting cards: none (\`elevation.flat\`). Interactive lifted state: \`shadow.subtle\` via \`elevation.raised\`. Never reach for shadow values directly — bind via \`var(--semantic-elevation-{role}-shadow)\` | Raw \`box-shadow\` values, \`drop-shadow\`, glow, or any depth effect not bound to a role token |
| Title | \`hds.typeStyles.heading3\` / \`<Text variant="heading3">\` | Any other type style for the primary card heading |
| Subtitle / meta | \`hds.typeStyles.caption\` / \`<Text variant="caption">\` + \`var(--semantic-color-content-secondary)\` | Primary color, body size, or custom color for secondary text |
| Hover (interactive cards only) | \`transform: scale(1.02)\` CSS transform | Background color change, fill swap, border color shift on hover |

**NEVER on any card surface:** gradient backgrounds, glow effects, frosted glass (\`backdrop-filter: blur\`), decorative overlays, gradient borders, colored or tinted card backgrounds, inner shadows, patterned backgrounds, AI-aesthetic shimmer or particle effects. Never reach for shadow values directly — bind to a \`semantic.elevation.*\` role bundle so surface + shadow + border stay coherent.

## Elevation roles

| Surface | Role token | Background | Shadow | Border |
| --- | --- | --- | --- | --- |
| Card / panel resting | \`semantic.elevation.flat\` | \`surface.page\` | none | \`border.subtle\` 1px |
| Card / panel lifted (interactive only) | \`semantic.elevation.raised\` | \`surface.raised\` | \`shadow.subtle\` | none |
| Popover / dropdown / tooltip | \`semantic.elevation.floating\` | \`surface.raised\` | \`shadow.floating\` | none |
| Dialog / sheet / modal | \`semantic.elevation.overlay\` | \`surface.overlay\` | \`shadow.overlay\` | none |

Cards default to \`elevation.flat\`. Popovers/tooltips/dropdowns use \`elevation.floating\`. Dialogs/sheets use \`elevation.overlay\`. Interactive cards lift to \`elevation.raised\` on hover. Never combine \`raised\` with a border — depth is one mechanism (border OR shadow), not both stacked.

## Slices And Full Bundle

Load only what the task needs. Same text as this file, split by topic:

${SLICE_INDEX}

- \`public/llms-full.txt\` - this file + the full \`DESIGN.md\` + a compact props digest for every component.

Paths in this file that begin with \`docs/architecture/\`, \`src/app/components/\`, \`src/scroll/\`, \`src/stories/\` or under \`scripts/\`, or that name \`public/manifest.json\`, \`DESIGN-HANDOFF.md\`, \`TOKEN_GOVERNANCE.md\` or \`SYSTEMS_REGISTRY.md\` exist only in the source repo, not in the npm package. Everything under "Default context" below ships in the package.

## Context Loading Rules (Credit Efficiency)

Default context (load first):

- \`public/llms.txt\`
- \`public/hds-manifest.json\`
- \`src/app/data/component-api.json\`
- \`hirobius.tokens.json\`
- \`DESIGN.md\`

On-demand only (load only if explicitly requested or the task clearly requires it):

- \`DESIGN-HANDOFF.md\`
- \`TOKEN_GOVERNANCE.md\`
- \`SYSTEMS_REGISTRY.md\`

${patternSection}${iconSection}## Token Rules

${tokenRules.map((rule) => `- ${rule}`).join('\n')}

## Agent Workflow

1. Read \`public/llms.txt\` and the relevant source files.
2. Check \`public/hds-manifest.json\` for component metadata and phase status.
3. Check \`src/app/data/component-api.json\` for prop names, unions, defaults, and descriptions.
4. Use \`hirobius.tokens.json\` (and generated CSS vars) for styling decisions, never raw hex or ad hoc values.
5. Run \`pnpm tokens:audit\` or \`pnpm build\` after changes that affect docs, tokens, or manifests.

## Key Files

- \`public/hds-manifest.json\` - canonical machine-readable system inventory, metadata, and token snapshot
- \`src/app/data/component-api.json\` - generated prop reference (source of truth for prop docs)
- \`hirobius.tokens.json\` - token source of truth (W3C DTCG)
- \`public/llms.txt\` - machine-readable AI context index
- \`DESIGN.md\` - lean agent-facing visual spec (default)
- \`DESIGN-HANDOFF.md\` - verbose visual language mirror (on-demand only)
`;

  const sections = parseSections(txt);
  const pick = (titles) =>
    titles
      .map((t) => {
        const found = sections.find((sec) => sec.title.startsWith(t));
        if (!found) throw new Error(`generate-llms-txt: no section "${t}"`);
        return found.body;
      })
      .join('\n\n');

  const digest = buildPropsDigest(componentApi);
  const digestSection = `## Component Props Digest\n\nCompact: name, first line of description, then prop: type = default. Full detail in \`src/app/data/component-api.json\`.\n\n${digest}`;

  const designMd = readFileSync(join(ROOT, 'DESIGN.md'), 'utf8').trim();
  const full = `${txt.trimEnd()}\n\n---\n\n# DESIGN.md (full)\n\n${designMd}\n\n---\n\n${digestSection}\n`;

  const slices = {
    layout: pick(['How To Lay Out A Screen', 'HDS Card Anatomy', 'Elevation roles']),
    tokens: pick(['Tokens (', 'Quick Token Reference', 'Token Rules']),
    scroll: pick(['How To Build A Scroll-Driven Section']),
    components: `${pick(['Component Inventory', 'Component API'])}\n\n${digestSection.trimEnd()}`,
  };

  const sliceHeader = (name) =>
    `# Hirobius Design System - ${name} slice\n\nSee \`public/llms.txt\` for the index. Generated from the same sections as llms.txt.\n\n`;
  const outputs = {
    'public/llms.txt': txt,
    'llms.txt': txt,
    'public/llms-full.txt': full,
  };
  for (const sl of SLICES) {
    outputs[`public/llms/${sl.name}.txt`] = `${sliceHeader(sl.name)}${slices[sl.name]}\n`;
  }
  if (!write) return outputs;

  mkdirSync(join(ROOT, 'public', 'llms'), { recursive: true });
  for (const [rel, text] of Object.entries(outputs)) writeStableArtifact(join(ROOT, rel), text);

  return txt;
}

export function main() {
  generateLlmsTxt();
  console.log('✓ public/llms.txt, public/llms-full.txt, public/llms/*.txt');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
