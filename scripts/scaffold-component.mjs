#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/scaffold-component.mjs
 *
 * One-command component ingestion recipe. From a single name it emits a fully
 * wired component: the `.tsx` (cva skeleton + token bindings), a live demo on
 * the docs site (a DEMOS entry in docs-site/components/component-demos.tsx and
 * its name in docs-site/lib/previewed-components.ts), a smoke test, a manifest
 * entry and the component-api.json extraction, plus a Swiss-canon fixture. Makes "ingest a new component" a single
 * standardized step (ADR-020 §5).
 *
 * No Figma Code Connect file is emitted. The commented `figma.connect()` stub
 * this used to write targets the parser format Figma retired in
 * @figma/code-connect 2.0.0, and a stub with no Figma node URL maps nothing.
 * Code Connect templates (`<name>.figma.ts`, v2 template format) are authored
 * once the component exists in the Figma library.
 *
 *   pnpm hds:new Example
 *   pnpm hds:new Example --dry-run
 *   pnpm scaffold:component Example      # legacy alias, identical behaviour
 *
 * --dry-run     prints the planned writes without touching disk (CI-safe; this
 *               is what the unit's validationCmd uses).
 * --no-generate skips the manifest + component-api regeneration finalize step
 *               (useful when batching several scaffolds before one regen).
 *
 * Manifest mutation is atomic — read once, mutate in memory, write once — and
 * is then reconciled by the real `generate-manifest` extraction on finalize.
 * Component name must be plain PascalCase — the `Hds` prefix is retired
 * (fleet-wide de-prefix migration; see CHANGELOG).
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates/component-template.tsx');
const COMPONENT_DIR = path.join(ROOT, 'src/app/components');
const DEMOS_PATH = path.join(ROOT, 'docs-site/components/component-demos.tsx');
const PREVIEWED_PATH = path.join(ROOT, 'docs-site/lib/previewed-components.ts');
const MANIFEST_PATH = path.join(ROOT, 'public/hds-manifest.json');
const FIXTURE_ROOT = path.join(ROOT, 'fixtures/swiss-canon');

function usage() {
  console.error('Usage: pnpm hds:new <PascalCaseName> [--dry-run] [--no-generate]');
  console.error('  Component name must be plain PascalCase (the Hds prefix is retired)');
  console.error('  e.g. pnpm hds:new Example');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noGenerate = args.includes('--no-generate');
  const positional = args.filter((a) => !a.startsWith('--'));
  return { name: positional[0], dryRun, noGenerate };
}

function validateName(name) {
  if (!name) return 'name required';
  if (!/^_*[A-Z][A-Za-z0-9]+$/.test(name)) {
    return 'name must be PascalCase (e.g. Example). Leading underscores allowed for sandbox/dry-run names.';
  }
  const stripped = name.replace(/^_+/, '');
  if (stripped.startsWith('Hds')) {
    return 'the Hds prefix is retired — use a plain PascalCase name (e.g. Example, not HdsExample)';
  }
  return null;
}

function kebabCase(name) {
  return name
    .replace(/^_+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function camelCase(name) {
  const stripped = name.replace(/^_+/, '');
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

function buildSpecStub(name) {
  return {
    category: 'Component',
    filePath: `src/app/components/${kebabCase(name)}.tsx`,
    description: `${name} — Swiss-canonical component scaffold. Body emphasis is font-medium (500), never bold. Color hierarchy uses opacity on a single hue (semantic.color.content.primary/secondary/tertiary), never a second hue. Spacing on the 8px grid only.`,
    hidden: false,
    props: {
      variant: { type: 'enum', values: ['primary', 'secondary', 'tertiary'], default: 'primary' },
    },
    propConstraints: {
      variant: { type: 'enum', values: ['primary', 'secondary', 'tertiary'] },
    },
    requiredProps: [],
    a11yRules: [],
    allowedChildren: ['*'],
    preview: { exportName: name, sizing: 'panel' },
    tokenMapping: {},
  };
}

function fixtureInputJsx(name) {
  return `<${name} variant="primary" />\n`;
}

const FIXTURE_EXPECTED = {
  ok: true,
  errors: [],
};

// ── Source builders ────────────────────────────────────────────────────────────

function buildComponentSource(name) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return template.replace(/__NAME__/g, name).replace(/__CAMEL__/g, camelCase(name));
}

/** The live demo the docs page renders, as a function for component-demos.tsx. */
function buildDemoSource(name) {
  return `function ${name}Demo() {
  return (
    <div style={demoStack}>
      <${name} variant="primary">Primary</${name}>
      <${name} variant="secondary">Secondary</${name}>
      <${name} variant="tertiary">Tertiary</${name}>
    </div>
  );
}

`;
}

/**
 * Registers the demo: the import, the function, the DEMOS entry and the name in
 * PREVIEWED_COMPONENTS (the registry is typed against that list, so a demo and
 * its name travel together). Pure text in, text out; throws on a file that no
 * longer has the anchors, so a reshuffled docs-site fails loudly instead of
 * half-registering.
 */
export function addDemoToSources(name, { demos, previewed }) {
  const anchor = (text, needle, file) => {
    const at = text.indexOf(needle);
    if (at === -1) throw new Error(`${file}: expected to find \`${needle}\``);
    return at;
  };
  if (new RegExp(`\\b${name}Demo\\b`).test(demos) || previewed.includes(`'${name}',`)) {
    throw new Error(`${name} already has a docs demo`);
  }
  const insertAt = (text, at, chunk) => text.slice(0, at) + chunk + text.slice(at);

  let nextDemos = demos;
  nextDemos = insertAt(
    nextDemos,
    anchor(nextDemos, "} from '@hirobius/design-system';", 'component-demos.tsx'),
    `  ${name},\n`,
  );
  nextDemos = insertAt(
    nextDemos,
    anchor(nextDemos, 'export const DEMOS:', 'component-demos.tsx'),
    buildDemoSource(name),
  );
  const demosAt = anchor(nextDemos, 'export const DEMOS:', 'component-demos.tsx');
  const close = anchor(nextDemos.slice(demosAt), '\n};', 'component-demos.tsx') + demosAt;
  nextDemos = insertAt(nextDemos, close + 1, `  ${name}: ${name}Demo,\n`);

  const nextPreviewed = insertAt(
    previewed,
    anchor(previewed, '  // Patterns (', 'previewed-components.ts'),
    `  '${name}',\n`,
  );
  return { demos: nextDemos, previewed: nextPreviewed };
}

function buildTestSource(name) {
  const kebab = kebabCase(name);
  // Plain-DOM assertions (no jest-dom) — matches the repo's test convention.
  return `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${kebab}';

describe('${name}', () => {
  it('renders children', () => {
    render(<${name}>hello</${name}>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('reflects the variant on the data attribute', () => {
    render(<${name} variant="secondary">x</${name}>);
    expect(screen.getByText('x').getAttribute('data-variant')).toBe('secondary');
  });
});
`;
}

// ── Plan ───────────────────────────────────────────────────────────────────────

function plan(name) {
  const kebab = kebabCase(name);
  return {
    componentPath: path.join(COMPONENT_DIR, `${kebab}.tsx`),
    testPath: path.join(COMPONENT_DIR, `${kebab}.test.tsx`),
    fixtureDir: path.join(FIXTURE_ROOT, `${kebab}-clean`),
    fixtureInputPath: path.join(FIXTURE_ROOT, `${kebab}-clean`, 'input.jsx'),
    fixtureExpectedPath: path.join(FIXTURE_ROOT, `${kebab}-clean`, 'expected.json'),
  };
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function rel(p) {
  return path.relative(ROOT, p);
}

function main() {
  const { name, dryRun, noGenerate } = parseArgs(process.argv);
  const err = validateName(name);
  if (err) {
    console.error('Error:', err);
    usage();
    process.exit(1);
  }

  const paths = plan(name);
  const componentSource = buildComponentSource(name);
  const manifest = readManifest();

  if (manifest.componentSpecs?.[name]) {
    console.error(
      `Error: componentSpecs["${name}"] already exists in manifest. Pick a different name or update by hand.`,
    );
    process.exit(1);
  }
  for (const p of [paths.componentPath, paths.testPath]) {
    if (fs.existsSync(p)) {
      console.error(`Error: ${rel(p)} already exists.`);
      process.exit(1);
    }
  }

  const spec = buildSpecStub(name);
  for (const p of [DEMOS_PATH, PREVIEWED_PATH]) {
    if (!fs.existsSync(p)) {
      console.error(`Error: ${rel(p)} is missing — the docs demo cannot be registered.`);
      process.exit(1);
    }
  }
  // Computed before anything is written, so a docs-site that lost an anchor
  // fails here and leaves no half-scaffolded component behind.
  let docsSources;
  try {
    docsSources = addDemoToSources(name, {
      demos: fs.readFileSync(DEMOS_PATH, 'utf8'),
      previewed: fs.readFileSync(PREVIEWED_PATH, 'utf8'),
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  if (dryRun) {
    console.log(
      '[dry-run] would write component:  ',
      rel(paths.componentPath),
      `(${componentSource.length} bytes)`,
    );
    console.log('[dry-run] would add docs demo:    ', rel(DEMOS_PATH), `(${name}Demo)`);
    console.log('[dry-run] would add previewed name:', rel(PREVIEWED_PATH), `('${name}')`);
    console.log('[dry-run] would write test:       ', rel(paths.testPath));
    console.log(
      '[dry-run] would add manifest entry:',
      name,
      `(desc ${spec.description.length} chars)`,
    );
    console.log('[dry-run] would write fixture:    ', rel(paths.fixtureInputPath));
    console.log('[dry-run] would write fixture:    ', rel(paths.fixtureExpectedPath));
    console.log(
      '[dry-run] would run:              ',
      'generate-manifest + generate-component-api (unless --no-generate)',
    );
    return;
  }

  fs.writeFileSync(paths.componentPath, componentSource);
  console.log('wrote', rel(paths.componentPath));
  fs.writeFileSync(DEMOS_PATH, docsSources.demos);
  console.log('registered demo in', rel(DEMOS_PATH));
  fs.writeFileSync(PREVIEWED_PATH, docsSources.previewed);
  console.log('registered name in', rel(PREVIEWED_PATH));
  fs.writeFileSync(paths.testPath, buildTestSource(name));
  console.log('wrote', rel(paths.testPath));

  manifest.componentSpecs = manifest.componentSpecs || {};
  manifest.componentSpecs[name] = spec;
  writeManifest(manifest);
  console.log('seeded manifest stub for', name);

  fs.mkdirSync(paths.fixtureDir, { recursive: true });
  fs.writeFileSync(paths.fixtureInputPath, fixtureInputJsx(name));
  fs.writeFileSync(paths.fixtureExpectedPath, JSON.stringify(FIXTURE_EXPECTED, null, 2) + '\n');
  console.log('wrote fixture', rel(paths.fixtureDir));

  if (!noGenerate) {
    console.log('\nExtracting manifest + component-api from the new source…');
    for (const script of ['generate-manifest.mjs', 'generate-component-api.mjs']) {
      execFileSync('node', [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
    }
  }

  console.log('\nNext steps:');
  console.log(
    '  1. Add',
    `export * from './app/components/${kebabCase(name)}';`,
    'to src/index.ts',
  );
  console.log('  2. Flesh out variant logic in', rel(paths.componentPath));
  console.log(
    '  3. Flesh out the demo (' + name + 'Demo) in',
    rel(DEMOS_PATH),
    '- it imports the package export from step 1, so the docs site does not build before it',
  );
  console.log(
    '  4. For a docs page: list it in mcp/core-set.mjs (a ratified core component) or re-export',
    'it from src/patterns.ts (a pattern), then pnpm manifest:generate && pnpm docs:components',
  );
  console.log('  5. pnpm typecheck && pnpm test && pnpm api:update');
}

// Importable for its test; runs only as a CLI.
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))
)
  main();
