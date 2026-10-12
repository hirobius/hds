#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/scaffold-tenant.mjs
 *
 * Bootstraps a new direction directory from directions/_template (ADR-035: a
 * direction is a shared art direction any consumer can select; a client's
 * brand never lives here, it is applied at the consumer through the brand
 * bridge). Emits directions/<slug>/tokens.json, metadata.json and README.md
 * pre-filled with the supplied args. The metadata keeps the deployment and
 * legal groups empty at tier 1, which is exactly what the Figma Brand gate
 * (scripts/lib/figma-brand-modes.mjs, directionProblems) accepts.
 *
 *   node scripts/scaffold-tenant.mjs --slug=warm-stone --primary-color=#8A5A2B
 *   pnpm scaffold:tenant --slug=warm-stone --primary-color=#8A5A2B
 *   pnpm scaffold:tenant --slug=warm-stone --primary-color=#8A5A2B --dry-run
 *
 * Options
 *   --slug=<kebab-case>        Required. Directory name and the data-brand value.
 *   --primary-color=<#hex>     Required. 6-digit hex for semantic.accent.rest.
 *   --display-name=<string>    Optional. Human direction name (defaults to title-case slug).
 *   --dry-run                  Print planned writes without touching disk.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRECTIONS_DIR = path.join(ROOT, 'directions');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usage() {
  console.error('Usage: pnpm scaffold:tenant --slug=<kebab-case> --primary-color=<#hex> [options]');
  console.error('  --slug           Required. Lowercase kebab-case (e.g. acme-co).');
  console.error('  --primary-color  Required. 6-digit hex (e.g. #2563EB).');
  console.error('  --display-name   Optional. Human direction name.');
  console.error('  --dry-run        Print planned writes without touching disk.');
}

/** Parse --key=value and --flag args from process.argv */
function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      flags[key] = rest.length ? rest.join('=') : true;
    }
  }
  return flags;
}

function validateSlug(slug) {
  if (!slug) return '--slug is required';
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return '--slug must be lowercase kebab-case (e.g. acme-co)';
  if (slug === '_template') return '--slug cannot be "_template"';
  return null;
}

function validateHex(hex) {
  if (!hex) return '--primary-color is required';
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '--primary-color must be a 6-digit hex (e.g. #2563EB)';
  return null;
}

/** Derive a hover shade (~15% darker) from a hex by reducing each channel. */
function darken(hex, factor = 0.85) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const d = (c) =>
    Math.round(c * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${d(r)}${d(g)}${d(b)}`;
}

/** Derive a pressed shade (~30% darker). */
function pressed(hex) {
  return darken(hex, 0.7);
}

/** Derive a subtle tint (mix toward white). */
function tint(hex, factor = 0.92) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = (c) =>
    Math.round(c + (255 - c) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}

/** Convert kebab-case to Title Case display name */
function toDisplayName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Build the tokens.json overlay for the new direction. */
function buildTokens(slug, hex) {
  const hoverHex = darken(hex);
  const pressedHex = pressed(hex);
  const subtleHex = tint(hex);

  return {
    $schema: '../../hirobius.tokens.schema.json',
    $description: `${slug} direction overlay (ADR-035). Overrides semantic.accent.* with the direction's accent. Run \`pnpm tokens\` to compile; see docs/architecture/tenant-token-overlay-format.md.`,
    semantic: {
      accent: {
        $type: 'color',
        rest: {
          $value: hex,
          $description: `${slug} primary accent — rest state.`,
          $extensions: {
            'com.figma.variables': {
              modes: { Light: hex, Dark: hoverHex },
            },
          },
        },
        hover: {
          $value: hoverHex,
          $description: `${slug} primary accent — hover state (auto-derived; refine if needed).`,
          $extensions: {
            'com.figma.variables': {
              modes: { Light: hoverHex, Dark: hex },
            },
          },
        },
        pressed: {
          $value: pressedHex,
          $description: `${slug} primary accent — pressed state (auto-derived; refine if needed).`,
          $extensions: {
            'com.figma.variables': {
              modes: { Light: pressedHex, Dark: hoverHex },
            },
          },
        },
        subtle: {
          $value: subtleHex,
          $description: `${slug} accent tint — hover halos and surface accents (auto-derived).`,
          $extensions: {
            'com.figma.variables': {
              modes: { Light: subtleHex, Dark: pressedHex },
            },
          },
        },
        content: {
          $value: hoverHex,
          $description: `${slug} accent text color — links and accent labels (auto-derived).`,
          $extensions: {
            'com.figma.variables': {
              modes: { Light: hoverHex, Dark: hex },
            },
          },
        },
      },
      color: {
        $type: 'color',
        surface: {
          accent: {
            $value: hex,
            $description: `${slug} accent surface fill — CTAs, primary buttons (auto-derived).`,
            $extensions: {
              'com.figma.variables': {
                modes: { Light: hex, Dark: hex },
              },
            },
          },
          accentSubtle: {
            $value: subtleHex,
            $description: `${slug} faint accent tint surface (auto-derived).`,
            $extensions: {
              'com.figma.variables': {
                modes: { Light: subtleHex, Dark: pressedHex },
              },
            },
          },
        },
        border: {
          accent: {
            $value: hex,
            $description: `${slug} accent border and focus ring (auto-derived).`,
            $extensions: {
              'com.figma.variables': {
                modes: { Light: hex, Dark: hoverHex },
              },
            },
          },
        },
      },
    },
  };
}

/** Build the direction's metadata.json: tier 1, deployment and legal present and empty, which is what directionProblems accepts. */
function buildMetadata(slug, displayName, hex) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    $schema: '../../hirobius.tenant-metadata.schema.json',
    slug,
    displayName,
    tagline: `${displayName} — a direction (ADR-035), not a client.`,
    tier: 1,
    deployment: { vercelProject: null, primaryDomain: null, previewDomain: null },
    brand: { primaryHex: hex, accentName: 'brand-accent', logoPath: null },
    legal: { entity: null, jurisdiction: null, stripeAccountKind: null },
    createdAt: today,
    status: 'scaffold',
    _notes: [
      `Scaffolded with: pnpm scaffold:tenant --slug=${slug} --primary-color=${hex}`,
      'A direction is never a client: keep deployment and legal empty and tier at 1, or the Figma Brand gate refuses it (ADR-035).',
      'Accent hexes in tokens.json are derived from --primary-color; refine hover/pressed/subtle before listing the direction in figma/brand-modes.json.',
    ],
  };
}

/** Build the direction's README.md. */
function buildReadme(slug, displayName, hex) {
  return `# ${displayName} — Direction Overlay

Direction (ADR-035): a shared art direction any consumer can select with
\`<html data-brand="${slug}">\` (or \`TenantProvider\`). Not a client: a
client's brand is applied at the consumer through
\`@hirobius/design-system/brand\` and is never filed here.

## Quick reference

| Key | Value |
|---|---|
| Slug | \`${slug}\` |
| Primary hex | \`${hex}\` |
| Token overlay | \`tokens.json\` |
| Metadata | \`metadata.json\` (tier 1, deployment and legal empty) |

## Finishing setup

1. Open \`tokens.json\` and refine the hover / pressed / subtle shades
   (the derived defaults are safe but rarely perfect).
2. Run \`pnpm tokens\` from the repo root to compile the overlay into
   \`src/styles/tenants.css\`.
3. Verify: \`rg '\\[data-brand="${slug}"\\]' src/styles/tenants.css\`
4. To offer it in Figma, list the slug in \`figma/brand-modes.json\` (at most
   nine directions; see \`figma/README.md\`).

## Token override scope

This overlay targets **semantic tier and above only**:
- \`semantic.*\` — color roles, typography, motion, spacing
- \`component.*\` — component-specific slots (add as needed)

Do not override \`primitive.*\`. See
\`docs/architecture/tenant-token-overlay-format.md\` for the rationale.
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const flags = parseArgs(process.argv);
  const dryRun = Boolean(flags['dry-run']);

  const slugErr = validateSlug(flags.slug);
  if (slugErr) {
    console.error('Error:', slugErr);
    usage();
    process.exit(1);
  }

  const hexErr = validateHex(flags['primary-color']);
  if (hexErr) {
    console.error('Error:', hexErr);
    usage();
    process.exit(1);
  }

  const slug = flags.slug;
  const primaryHex = flags['primary-color'].toUpperCase().replace(/^([^#])/, '#$1');
  const displayName = flags['display-name'] ?? toDisplayName(slug);

  const directionDir = path.join(DIRECTIONS_DIR, slug);

  if (!dryRun && fs.existsSync(directionDir)) {
    console.error(
      `Error: directions/${slug} already exists. Remove it first or choose a different slug.`,
    );
    process.exit(1);
  }

  const tokensPath = path.join(directionDir, 'tokens.json');
  const metadataPath = path.join(directionDir, 'metadata.json');
  const readmePath = path.join(directionDir, 'README.md');

  const tokensContent = JSON.stringify(buildTokens(slug, primaryHex), null, 2) + '\n';
  const metadataContent =
    JSON.stringify(buildMetadata(slug, displayName, primaryHex), null, 2) + '\n';
  const readmeContent = buildReadme(slug, displayName, primaryHex);

  if (dryRun) {
    console.log('[dry-run] would create directory:', `directions/${slug}/`);
    console.log(
      '[dry-run] would write:',
      `directions/${slug}/tokens.json`,
      `(${tokensContent.length} bytes)`,
    );
    console.log(
      '[dry-run] would write:',
      `directions/${slug}/metadata.json`,
      `(${metadataContent.length} bytes)`,
    );
    console.log(
      '[dry-run] would write:',
      `directions/${slug}/README.md`,
      `(${readmeContent.length} bytes)`,
    );
    console.log('[dry-run] primary-color:', primaryHex);
    console.log('[dry-run] hover (auto):', darken(primaryHex));
    console.log('[dry-run] pressed (auto):', pressed(primaryHex));
    console.log('[dry-run] subtle tint (auto):', tint(primaryHex));
    return;
  }

  fs.mkdirSync(directionDir, { recursive: true });
  fs.writeFileSync(tokensPath, tokensContent);
  fs.writeFileSync(metadataPath, metadataContent);
  fs.writeFileSync(readmePath, readmeContent);

  console.log(`\nScaffolded direction: ${slug}`);
  console.log('  tokens.json  →', tokensPath);
  console.log('  metadata.json →', metadataPath);
  console.log('  README.md    →', readmePath);
  console.log('\nNext steps:');
  console.log(
    '  1. Edit directions/' + slug + '/tokens.json  — refine hover/pressed/subtle shades',
  );
  console.log('  2. Run: pnpm tokens');
  console.log('  3. Verify: rg \'\\[data-brand="' + slug + '"\\]\' src/styles/tenants.css');
  console.log(
    '  4. Optional: list "' +
      slug +
      '" in figma/brand-modes.json to offer it as a Figma Brand mode',
  );
  console.log(
    '\nKeep deployment and legal empty in metadata.json: a direction is never a client (ADR-035).',
  );
}

export { buildTokens, buildMetadata, buildReadme, validateSlug, validateHex };

if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))
) {
  main();
}
