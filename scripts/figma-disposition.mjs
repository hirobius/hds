#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-disposition.mjs — which code components should exist in the Figma
 * library, and which should not.
 *
 * WHY THIS EXISTS. `pnpm figma:links --check` reports "44 of 139 components
 * link a Figma node", which reads as an 95-component hole. It is not. Three
 * different things are mixed into that denominator:
 *
 *   1. Components that genuinely want a Figma counterpart and lack one.
 *   2. Compound members — CardHeader, DialogTitle, TabsList. Figma models
 *      these as SLOTS INSIDE the parent component set, not as separate
 *      components: the published library has one `Card` COMPONENT_SET (plus
 *      two deliberately extracted parts) and one `Dialog` COMPONENT, against
 *      8 and 10 code exports respectively. Creating a Figma component per
 *      member would add ~21 assets no designer would ever place.
 *   3. Layout primitives — Box, Stack, Cluster, Switcher. These render no
 *      pixels of their own; in Figma their behaviour IS auto-layout. The
 *      library's `Layout Primitives` page (111:7) already reflects that: it
 *      documents Container, Grid, Stack and Page as SPEC CARDS — key/value
 *      text frames for max-width, gutter, gap, inset — rather than drawing
 *      them as components. So this classification is not a new proposal for
 *      those four; it is what the library already does, written down.
 *
 *      (The REST inventory reports that page as 0 assets, because it counts
 *      COMPONENT and COMPONENT_SET nodes and the page holds neither. Reading
 *      "0 assets" as "empty" is wrong, and was worth correcting: the page is
 *      documented, just not with components.)
 *
 * So "1:1 with Figma" is the right goal against the right denominator, and
 * this computes that denominator from evidence rather than opinion:
 *
 *   - compound membership comes from the source itself (`Card.Header =
 *     CardHeader`), via the same parser check-component-docs uses
 *   - tier, category and `hidden` come from the manifest
 *   - current Figma links come from each component's `@figma` tag
 *
 * The classification RULES were ratified in hds#235 (closed 2026-09-22):
 * invisible `layout` primitives and compound `slot`s stay out, and the whole
 * `library` missing-list gets built. What hds#235 ratified is the rules, not a
 * specific integer, and the integers have since moved: it was read against
 * 17 `layout` / 86 `library`, then three components were found to be
 * misapplying the rules (Frame and OverflowList paint, Sketch is lab chrome),
 * leaving 14 `layout` / 88 `library`. Those three are recorded in `overrides`
 * with their reasons. Trust this tool's current output over any count quoted
 * in prose, including this comment.
 *
 * So this output is now the ratified set, not a proposal. Correct an individual
 * component by adding it to `figma/disposition.json`'s `overrides` with a
 * reason — a name listed there wins over the inferred class, permanently.
 *
 * Usage:
 *   pnpm figma:disposition            human-readable summary
 *   pnpm figma:disposition --json     machine-readable
 *   pnpm figma:disposition --write    (re)write figma/disposition.json
 *
 * @module figma-disposition
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectCompoundMembers } from './lib/check-component-docs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/hds-manifest.json');
const COMPONENT_DIR = path.join(ROOT, 'src/app/components');
const OUT = path.join(ROOT, 'figma/disposition.json');
const MAPPING_OVERRIDES = path.join(ROOT, 'figma/mapping-overrides.json');

/**
 * Components that Figma publishes as their own asset even though code models
 * them as a compound part — read from figma/mapping-overrides.json, which
 * already records exactly this pairing with a reason per entry.
 *
 * Card.Progress, Card.Metric and TabsTrigger are all slots by the source's
 * shape, but the library has a real COMPONENT for each, so they are not
 * missing from Figma and a gate must not chase them. Reading the file rather
 * than hardcoding three names means a new override is honoured the day it
 * lands.
 *
 * @returns {Set<string>} code-side names that already have a Figma asset
 */
export function mappedByOverride() {
  if (!existsSync(MAPPING_OVERRIDES)) return new Set();
  const entries = JSON.parse(readFileSync(MAPPING_OVERRIDES, 'utf8')).overrides ?? [];
  const names = new Set();
  for (const entry of entries) {
    // `mapsTo` is the code side: "Card.Progress" -> CardProgress, or a bare
    // name like "TabsTrigger". Anything parenthesised is prose, not a name.
    const target = String(entry.mapsTo ?? '')
      .split('(')[0]
      .trim();
    if (!target) continue;
    names.add(target.replace(/\./g, ''));
    names.add(target);
  }
  return names;
}

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const write = argv.includes('--write');

/**
 * Classes a component can fall into. Only `library` components are expected to
 * have a Figma node; everything else is deliberately absent, and a gate should
 * not report its absence as a gap.
 */
export const CLASSES = {
  library: 'Belongs in the Figma library as its own component or component set.',
  slot: 'A compound member. Figma models it as a slot inside its parent, not as a separate component.',
  layout:
    'Invisible layout primitive. Renders no pixels of its own; in Figma this is auto-layout, not a component.',
  internal:
    'Not part of the consumer-facing surface (utility, template, doc tooling, hidden, or lab).',
};

const INTERNAL_CATEGORIES = new Set([
  'Compiler',
  'Internal',
  'Utilities',
  'Utility',
  'Theming',
  'Motion',
  'Uncategorized',
]);

/**
 * Every component name that some module attaches to another as a compound
 * member, read from the source rather than guessed from the name. `CardHeader`
 * qualifies because card.tsx contains `Card.Header = CardHeader`; a component
 * that merely starts with another's name does not.
 *
 * @param {string} dir - component directory
 * @returns {Map<string, string>} member name → the parent it hangs off
 */
export function collectSlotMembers(dir) {
  const slots = new Map();
  if (!existsSync(dir)) return slots;

  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.tsx') || /\.(test|spec)\.tsx$/.test(entry)) continue;
    const source = readFileSync(path.join(dir, entry), 'utf8');

    // Namespaced compounds: `Card.Header = CardHeader`.
    for (const [parent, members] of collectCompoundMembers(source)) {
      for (const component of members.values()) slots.set(component, parent);
    }

    // Flat compounds. Tabs follows the Radix/shadcn shape — `Tabs`,
    // `TabsList`, `TabsTrigger` and `TabsContent` are four sibling exports
    // with no `Tabs.List = ...` anywhere, so the namespaced pass above sees
    // nothing. Figma publishes two assets for that page (`Tabs` and
    // `TabTrigger`), not four, which is the tell: they are parts of one
    // component regardless of how the module spells it.
    //
    // A sibling counts as a part only if another export in the SAME file is a
    // strict name prefix of it. Cross-file name collisions are not enough —
    // that would make `Table` a parent of `TableRow` in an unrelated module.
    const exported = [...source.matchAll(/^export (?:const|function) ([A-Z][A-Za-z0-9]*)/gm)].map(
      (m) => m[1],
    );
    for (const name of exported) {
      const parent = exported.find(
        (p) => p !== name && name.startsWith(p) && name.length > p.length,
      );
      if (parent && !slots.has(name)) slots.set(name, parent);
    }
  }

  return slots;
}

/**
 * @param {object} spec - the component's manifest entry
 * @param {string} name
 * @param {Map<string, string>} slots
 * @returns {keyof CLASSES}
 */
export function classify(name, spec, slots, figmaMapped = new Set()) {
  if (spec.hidden) return 'internal';
  if (spec.tier === 'utility' || spec.tier === 'template') return 'internal';
  if (INTERNAL_CATEGORIES.has(spec.category)) return 'internal';
  // A slot Figma publishes anyway is a library component: the asset exists,
  // so it is not missing, whatever the code's composition shape says.
  if (figmaMapped.has(name)) return 'library';
  // Slot before layout: a compound member of a layout component is still a slot.
  if (slots.has(name)) return 'slot';
  // `category: Layout` is too blunt on its own — Divider draws a line, Surface
  // is a visual container, Disclosure has a chevron and a border, and all
  // three already carry a Figma node. An existing node is the strongest
  // evidence available that a designer judged the component visual, so it
  // outranks the category. Only an unlinked Layout component is presumed to be
  // an invisible primitive.
  if (spec.category === 'Layout' && !spec.figmaUrl) return 'layout';
  return 'library';
}

export function buildDisposition() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const specs = manifest.componentSpecs ?? {};
  const slots = collectSlotMembers(COMPONENT_DIR);
  const figmaMapped = mappedByOverride();

  const overrides = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).overrides ?? {}) : {};

  const components = Object.entries(specs)
    .map(([name, spec]) => {
      const inferred = classify(name, spec, slots, figmaMapped);
      const override = overrides[name];
      return {
        name,
        class: override?.class ?? inferred,
        inferred,
        overridden: Boolean(override),
        overrideReason: override?.reason ?? null,
        parent: slots.get(name) ?? null,
        category: spec.category ?? null,
        tier: spec.tier ?? null,
        figmaUrl: spec.figmaUrl ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const library = components.filter((c) => c.class === 'library');

  return {
    components,
    summary: {
      total: components.length,
      byClass: Object.fromEntries(
        Object.keys(CLASSES).map((k) => [k, components.filter((c) => c.class === k).length]),
      ),
      libraryLinked: library.filter((c) => c.figmaUrl || figmaMapped.has(c.name)).length,
      libraryMissing: library.filter((c) => !c.figmaUrl && !figmaMapped.has(c.name)).length,
      // A node on something this table says should not be in the library —
      // the other direction of the same mismatch.
      unexpectedlyLinked: components.filter((c) => c.class !== 'library' && c.figmaUrl).length,
    },
  };
}

// Everything below is the CLI. Guarded because check-sync-map imports
// buildDisposition and mappedByOverride from this module: an unguarded report
// printed its whole banner into that gate's stdout and corrupted its --json
// output. Same shape as the check-link-integrity finding in #255 — a module
// that runs its own gate on import is not importable.
const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const result = buildDisposition();

  if (write) {
    const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
    writeFileSync(
      OUT,
      `${JSON.stringify(
        {
          $comment:
            'The ratified disposition (hds#235, closed 2026-09-22 — the rules are ratified, not the integers). Generated by pnpm figma:disposition --write. `class` decides whether a component is expected to carry an @figma node: only `library` is. To ratify a different answer for one component, add it to `overrides` with a reason — an override wins over the inferred class and survives regeneration.',
          classes: CLASSES,
          generatedAt: new Date().toISOString().slice(0, 10),
          overrides: existing.overrides ?? {},
          summary: result.summary,
          components: result.components.map(
            ({ inferred, overridden, overrideReason, ...rest }) => ({
              ...rest,
              ...(overridden ? { overriddenFrom: inferred, overrideReason } : {}),
            }),
          ),
        },
        null,
        2,
      )}\n`,
    );
    console.log(`✓ figma:disposition — wrote ${path.relative(ROOT, OUT)}`);
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  const { summary, components } = result;
  console.log(`\nfigma:disposition — ${summary.total} components\n${'─'.repeat(64)}`);
  for (const [cls, description] of Object.entries(CLASSES)) {
    console.log(`  ${cls.padEnd(9)} ${String(summary.byClass[cls]).padStart(3)}   ${description}`);
  }

  console.log(`\nThe 1:1 target is the ${summary.byClass.library} \`library\` components:`);
  console.log(`  linked to Figma : ${summary.libraryLinked}`);
  console.log(`  missing a node  : ${summary.libraryMissing}`);
  if (summary.unexpectedlyLinked > 0) {
    console.log(`  linked but not classed library: ${summary.unexpectedlyLinked}`);
  }

  const missing = components.filter(
    (c) => c.class === 'library' && !c.figmaUrl && !mappedByOverride().has(c.name),
  );
  if (missing.length) {
    const byCat = new Map();
    for (const c of missing) byCat.set(c.category, [...(byCat.get(c.category) ?? []), c.name]);
    console.log(`\nMissing a Figma node (${missing.length}):`);
    for (const [cat, names] of [...byCat].sort()) {
      console.log(
        `  ${String(cat).padEnd(12)} ${String(names.length).padStart(2)}  ${names.join(', ')}`,
      );
    }
  }

  console.log(
    `\nThe classification rules were ratified in hds#235. To correct one component,` +
      `\nadd it to figma/disposition.json's \`overrides\` with a reason.\n`,
  );
}
