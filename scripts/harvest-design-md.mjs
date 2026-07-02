#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/harvest-design-md.mjs  —  STUB (ADR-020 Phase 2)
 *
 * The inverse of scripts/build-design-md.mjs. Where that EMITS a Google
 * `design.md` from HDS tokens (for Aura / hand-off), this INGESTS a
 * `design.md` produced by Aura (aura.build) and distils it into a candidate
 * HDS brand overlay at tenants/<slug>/tokens.json — the "harvest the system,
 * not the code" loop from ADR-020.
 *
 * design.md format: https://github.com/google-labs-code/design.md
 *   YAML front matter (colors / typography / rounded / spacing / components)
 *   + a markdown body of design rationale. Token refs use {colors.primary}.
 *
 *   Usage:
 *     pnpm harvest:design-md --in=<path/to/design.md> --slug=<kebab> [--dry-run]
 *
 * What it does today (the reliable 80%):
 *   - parses the front matter (dependency-free subset parser — see TODO)
 *   - maps the primary/accent colour onto semantic.accent.{rest,hover,
 *     pressed,subtle,content} + surface/border accent, with Light/Dark modes,
 *     in the exact shape of tenants/_template/tokens.json
 *   - captures the markdown rationale + typography/spacing/component notes to
 *     tenants/<slug>/HARVEST.md for the section/pattern inventory
 *
 * TODO (promote from stub — tracked in #67):
 *   - replace the subset parser with a real `yaml` dependency
 *   - replace naive hex shading with an OKLCH ramp (accent hover/pressed/subtle)
 *   - map typography families -> --hds-font-family override block (#61)
 *   - map rounded/spacing -> radius/space token overrides
 *   - map `components` -> component-tier token overrides
 *   - derive Dark-mode values properly instead of a single lightness nudge
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── args ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--in=')) out.in = a.slice(5);
    else if (a.startsWith('--slug=')) out.slug = a.slice(7);
    else if (a.startsWith('--out=')) out.out = a.slice(6);
  }
  return out;
}

function usage(msg) {
  if (msg) console.error(`\n  ${msg}`);
  console.error('\n  Usage: pnpm harvest:design-md --in=<design.md> --slug=<kebab> [--dry-run]\n');
  process.exit(msg ? 1 : 0);
}

// ── minimal front-matter + YAML-subset parser ───────────────────────────────────
// STUB: handles the 2-space-indented key/value + one-to-three-level nesting that
// design.md uses. Not a general YAML parser — swap for the `yaml` package (#67).
function extractFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { data: {}, body: src };
  return { data: parseYamlSubset(m[1]), body: src.slice(m[0].length).trim() };
}

function parseYamlSubset(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    const ci = line.indexOf(':');
    if (ci === -1) continue;
    const key = line.slice(0, ci).trim();
    const rest = line.slice(ci + 1).trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    if (rest === '') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent[key] = unquote(rest);
    }
  }
  return root;
}

const unquote = (v) => v.replace(/^["']|["']$/g, '');

// ── naive hex shading (STUB — replace with OKLCH ramp, #67) ─────────────────────
function shade(hex, pct) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (pct / 100) * 255)));
  const r = adj((n >> 16) & 0xff);
  const g = adj((n >> 8) & 0xff);
  const b = adj(n & 0xff);
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function accentTokenFromHex(hex) {
  const mode = (light, dark) => ({
    $extensions: { 'com.figma.variables': { modes: { Light: light, Dark: dark } } },
  });
  const shades = {
    rest: [hex, shade(hex, 8)],
    hover: [shade(hex, -8), hex],
    pressed: [shade(hex, -16), shade(hex, -8)],
    subtle: [shade(hex, 44), shade(hex, -40)],
    content: [shade(hex, -8), shade(hex, 8)],
  };
  const accent = { $type: 'color' };
  for (const [k, [light, dark]] of Object.entries(shades)) {
    accent[k] = {
      $value: light,
      $description: `Harvested brand accent (${k}) — STUB shading, review before use.`,
      ...mode(light, dark),
    };
  }
  return accent;
}

// ── main ────────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv);
  if (!args.in || !args.slug) usage('--in and --slug are required.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(args.slug)) usage(`--slug must be kebab-case (got "${args.slug}").`);
  const inPath = path.resolve(ROOT, args.in);
  if (!fs.existsSync(inPath)) usage(`design.md not found: ${inPath}`);

  const { data, body } = extractFrontMatter(fs.readFileSync(inPath, 'utf8'));
  const colors = data.colors || {};
  const accentSrc =
    colors.primary || colors.accent || colors.brand || Object.values(colors)[0];
  if (!accentSrc) usage('No colors found in the design.md front matter to harvest an accent from.');

  const overlay = {
    $schema: '../../hirobius.tenant-tokens.schema.json',
    $description: `Harvested from ${path.basename(inPath)} by scripts/harvest-design-md.mjs (STUB). Review accent shading + add typography/spacing overrides before shipping. Source design.md: ${data.name || args.slug}.`,
    semantic: { accent: accentTokenFromHex(accentSrc) },
  };

  // Harvest report — the raw material for the section/pattern inventory (#66).
  const report = [
    `# Harvest — ${data.name || args.slug}`,
    ``,
    `Source: \`${args.in}\` · harvested to \`tenants/${args.slug}/tokens.json\``,
    ``,
    `## Accent`,
    `- primary: \`${accentSrc}\` (mapped to semantic.accent.* — shading is STUB, review)`,
    ``,
    `## Typography (not yet mapped — #61)`,
    ...Object.entries(data.typography || {}).map(
      ([k, v]) => `- ${k}: ${v.fontFamily || '?'} / ${v.fontSize || '?'} / ${v.fontWeight || '?'}`,
    ),
    ``,
    `## Rounded / Spacing (not yet mapped)`,
    `- rounded: ${JSON.stringify(data.rounded || {})}`,
    `- spacing: ${JSON.stringify(data.spacing || {})}`,
    ``,
    `## Components seen (not yet mapped)`,
    ...Object.keys(data.components || {}).map((c) => `- ${c}`),
    ``,
    `## Design rationale (verbatim from design.md — catalog the section recipes here)`,
    ``,
    body || '_(no markdown body)_',
    ``,
  ].join('\n');

  const outDir = path.join(ROOT, 'tenants', args.slug);
  const outTokens = args.out ? path.resolve(ROOT, args.out) : path.join(outDir, 'tokens.json');
  const outReport = path.join(outDir, 'HARVEST.md');

  if (args.dryRun) {
    console.log(`[dry-run] would write ${path.relative(ROOT, outTokens)}:`);
    console.log(JSON.stringify(overlay, null, 2));
    console.log(`\n[dry-run] would write ${path.relative(ROOT, outReport)} (${report.length} chars)`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outTokens, JSON.stringify(overlay, null, 2) + '\n');
  fs.writeFileSync(outReport, report);
  console.log(`✓ harvested accent -> ${path.relative(ROOT, outTokens)}`);
  console.log(`✓ rationale + inventory notes -> ${path.relative(ROOT, outReport)}`);
  console.log(`\n  Next: review the accent shading, then \`pnpm tokens\` to compile the brand overlay.`);
  console.log(`  Then activate it with <html data-brand="${args.slug}"> (see ADR-020).`);
}

main();
