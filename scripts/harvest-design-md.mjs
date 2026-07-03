#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/harvest-design-md.mjs
 *
 * design.md → HDS brand-overlay harvester. The INVERSE of
 * scripts/build-design-md.mjs (which emits DESIGN.md FROM HDS tokens). This
 * script ingests a Google Aura `design.md` file
 * (schema: https://github.com/google-labs-code/design.md — YAML-structured
 * design spec) and distils it into a candidate HDS tenant brand overlay:
 *
 *   tenants/<slug>/tokens.json  — DTCG partial overlay (matches the exact
 *                                 shape of tenants/concrete-creations/tokens.json)
 *   tenants/<slug>/HARVEST.md   — rationale capture: what was mapped, what
 *                                 was inferred/guessed, what needs a human
 *                                 to tighten before this overlay ships.
 *
 * Usage:
 *   pnpm harvest:design-md --in=<path-to-design.md> --slug=<brand-slug>
 *   pnpm harvest:design-md --in=fixtures/harvest-design-md/sample.design.md --slug=acme-co --dry-run
 *   pnpm harvest:design-md --in=... --slug=... --force   (overwrite existing tenants/<slug>/)
 *
 * design.md is a loosely-structured format in the wild (frontmatter YAML,
 * fenced ```yaml blocks, or a bare YAML file) — every field access below is
 * defensive (optional chaining + fallbacks). Anything the parser can't
 * confidently map is recorded in HARVEST.md rather than guessed into
 * tokens.json.
 *
 * Color math: primary/accent color is converted hex → sRGB → linear sRGB →
 * OKLab → OKLCH, stepped in OKLCH space for hover/pressed (Light: darker;
 * Dark: LIGHTER — mirrors how tenants/concrete-creations/tokens.json's Dark
 * modes go lighter for contrast on dark surfaces), gamut-mapped back to
 * sRGB, and re-encoded to hex. See oklchSelfCheck() for a round-trip sanity
 * print (#2563eb → oklch → hex, within ~1 rgb unit).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── CLI arg parsing ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const flags = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    flags[key] = rest.length ? rest.join('=') : true;
  }
  return flags;
}

function usage() {
  console.error('Usage: pnpm harvest:design-md --in=<path-to-design.md> --slug=<brand-slug> [--dry-run] [--force]');
  console.error('  --in        Required. Path to the Aura design.md file to ingest.');
  console.error('  --slug      Required. Lowercase kebab-case tenant slug (e.g. acme-co).');
  console.error('  --dry-run   Print planned writes without touching disk.');
  console.error('  --force     Overwrite an existing tenants/<slug>/ directory.');
}

function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') return '--slug is required';
  if (slug === '_template') return '--slug cannot be "_template" (reserved)';
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    return '--slug must be lowercase kebab-case (e.g. acme-co) — got: ' + slug;
  }
  return null;
}

// ── OKLCH color math ─────────────────────────────────────────────────────────
// Björn Ottosson's OKLab/OKLCH transform (https://bottosson.github.io/posts/oklab/).
// Pure functions; no dependency needed for this math.

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** '#RRGGBB' or '#RGB' → [r,g,b] each 0-255 */
export function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Not a valid 3/6-digit hex color: "${hex}"`);
  }
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function rgbToHex([r, g, b]) {
  const c = (v) =>
    Math.round(clamp01(v / 255) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** [r,g,b] (0-255) → { L, C, H } OKLCH (H in degrees, 0-360). */
export function rgbToOklch([r255, g255, b255]) {
  const r = srgbToLinear(r255 / 255);
  const g = srgbToLinear(g255 / 255);
  const b = srgbToLinear(b255 / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

/** { L, C, H } OKLCH → [r,g,b] (0-255), gamut-mapped into sRGB by chroma reduction. */
export function oklchToRgb({ L, C, H }) {
  const toRgbUnclamped = (l, c, h) => {
    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);

    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.291485548 * b;

    const ll = l_ ** 3;
    const mm = m_ ** 3;
    const ss = s_ ** 3;

    const rLin = +4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
    const gLin = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
    const bLin = -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss;
    return [rLin, gLin, bLin];
  };

  const inGamut = ([rLin, gLin, bLin]) =>
    rLin >= -1e-4 && rLin <= 1 + 1e-4 && gLin >= -1e-4 && gLin <= 1 + 1e-4 && bLin >= -1e-4 && bLin <= 1 + 1e-4;

  // Gamut-map by binary-searching down chroma until the linear-sRGB triple
  // fits inside [0,1]^3. Lightness and hue are preserved; chroma is the only
  // axis that gives ground, matching common CSS Color 4 gamut-mapping guidance.
  let lo = 0;
  let hi = C;
  let best = toRgbUnclamped(L, 0, H);
  if (inGamut(toRgbUnclamped(L, C, H))) {
    best = toRgbUnclamped(L, C, H);
  } else {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const candidate = toRgbUnclamped(L, mid, H);
      if (inGamut(candidate)) {
        best = candidate;
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }

  const [rLin, gLin, bLin] = best;
  return [rLin, gLin, bLin].map((c) => Math.round(clamp01(linearToSrgb(clamp01(c))) * 255));
}

export function hexToOklch(hex) {
  return rgbToOklch(hexToRgb(hex));
}

export function oklchToHex(oklch) {
  return rgbToHex(oklchToRgb(oklch));
}

/** Self-check: known hex round-trips through OKLCH within ~1 rgb unit per channel. */
export function oklchSelfCheck(hex = '#2563EB') {
  const oklch = hexToOklch(hex);
  const roundTripped = oklchToHex(oklch);
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(roundTripped);
  const maxDelta = Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
  const ok = maxDelta <= 1;
  return { hex, oklch, roundTripped, maxDelta, ok };
}

/**
 * Derives the concrete-creations-shaped accent ramp from a single brand hex.
 * Light mode steps darker with interaction depth (rest → hover → pressed);
 * Dark mode steps LIGHTER with interaction depth, and Dark.rest is lifted
 * above Light.rest for contrast against dark surfaces — mirroring
 * tenants/concrete-creations/tokens.json (stone.600/700/800 Light vs.
 * stone.500/450/400 Dark).
 */
export function deriveAccentRamp(hex) {
  const base = hexToOklch(hex);
  const step = (L, C = base.C) => ({ L: clamp01(L), C: Math.max(0, C), H: base.H });

  const light = {
    rest: base,
    hover: step(base.L - 0.06),
    pressed: step(base.L - 0.12),
  };
  const darkRest = step(Math.min(0.92, base.L + 0.14));
  const dark = {
    rest: darkRest,
    hover: step(darkRest.L + 0.05),
    pressed: step(darkRest.L + 0.1),
  };
  // Subtle: a faint tint surface — very light in Light mode, very deep
  // (near-background) in Dark mode, same low-chroma treatment as
  // concrete-creations' stone.100 / stone.950 pairing.
  const subtle = {
    light: step(0.96, base.C * 0.15),
    dark: step(0.16, base.C * 0.2),
  };

  const toHex = (oklch) => oklchToHex(oklch);

  return {
    baseHex: hex,
    baseOklch: base,
    rest: { light: toHex(light.rest), dark: toHex(dark.rest) },
    hover: { light: toHex(light.hover), dark: toHex(dark.hover) },
    pressed: { light: toHex(light.pressed), dark: toHex(dark.pressed) },
    // content mirrors hover in both modes — matches concrete-creations,
    // where semantic.accent.content is identical to semantic.accent.hover
    // in both Light and Dark.
    content: { light: toHex(light.hover), dark: toHex(dark.hover) },
    subtle: { light: toHex(subtle.light), dark: toHex(subtle.dark) },
    // surface.accent is mode-invariant (always the Light rest value) —
    // matches concrete-creations, where CTA fills stay vivid regardless
    // of theme.
    surfaceAccent: { light: toHex(light.rest), dark: toHex(light.rest) },
  };
}

// ── design.md ingestion ──────────────────────────────────────────────────────
/** Deep-merges plain objects; arrays and scalars from `src` win outright. */
function deepMerge(target, src) {
  if (!src || typeof src !== 'object' || Array.isArray(src)) return src ?? target;
  const out = { ...(target && typeof target === 'object' ? target : {}) };
  for (const [k, v] of Object.entries(src)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  }
  return out;
}

/**
 * Extracts every plausible YAML source from a design.md file: the leading
 * `--- ... ---` frontmatter block, and any fenced ```yaml blocks in the
 * markdown body. Returns them in document order so later blocks can
 * override earlier ones on merge (last-wins, matching R3 tenant-overlay
 * convention).
 */
export function extractYamlBlocks(content) {
  const blocks = [];

  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    blocks.push({ source: 'frontmatter', text: frontmatterMatch[1] });
  }

  const fencedRe = /```ya?ml\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = fencedRe.exec(content)) !== null) {
    blocks.push({ source: 'fenced', text: m[1] });
  }

  return blocks;
}

/**
 * Parses a design.md file into a best-effort plain object plus a warnings
 * list. Tries frontmatter/fenced YAML first; if nothing usable comes out,
 * falls back to a bare-YAML parse of the whole file, then to regex
 * extraction for the handful of fields we care about most (color, font
 * family, radius).
 */
export function parseDesignMd(content) {
  const warnings = [];
  const blocks = extractYamlBlocks(content);

  let doc = {};
  let parsedAny = false;
  for (const block of blocks) {
    try {
      const parsed = parseYaml(block.text);
      if (parsed && typeof parsed === 'object') {
        doc = deepMerge(doc, parsed);
        parsedAny = true;
      }
    } catch (e) {
      warnings.push(`Failed to parse ${block.source} YAML block: ${e.message}`);
    }
  }

  const hasUsefulKeys = ['colors', 'color', 'palette', 'typography', 'fonts', 'rounded', 'radius', 'spacing'].some(
    (k) => doc[k] != null,
  );

  if (!parsedAny || !hasUsefulKeys) {
    // Fallback 1: maybe the whole file IS yaml (no fences, no markdown prose).
    try {
      const wholeFile = parseYaml(content);
      if (wholeFile && typeof wholeFile === 'object') {
        doc = deepMerge(doc, wholeFile);
        parsedAny = true;
      }
    } catch (e) {
      warnings.push(`Whole-file YAML fallback failed: ${e.message}`);
    }
  }

  const stillEmpty = Object.keys(doc).length === 0;
  if (stillEmpty) {
    warnings.push('No structured YAML found — falling back to regex extraction over raw markdown.');
    doc = regexFallbackExtract(content, warnings);
  }

  return { doc, warnings, source: parsedAny ? 'yaml' : 'regex' };
}

/**
 * Best-effort regex extraction for loosely-structured design.md variants
 * that don't parse as clean YAML (e.g. hand-written prose with inline
 * "Primary: #2563EB" callouts). Intentionally narrow — only the fields the
 * harvester maps end up here; everything else is left for a human to add
 * to HARVEST.md manually.
 */
function regexFallbackExtract(content, warnings) {
  const doc = {};

  const colorMatch = content.match(/(?:primary|accent|brand)\s*[:=]\s*["']?(#[0-9a-fA-F]{3,8})["']?/i);
  if (colorMatch) {
    doc.colors = { primary: colorMatch[1] };
  } else {
    warnings.push('Regex fallback: no primary/accent/brand hex color found.');
  }

  const fontMatches = [...content.matchAll(/font(?:Family)?\s*[:=]\s*["']?([A-Za-z0-9][A-Za-z0-9 ,'"-]*)/gi)];
  if (fontMatches.length > 0) {
    doc.typography = { body: { fontFamily: fontMatches[0][1].trim() } };
    const mono = fontMatches.find((mm) => /mono|code/i.test(mm[1]));
    if (mono) doc.typography.mono = { fontFamily: mono[1].trim() };
  } else {
    warnings.push('Regex fallback: no fontFamily found.');
  }

  const radiusMatch = content.match(/(?:rounded|radius)[^\n]{0,60}?(\d+(?:\.\d+)?)(px|rem|em)/i);
  if (radiusMatch) {
    doc.rounded = { md: `${radiusMatch[1]}${radiusMatch[2]}` };
  } else {
    warnings.push('Regex fallback: no rounded/radius value found.');
  }

  return doc;
}

/** Resolves a design.md `{path.to.token}` reference against the parsed doc. */
function resolveDesignRef(value, doc, visited = new Set()) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\{([^}]+)\}$/);
  if (!m) return value;
  if (visited.has(value)) return value; // circular guard
  visited.add(value);
  const parts = m[1].split('.');
  let node = doc;
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) return undefined;
  }
  return resolveDesignRef(node, doc, visited);
}

/** value → 'Npx' dimension parseable by build-tokens' dimensionToCSS ({value, unit}). */
export function parseDimensionValue(raw) {
  if (raw == null) return null;
  const str = String(raw).trim();
  const m = str.match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/i);
  if (!m) return null;
  let value = parseFloat(m[1]);
  const unit = (m[2] || 'px').toLowerCase();
  // HDS's radius primitive scale is entirely px. rem/em are converted
  // assuming a 16px root — documented in HARVEST.md so a human can verify.
  if (unit === 'rem' || unit === 'em') value = Math.round(value * 16);
  return { value, unit: 'px', convertedFrom: unit === 'px' ? null : `${m[1]}${unit}` };
}

// ── Field extraction (defensive: every access optional-chained) ────────────

function extractAccentSource(doc) {
  // Highest confidence: an explicit component reference (e.g.
  // components.button-primary.backgroundColor: "{colors.tertiary}") tells us
  // exactly which named color the design system itself treats as the CTA
  // accent — some Aura design.md files use "tertiary", not "primary", for
  // this role (Material-3-style role naming).
  const components = doc?.components ?? {};
  const buttonKey = Object.keys(components).find((k) => /button.*primary|primary.*button|^cta$|^button$/i.test(k));
  if (buttonKey) {
    const bg = components[buttonKey]?.backgroundColor;
    const resolved = resolveDesignRef(bg, doc);
    if (typeof resolved === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(resolved)) {
      return { hex: normalizeHex(resolved), via: `components.${buttonKey}.backgroundColor`, confidence: 'high' };
    }
  }

  const colors = doc?.colors ?? doc?.color ?? doc?.palette ?? {};
  for (const key of ['primary', 'accent', 'brand', 'tertiary']) {
    const v = colors[key];
    if (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) {
      return { hex: normalizeHex(v), via: `colors.${key}`, confidence: 'medium' };
    }
  }

  // Last resort: first hex-looking value in the colors map.
  const firstHexEntry = Object.entries(colors).find(([, v]) => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v));
  if (firstHexEntry) {
    return { hex: normalizeHex(firstHexEntry[1]), via: `colors.${firstHexEntry[0]}`, confidence: 'low' };
  }

  return null;
}

function normalizeHex(hex) {
  let h = hex.trim();
  if (h.length === 9) h = h.slice(0, 7); // drop alpha channel (#RRGGBBAA)
  if (h.length === 5) h = h.slice(0, 4); // drop alpha channel (#RGBA)
  return h.toUpperCase();
}

function extractTypography(doc) {
  const typography = doc?.typography ?? doc?.fonts ?? {};
  const entries = Object.entries(typography).filter(([, v]) => v && typeof v === 'object');

  const bodyEntry =
    entries.find(([k]) => /^body/i.test(k)) ??
    entries.find(([k]) => !/mono|code|display|h[1-6]/i.test(k)) ??
    entries[0];
  const monoEntry = entries.find(([k]) => /mono|code/i.test(k));

  const bodyFamily = bodyEntry?.[1]?.fontFamily ?? (typeof doc?.fontFamily === 'string' ? doc.fontFamily : null);
  const monoFamily = monoEntry?.[1]?.fontFamily ?? null;

  return {
    bodyFamily: bodyFamily ? String(bodyFamily).trim() : null,
    bodyVia: bodyEntry ? `typography.${bodyEntry[0]}.fontFamily` : bodyFamily ? 'fontFamily' : null,
    monoFamily: monoFamily ? String(monoFamily).trim() : null,
    monoVia: monoEntry ? `typography.${monoEntry[0]}.fontFamily` : null,
    allRoles: entries.map(([k]) => k),
  };
}

function extractRadius(doc) {
  const rounded = doc?.rounded ?? doc?.radius ?? doc?.borderRadius ?? {};

  // Highest confidence: an explicit component→rounded reference (mirrors the
  // accent-color heuristic above).
  const components = doc?.components ?? {};
  const buttonKey = Object.keys(components).find((k) => /button.*primary|primary.*button|^cta$|^button$/i.test(k));
  if (buttonKey) {
    const roundedRef = components[buttonKey]?.rounded;
    const resolved = resolveDesignRef(roundedRef, doc);
    const dim = parseDimensionValue(resolved);
    if (dim) {
      return { dim, via: `components.${buttonKey}.rounded`, confidence: 'high' };
    }
  }

  for (const key of ['md', 'button', 'default', 'action', 'sm']) {
    const dim = parseDimensionValue(rounded[key]);
    if (dim) return { dim, via: `rounded.${key}`, confidence: 'medium' };
  }

  const firstEntry = Object.entries(rounded).find(([, v]) => parseDimensionValue(v));
  if (firstEntry) {
    return { dim: parseDimensionValue(firstEntry[1]), via: `rounded.${firstEntry[0]}`, confidence: 'low' };
  }

  return null;
}

function extractSpacingScale(doc) {
  const spacing = doc?.spacing ?? {};
  return Object.entries(spacing)
    .map(([k, v]) => ({ key: k, raw: v, dim: parseDimensionValue(v) }))
    .filter((e) => e.dim);
}

// ── Overlay + HARVEST.md builders ────────────────────────────────────────────

function buildTokensOverlay({ slug, sourcePath, accent, radius, timestamp }) {
  const overlay = {
    $schema: '../../hirobius.tenant-tokens.schema.json',
    $description:
      `${slug} brand overlay — HARVESTED from ${sourcePath} by scripts/harvest-design-md.mjs on ${timestamp}. ` +
      'CANDIDATE OVERLAY: colors are the brand hex(es) found in the source design.md, stepped into an OKLCH ' +
      'rest/hover/pressed ramp. Adrian to review before promoting out of scaffold status — see HARVEST.md ' +
      'for what was mapped, what was inferred, and what still needs a human.',
  };

  if (accent) {
    const ramp = deriveAccentRamp(accent.hex);
    const modes = (light, dark) => ({ $extensions: { 'com.figma.variables': { modes: { Light: light, Dark: dark } } } });

    overlay.semantic = {
      accent: {
        $type: 'color',
        rest: {
          $value: ramp.rest.light,
          $description: `Harvested primary accent (source: ${accent.via}, confidence: ${accent.confidence}).`,
          ...modes(ramp.rest.light, ramp.rest.dark),
        },
        hover: {
          $value: ramp.hover.light,
          $description: 'Harvested accent hover — OKLCH-stepped darker (Light) / lighter (Dark) from rest.',
          ...modes(ramp.hover.light, ramp.hover.dark),
        },
        pressed: {
          $value: ramp.pressed.light,
          $description: 'Harvested accent pressed — deepest OKLCH step from rest.',
          ...modes(ramp.pressed.light, ramp.pressed.dark),
        },
        subtle: {
          $value: ramp.subtle.light,
          $description: 'Harvested accent tint — faint accent surface for hover halos.',
          ...modes(ramp.subtle.light, ramp.subtle.dark),
        },
        content: {
          $value: ramp.content.light,
          $description: 'Harvested accent text color — used for links and accent labels (mirrors hover).',
          ...modes(ramp.content.light, ramp.content.dark),
        },
      },
      color: {
        $type: 'color',
        surface: {
          accent: {
            $value: ramp.surfaceAccent.light,
            $description: 'Harvested accent surface fill (CTAs, primary buttons) — mode-invariant.',
            ...modes(ramp.surfaceAccent.light, ramp.surfaceAccent.dark),
          },
          accentSubtle: {
            $value: ramp.subtle.light,
            $description: 'Harvested faint accent tint surface.',
            ...modes(ramp.subtle.light, ramp.subtle.dark),
          },
        },
        border: {
          accent: {
            $value: ramp.rest.light,
            $description: 'Harvested accent border / focus ring — mirrors accent.rest.',
            ...modes(ramp.rest.light, ramp.rest.dark),
          },
        },
      },
    };
  }

  if (radius) {
    overlay.semantic = overlay.semantic ?? {};
    overlay.semantic.radius = {
      action: {
        $type: 'dimension',
        $value: { value: radius.dim.value, unit: radius.dim.unit },
        $description:
          `Harvested action radius (source: ${radius.via}, confidence: ${radius.confidence})` +
          (radius.dim.convertedFrom ? ` — converted from ${radius.dim.convertedFrom} assuming a 16px root.` : '.'),
      },
    };
  }

  return overlay;
}

function buildHarvestMd({ slug, sourcePath, timestamp, doc, warnings, parseSource, accent, radius, typography, spacingScale }) {
  const lines = [];
  lines.push(`# HARVEST.md — ${slug}`);
  lines.push('');
  lines.push(
    `Generated by \`scripts/harvest-design-md.mjs\` on ${timestamp} from \`${sourcePath}\`. ` +
      'This file records the harvest rationale — what was auto-mapped into `tokens.json`, what was inferred ' +
      'with lower confidence, and what still needs Adrian to tighten by hand before this tenant leaves `status: scaffold`.',
  );
  lines.push('');
  lines.push(`**Parse strategy:** ${parseSource === 'yaml' ? 'structured YAML (frontmatter and/or fenced blocks)' : 'regex fallback (source did not parse as clean YAML)'}.`);
  lines.push('');

  if (warnings.length > 0) {
    lines.push('## Parse warnings');
    lines.push('');
    for (const w of warnings) lines.push(`- ${w}`);
    lines.push('');
  }

  lines.push('## Field mapping summary');
  lines.push('');
  lines.push('| design.md field | HDS token path | Status | Notes |');
  lines.push('|---|---|---|---|');

  if (accent) {
    lines.push(
      `| \`${accent.via}\` (\`${accent.hex}\`) | \`semantic.accent.{rest,hover,pressed,subtle,content}\`, \`semantic.color.surface.{accent,accentSubtle}\`, \`semantic.color.border.accent\` | Mapped (confidence: ${accent.confidence}) | OKLCH-derived ramp — see below. |`,
    );
  } else {
    lines.push('| *(no primary/accent/brand color found)* | `semantic.accent.*` | **Not mapped** | No hex color could be extracted — add `colors.primary` (or `colors.accent`) to the source design.md, or set `semantic.accent.rest` manually. |');
  }

  if (radius) {
    lines.push(
      `| \`${radius.via}\` (\`${radius.dim.value}${radius.dim.unit}\`) | \`semantic.radius.action\` | Mapped (confidence: ${radius.confidence}) | ${radius.dim.convertedFrom ? `Converted from \`${radius.dim.convertedFrom}\` assuming a 16px root — verify.` : 'Direct px value.'} |`,
    );
  } else {
    lines.push('| *(no rounded/radius value found)* | `semantic.radius.action` | **Not mapped** | No usable radius value in source; base HDS default (`{primitive.radius.12}`) applies unless overridden manually. |');
  }

  lines.push(
    `| \`typography.*.fontFamily\` | *(no schema path — see Typography section below)* | Documented only | ${typography.bodyFamily ? `Body candidate: **${typography.bodyFamily}**${typography.bodyVia ? ` (\`${typography.bodyVia}\`)` : ''}.` : 'No body font family found.'} |`,
  );

  lines.push(
    `| \`spacing.*\` | *(no confident 1:1 mapping — see Spacing section below)* | Documented only | ${spacingScale.length > 0 ? `${spacingScale.length} spacing value(s) found in source.` : 'No spacing scale found in source.'} |`,
  );

  lines.push('');

  if (accent) {
    lines.push('## Accent ramp (OKLCH-derived)');
    lines.push('');
    lines.push(`Base color: \`${accent.hex}\` — resolved via \`${accent.via}\` (confidence: **${accent.confidence}**).`);
    lines.push('');
    const ramp = deriveAccentRamp(accent.hex);
    const fmtOklch = (o) => `oklch(${o.L.toFixed(3)} ${o.C.toFixed(3)} ${o.H.toFixed(1)}deg)`;
    lines.push('| Step | Light hex | Dark hex | Light OKLCH | Dark OKLCH |');
    lines.push('|---|---|---|---|---|');
    const rows = [
      ['rest', ramp.rest, hexToOklch(ramp.rest.light), hexToOklch(ramp.rest.dark)],
      ['hover', ramp.hover, hexToOklch(ramp.hover.light), hexToOklch(ramp.hover.dark)],
      ['pressed', ramp.pressed, hexToOklch(ramp.pressed.light), hexToOklch(ramp.pressed.dark)],
      ['subtle', ramp.subtle, hexToOklch(ramp.subtle.light), hexToOklch(ramp.subtle.dark)],
      ['content (=hover)', ramp.content, hexToOklch(ramp.content.light), hexToOklch(ramp.content.dark)],
    ];
    for (const [name, hexPair, lOklch, dOklch] of rows) {
      lines.push(`| ${name} | \`${hexPair.light}\` | \`${hexPair.dark}\` | \`${fmtOklch(lOklch)}\` | \`${fmtOklch(dOklch)}\` |`);
    }
    lines.push('');
    lines.push(
      'Light steps darken with interaction depth (rest → hover → pressed); Dark steps LIGHTEN with interaction ' +
        'depth, and Dark.rest is lifted above Light.rest for contrast against dark surfaces — this mirrors ' +
        '`tenants/concrete-creations/tokens.json` (stone.600/700/800 Light vs. stone.500/450/400 Dark). ' +
        '`semantic.color.surface.accent` stays mode-invariant (always the Light rest value) for CTA fills that ' +
        'must stay vivid regardless of theme, matching the concrete-creations pattern.',
    );
    lines.push('');
    lines.push('**These are candidate hexes, not final brand hexes.** Review against real brand guidelines before promoting.');
    lines.push('');
  }

  lines.push('## Typography — NOT auto-wired into tokens.json');
  lines.push('');
  lines.push(
    'The tenant token overlay schema (`hirobius.tenant-tokens.schema.json`) has no semantic-tier path for ' +
      'font-family: HDS binds fonts via the `--hds-font-family` / `--hds-font-family-mono` CSS custom ' +
      'properties (see `src/styles/theme.css`, formalized by issue #61), which live at the primitive/CSS layer, ' +
      'not the DTCG token graph a tenant overlay can override (R1 forbids primitive-tier overrides). This is ' +
      'therefore a **documented manual override recipe**, not a `tokens.json` entry:',
  );
  lines.push('');
  if (typography.bodyFamily) {
    lines.push('```css');
    lines.push(`[data-tenant="${slug}"] {`);
    lines.push(`  --hds-font-family: '${typography.bodyFamily}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`);
    if (typography.monoFamily) {
      lines.push(`  --hds-font-family-mono: '${typography.monoFamily}', 'Geist Mono', 'Courier New', monospace;`);
    }
    lines.push('}');
    lines.push('```');
    lines.push('');
    lines.push(`Body font source: \`${typography.bodyVia}\` → **${typography.bodyFamily}**.`);
    if (typography.monoFamily) {
      lines.push(`Mono font source: \`${typography.monoVia}\` → **${typography.monoFamily}**.`);
    } else {
      lines.push('No mono/code font role found in source — mono stays at the HDS default (`Geist Mono`).');
    }
    if (typography.allRoles.length > 0) {
      lines.push('');
      lines.push(`Other typography roles present in source (not mapped — HDS's type ramp is fixed): ${typography.allRoles.map((r) => `\`${r}\``).join(', ')}.`);
    }
  } else {
    lines.push('No font family could be extracted from the source design.md — add `typography.body-md.fontFamily` (or similar) and re-run.');
  }
  lines.push('');
  lines.push(
    'Wire this by setting the two CSS custom properties above wherever the tenant scope selector ' +
      `(\`[data-tenant="${slug}"]\`) is styled — e.g. a small tenant-specific CSS file, or inline via ` +
      '`<HdsThemeProvider>`\'s font override prop if the consuming app uses it. This is intentionally kept out of ' +
      'the DTCG-validated `tokens.json` so `check-tenant-tokens.mjs` has nothing false to validate against.',
  );
  lines.push('');

  lines.push('## Spacing — NOT auto-mapped');
  lines.push('');
  if (spacingScale.length > 0) {
    lines.push('Raw spacing scale found in source:');
    lines.push('');
    lines.push('| Key | Raw value | Parsed |');
    lines.push('|---|---|---|');
    for (const s of spacingScale) {
      lines.push(`| \`spacing.${s.key}\` | \`${s.raw}\` | ${s.dim.value}${s.dim.unit}${s.dim.convertedFrom ? ` (from ${s.dim.convertedFrom})` : ''} |`);
    }
    lines.push('');
  } else {
    lines.push('No `spacing.*` scale found in the source design.md.');
    lines.push('');
  }
  lines.push(
    'This was deliberately **not** auto-mapped: design.md\'s `spacing` is a single flat scale (e.g. `sm`/`md`/`lg`), ' +
      'while HDS\'s `semantic.space.*` is a five-tier hierarchy (`subgrid`, `component`, `layout`, `section`, ' +
      '`sidebar`) with role-specific leaves (e.g. `semantic.space.component.padding`, `semantic.space.layout.tight`). ' +
      'There is no confident 1:1 correspondence between a flat scale step and a specific HDS spacing role — guessing ' +
      'here risks silently mis-scaling real layout. If the brand truly needs a denser/looser rhythm than the HDS ' +
      'base, pick the specific `semantic.space.*` leaf that matches the intended UI role and override it by hand; ' +
      'see `docs/architecture/tenant-token-overlay-format.md` for the override mechanics.',
  );
  lines.push('');

  if (Object.keys(doc?.components ?? {}).length > 0) {
    lines.push('## Component hints found in source (informational only)');
    lines.push('');
    lines.push(
      `The source design.md declared ${Object.keys(doc.components).length} component(s): ` +
        `${Object.keys(doc.components).map((k) => `\`${k}\``).join(', ')}. These were only consulted to disambiguate ` +
        'the accent color and action radius (see above) — HDS component styling is token-driven and does not ' +
        'take per-component design.md overrides.',
    );
    lines.push('');
  }

  lines.push('## Next steps for Adrian');
  lines.push('');
  lines.push('- [ ] Verify the harvested accent hex(es) against the real brand guidelines (these are OKLCH-derived candidates, not final).');
  lines.push('- [ ] Wire the `--hds-font-family` / `--hds-font-family-mono` recipe above if this tenant needs a custom typeface.');
  lines.push('- [ ] Pick specific `semantic.space.*` overrides by hand if the brand needs non-default rhythm.');
  lines.push('- [ ] Create `tenants/' + slug + '/metadata.json` (not generated by this tool) — see `tenants/_template/metadata.json`.');
  lines.push('- [ ] Run `pnpm tokens` to compile this overlay into `src/styles/tenants.css` once reviewed.');
  lines.push('- [ ] Flip `status` from `scaffold` to `active` in metadata.json when ready to ship.');
  lines.push('');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function harvest({ inPath, slug, dryRun = false, force = false }) {
  const sourcePath = resolve(inPath);
  const content = readFileSync(sourcePath, 'utf8');
  const { doc, warnings, source: parseSource } = parseDesignMd(content);

  const accent = extractAccentSource(doc);
  const radius = extractRadius(doc);
  const typography = extractTypography(doc);
  const spacingScale = extractSpacingScale(doc);

  const timestamp = new Date().toISOString();
  const relativeSource = sourcePath.startsWith(ROOT) ? sourcePath.slice(ROOT.length + 1) : sourcePath;

  const overlay = buildTokensOverlay({ slug, sourcePath: relativeSource, accent, radius, timestamp });
  const harvestMd = buildHarvestMd({
    slug,
    sourcePath: relativeSource,
    timestamp,
    doc,
    warnings,
    parseSource,
    accent,
    radius,
    typography,
    spacingScale,
  });

  const tenantDir = join(ROOT, 'tenants', slug);
  const tokensPath = join(tenantDir, 'tokens.json');
  const harvestPath = join(tenantDir, 'HARVEST.md');

  const summary = {
    slug,
    sourcePath: relativeSource,
    accent,
    radius,
    typography,
    spacingScale,
    warnings,
    parseSource,
    tokensPath,
    harvestPath,
  };

  if (dryRun) {
    return { ...summary, dryRun: true };
  }

  if (existsSync(tenantDir) && !force) {
    throw new Error(`tenants/${slug}/ already exists. Re-run with --force to overwrite, or choose a different --slug.`);
  }

  mkdirSync(tenantDir, { recursive: true });
  writeFileSync(tokensPath, JSON.stringify(overlay, null, 2) + '\n');
  writeFileSync(harvestPath, harvestMd);

  return { ...summary, dryRun: false };
}

function printSummary(result) {
  console.log(`\ndesign.md → HDS harvest: ${result.slug}`);
  console.log(`  source: ${result.sourcePath} (parsed via ${result.parseSource})`);
  console.log(`  accent: ${result.accent ? `${result.accent.hex} (via ${result.accent.via}, confidence: ${result.accent.confidence})` : 'NOT FOUND'}`);
  console.log(`  radius: ${result.radius ? `${result.radius.dim.value}${result.radius.dim.unit} (via ${result.radius.via}, confidence: ${result.radius.confidence})` : 'NOT FOUND'}`);
  console.log(`  typography body: ${result.typography.bodyFamily ?? 'NOT FOUND'}`);
  console.log(`  typography mono: ${result.typography.monoFamily ?? '(none — HDS default kept)'}`);
  console.log(`  spacing scale entries: ${result.spacingScale.length}`);
  if (result.warnings.length > 0) {
    console.log(`  warnings (${result.warnings.length}):`);
    for (const w of result.warnings) console.log(`    - ${w}`);
  }
  if (result.dryRun) {
    console.log(`\n[dry-run] would write: ${result.tokensPath}`);
    console.log(`[dry-run] would write: ${result.harvestPath}`);
  } else {
    console.log(`\n✓ wrote ${result.tokensPath}`);
    console.log(`✓ wrote ${result.harvestPath}`);
    console.log(`\nNext: node scripts/check-tenant-tokens.mjs   (validate)`);
    console.log(`      node scripts/build-tokens.mjs            (compile)`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flags = parseArgs(process.argv);

  const check = oklchSelfCheck('#2563EB');
  console.log(
    `OKLCH self-check: ${check.hex} → oklch(${check.oklch.L.toFixed(3)} ${check.oklch.C.toFixed(3)} ${check.oklch.H.toFixed(1)}deg) → ${check.roundTripped} (max Δrgb: ${check.maxDelta}, ${check.ok ? 'OK' : 'FAILED'})`,
  );
  if (!check.ok) {
    console.error('OKLCH round-trip self-check exceeded tolerance — aborting.');
    process.exit(1);
  }

  if (!flags.in) {
    console.error('Error: --in is required');
    usage();
    process.exit(1);
  }

  const slugErr = validateSlug(flags.slug);
  if (slugErr) {
    console.error('Error:', slugErr);
    usage();
    process.exit(1);
  }

  if (!existsSync(resolve(String(flags.in)))) {
    console.error(`Error: --in file not found: ${flags.in}`);
    process.exit(1);
  }

  try {
    const result = harvest({
      inPath: String(flags.in),
      slug: String(flags.slug),
      dryRun: Boolean(flags['dry-run']),
      force: Boolean(flags.force),
    });
    printSummary(result);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
