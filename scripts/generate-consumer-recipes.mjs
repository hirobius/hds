/**
 * generate-consumer-recipes.mjs — machine-readable consumer recipes (roadmap E2).
 *
 * Derives per-component usage recipes from public/hds-manifest.json's
 * componentSpecs (the source of truth) so consuming agents can discover
 * components, props, variants, and a11y rules WITHOUT scraping source. Output is
 * regenerable, never hand-authored.
 *
 * Run: node scripts/generate-consumer-recipes.mjs   (pnpm docs:recipes)
 * Out: docs/agentic/consumer-recipes.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/hds-manifest.json'), 'utf8'));
const specs = manifest.componentSpecs ?? {};

// Published tiers only — utilities and hidden/doc-exempt specs aren't consumer API.
const PUBLISHED_TIERS = new Set(['primitive', 'pattern', 'template']);

function simplifyProps(props) {
  if (!props) return undefined;
  const out = {};
  for (const [name, p] of Object.entries(props)) {
    out[name] = {
      type: p.type,
      ...(p.values ? { values: p.values } : {}),
      ...(p.default !== undefined ? { default: p.default } : {}),
      ...(p.optional ? { optional: true } : {}),
    };
  }
  return out;
}

const recipes = {};
let count = 0;
for (const [name, s] of Object.entries(specs)) {
  if (!PUBLISHED_TIERS.has(s.tier) || s.hidden || s.docExempt) continue;
  recipes[name] = {
    tier: s.tier,
    category: s.category,
    import: `import { ${name} } from '@hirobius/design-system';`,
    summary: s.description,
    ...(s.requiredProps?.length ? { requiredProps: s.requiredProps } : {}),
    ...(s.variantAxes?.length ? { variantAxes: s.variantAxes } : {}),
    props: simplifyProps(s.props),
    ...(s.a11yRules?.length ? { a11y: s.a11yRules } : {}),
  };
  count++;
}

const payload = {
  $note: 'Generated from public/hds-manifest.json by scripts/generate-consumer-recipes.mjs. Do not edit by hand.',
  version: manifest.version,
  source: 'public/hds-manifest.json#componentSpecs',
  count,
  recipes,
};

const outDir = resolve(ROOT, 'docs/agentic');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'consumer-recipes.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(`✓ docs/agentic/consumer-recipes.json — ${count} published components (props + variants + a11y rules)`);
