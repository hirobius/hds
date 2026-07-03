#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/scaffold-component.mjs
 *
 * One-command component ingestion recipe. From a single name it emits a fully
 * wired component: the `.tsx` (cva skeleton + token bindings), a Storybook
 * story, a smoke test, a manifest entry, the component-api.json extraction, and
 * a Code Connect stub — plus a Swiss-canon fixture. Makes "ingest a new
 * component" a single standardized step (ADR-020 §5).
 *
 *   pnpm hds:new HdsExample
 *   pnpm hds:new HdsExample --dry-run
 *   pnpm scaffold:component HdsExample      # legacy alias, identical behaviour
 *
 * --dry-run     prints the planned writes without touching disk (CI-safe; this
 *               is what the unit's validationCmd uses).
 * --no-generate skips the manifest + component-api regeneration finalize step
 *               (useful when batching several scaffolds before one regen).
 *
 * Manifest mutation is atomic — read once, mutate in memory, write once — and
 * is then reconciled by the real `generate-manifest` extraction on finalize.
 * Component name must be PascalCase and start with `Hds` (the project prefix,
 * read implicitly from the Swiss-canon convention).
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates/component-template.tsx');
const COMPONENT_DIR = path.join(ROOT, 'src/app/components');
const STORY_DIR = path.join(ROOT, 'src/stories');
const MANIFEST_PATH = path.join(ROOT, 'public/hds-manifest.json');
const FIXTURE_ROOT = path.join(ROOT, 'fixtures/swiss-canon');

function usage() {
  console.error('Usage: pnpm hds:new <PascalCaseName> [--dry-run] [--no-generate]');
  console.error('  Component name must be PascalCase, prefixed with Hds');
  console.error('  e.g. pnpm hds:new HdsExample');
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
    return 'name must be PascalCase (e.g. HdsExample). Leading underscores allowed for sandbox/dry-run names.';
  }
  const stripped = name.replace(/^_+/, '');
  if (!stripped.startsWith('Hds')) {
    return 'name must start with the Hds prefix';
  }
  return null;
}

function kebabCase(name) {
  return name.replace(/^_+/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
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

function buildStorySource(name) {
  const kebab = kebabCase(name);
  return `/**
 * ${name} stories — scaffolded skeleton. Flesh out with real states.
 * @see src/app/components/${kebab}.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from '../app/components/${kebab}';

const meta = {
  title: 'Primitives/${kebab}',
  component: ${name},
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: { type: 'select' }, options: ['primary', 'secondary', 'tertiary'] },
  },
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'primary', children: '${name}' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
      <${name} variant="primary">Primary</${name}>
      <${name} variant="secondary">Secondary</${name}>
      <${name} variant="tertiary">Tertiary</${name}>
    </div>
  ),
};
`;
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

function buildCodeConnectStub(name) {
  const kebab = kebabCase(name);
  // Emitted COMMENTED-OUT on purpose: @figma/code-connect is not yet a repo
  // dependency and the Figma node id must be filled in (see ADR-019 / #47).
  // Uncommenting once Code Connect is wired maps this component in Dev Mode.
  return `/**
 * ${name} — Figma Code Connect stub (ADR-019 phase c / #47).
 *
 * Code Connect is not wired in this repo yet. When it is:
 *   1. add @figma/code-connect as a devDependency,
 *   2. replace FIGMA_NODE_URL with this component's Figma node URL,
 *   3. uncomment the block below and run \`figma connect publish\`.
 */

// import figma from '@figma/code-connect';
// import { ${name} } from './${kebab}';
//
// figma.connect(${name}, 'FIGMA_NODE_URL', {
//   props: {
//     variant: figma.enum('Variant', {
//       primary: 'primary',
//       secondary: 'secondary',
//       tertiary: 'tertiary',
//     }),
//     children: figma.children('*'),
//   },
//   example: ({ variant, children }) => <${name} variant={variant}>{children}</${name}>,
// });

export {};
`;
}

// ── Plan ───────────────────────────────────────────────────────────────────────

function plan(name) {
  const kebab = kebabCase(name);
  return {
    componentPath: path.join(COMPONENT_DIR, `${kebab}.tsx`),
    storyPath: path.join(STORY_DIR, `${kebab}.stories.tsx`),
    testPath: path.join(COMPONENT_DIR, `${kebab}.test.tsx`),
    codeConnectPath: path.join(COMPONENT_DIR, `${kebab}.figma.tsx`),
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
    console.error(`Error: componentSpecs["${name}"] already exists in manifest. Pick a different name or update by hand.`);
    process.exit(1);
  }
  for (const p of [paths.componentPath, paths.storyPath, paths.testPath, paths.codeConnectPath]) {
    if (fs.existsSync(p)) {
      console.error(`Error: ${rel(p)} already exists.`);
      process.exit(1);
    }
  }

  const spec = buildSpecStub(name);

  if (dryRun) {
    console.log('[dry-run] would write component:  ', rel(paths.componentPath), `(${componentSource.length} bytes)`);
    console.log('[dry-run] would write story:      ', rel(paths.storyPath));
    console.log('[dry-run] would write test:       ', rel(paths.testPath));
    console.log('[dry-run] would write code-connect:', rel(paths.codeConnectPath));
    console.log('[dry-run] would add manifest entry:', name, `(desc ${spec.description.length} chars)`);
    console.log('[dry-run] would write fixture:    ', rel(paths.fixtureInputPath));
    console.log('[dry-run] would write fixture:    ', rel(paths.fixtureExpectedPath));
    console.log('[dry-run] would run:              ', 'generate-manifest + generate-component-api (unless --no-generate)');
    return;
  }

  fs.writeFileSync(paths.componentPath, componentSource);
  console.log('wrote', rel(paths.componentPath));
  fs.writeFileSync(paths.storyPath, buildStorySource(name));
  console.log('wrote', rel(paths.storyPath));
  fs.writeFileSync(paths.testPath, buildTestSource(name));
  console.log('wrote', rel(paths.testPath));
  fs.writeFileSync(paths.codeConnectPath, buildCodeConnectStub(name));
  console.log('wrote', rel(paths.codeConnectPath));

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
  console.log('  1. Add', `export * from './app/components/${kebabCase(name)}';`, 'to src/index.ts');
  console.log('  2. Flesh out variant logic in', rel(paths.componentPath));
  console.log('  3. pnpm typecheck && pnpm test && pnpm api:update');
}

main();
