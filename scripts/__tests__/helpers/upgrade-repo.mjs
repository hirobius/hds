/**
 * A throwaway repo laid out like this one, at its 0.20.0 release, for the
 * upgrade gate and `pnpm upgrade:note` tests (hds#448): a package.json whose
 * exports point at dist/types, the source those types come from, and the
 * release snapshot of that source at docs/api/releases/0.20.0.json. A test
 * then changes the tree the way a pull request would.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CONTRACT_FILE, buildCssContract, formatContract } from '../../lib/css-contract.mjs';
import { formatJson } from '../../upgrade/format.mjs';
import { writePropsBaseline } from '../../upgrade/props.mjs';
import { writeTypesBaseline } from '../../upgrade/types.mjs';
import { snapshotFromSource } from '../../upgrade/snapshot.mjs';

export const PACKAGE = '@hirobius/design-system';

const temps = [];

/** Removes every repo made since the last call; call it from afterEach. */
export function cleanUpRepos() {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
}

export function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

export const readPkg = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export function editPkg(root, change) {
  const pkg = readPkg(root);
  change(pkg);
  write(root, 'package.json', JSON.stringify(pkg, null, 2));
}

/** Records the tree as it stands as the 0.20.0 release snapshot. */
export function recordRelease(root, version = '0.20.0') {
  write(root, `docs/api/releases/${version}.json`, formatJson(snapshotFromSource(root)));
}

export function releasedRepo() {
  const root = mkdtempSync(join(tmpdir(), 'hds-upgrade-repo-'));
  temps.push(root);
  write(
    root,
    'package.json',
    JSON.stringify(
      {
        name: PACKAGE,
        version: '0.20.0',
        exports: {
          '.': { types: './dist/types/src/index.d.ts', import: './dist/hirobius-ui.js' },
          './patterns': { types: './dist/types/src/patterns.d.ts', import: './dist/patterns.js' },
          './styles.css': './dist/styles.css',
          './package.json': './package.json',
        },
        files: ['dist'],
        bin: { 'hds-tile-grid': 'codemods/tile-grid.mjs' },
        dependencies: { clsx: '^2.1.1', 'date-fns': '^4.1.0' },
        peerDependencies: { react: '^18.3.0 || ^19.0.0', zod: '^3.23.0 || ^4.0.0' },
        peerDependenciesMeta: { zod: { optional: true } },
        engines: { node: '>=20', pnpm: '>=8' },
        scripts: { test: 'vitest run' },
        devDependencies: { vitest: '^4.0.0' },
      },
      null,
      2,
    ),
  );
  write(root, 'src/index.ts', "export * from './button';\nexport * from './callout';\n");
  write(root, 'src/button.tsx', 'export function Button() { return <button />; }\n');
  write(root, 'src/callout.tsx', 'export function Callout() { return null; }\n');
  write(root, 'src/patterns.ts', 'export function Page() { return null; }\n');
  write(root, '.changeset/README.md', '# Changesets\n');
  write(root, '.changeset/config.json', '{}\n');
  recordRelease(root);
  return root;
}

export const removeCallout = (root) => write(root, 'src/index.ts', "export * from './button';\n");

export function changeset(root, name, bump, pkg = PACKAGE) {
  write(root, `.changeset/${name}.md`, `---\n'${pkg}': ${bump}\n---\n\nSomething changed.\n`);
}

export function note(root, name, body) {
  write(root, `upgrade/pending/${name}.json`, formatJson(body));
}

export const readNote = (root, name) =>
  JSON.parse(readFileSync(join(root, `upgrade/pending/${name}.json`), 'utf8'));

/**
 * The stylesheet of cssRepo()'s 0.20.0 release (hds#449): theme variables in
 * the contexts the real bundles use, a tenant override, two public classes
 * and a utility.
 */
export const RELEASED_CSS = [
  ':root{--hds-space:4px;--primitive-typography-size-xs:13px}',
  '[data-theme=dark]{--hds-space:5px}',
  '[data-brand=pilot],[data-tenant=pilot]{--hds-space:6px}',
  '.hds-focus:focus-visible{outline:2px solid}',
  '.hds-card{padding:var(--hds-space)}',
  '.flex{display:flex}',
].join('');

/** Builds the tree's stylesheet as build:lib would: dist/styles.css and its dist/css-contract.json. */
export function buildCss(root, css) {
  write(root, 'dist/styles.css', css);
  write(root, CONTRACT_FILE, formatContract(buildCssContract(root)));
}

/** releasedRepo() whose 0.20.0 snapshot carries the css section of RELEASED_CSS, built. */
export function cssRepo(css = RELEASED_CSS) {
  const root = releasedRepo();
  buildCss(root, css);
  write(
    root,
    'docs/api/releases/0.20.0.json',
    formatJson({ ...snapshotFromSource(root), css: buildCssContract(root) }),
  );
  return root;
}

/**
 * The component-api.json rows of propsRepo()'s 0.20.0 release (hds#461): a
 * cva Button whose defaults live only in its defaultVariants, as the real
 * generator writes them (a variant union ends in `| null`).
 */
export const RELEASED_API = {
  components: {
    Button: {
      filePath: 'src/button.tsx',
      props: [
        { name: 'onClick', type: '() => void', required: false },
        { name: 'size', type: '"sm" | "md" | "lg" | null', required: false },
        { name: 'variant', type: '"primary" | "secondary" | "tertiary" | null', required: false },
      ],
    },
  },
};

/** button.tsx with a cva whose defaultVariants are `defaults`. */
export function buttonSource(defaults = "size: 'md', variant: 'secondary'") {
  return [
    "import { cva } from 'class-variance-authority';",
    "const buttonVariants = cva('btn', {",
    "  variants: { size: { sm: '', md: '', lg: '' }, variant: { primary: '', secondary: '', tertiary: '' } },",
    `  defaultVariants: { ${defaults} },`,
    '});',
    'export function Button() { return <button className={buttonVariants()} />; }',
    '',
  ].join('\n');
}

/**
 * Writes the tree's src/app/data/component-api.json as generate-component-api
 * would, and docs/api/props-baseline.json from it as `pnpm docs:api` does.
 */
export function writeComponentApi(root, api) {
  write(root, 'src/app/data/component-api.json', JSON.stringify(api, null, 2));
  writePropsBaseline(root);
}

/** releasedRepo() whose 0.20.0 snapshot carries the props section of RELEASED_API. */
export function propsRepo(api = RELEASED_API) {
  const root = releasedRepo();
  write(root, 'src/button.tsx', buttonSource());
  writeComponentApi(root, api);
  recordRelease(root);
  return root;
}

/**
 * The source of typesRepo()'s 0.20.0 release (hds#467): a compound Menu, a
 * hook and a tokens object, each re-exported from the root.
 */
export const RELEASED_TYPES_SOURCE = {
  'src/index.ts': [
    "export * from './button';",
    "export * from './callout';",
    "export * from './menu';",
    "export * from './hooks';",
    "export * from './tokens';",
    '',
  ].join('\n'),
  'src/menu.tsx': [
    'function MenuRoot() { return null; }',
    'function MenuItem() { return null; }',
    'function MenuGroup() { return null; }',
    'export const Menu = Object.assign(MenuRoot, { Item: MenuItem, Group: MenuGroup });',
    '',
  ].join('\n'),
  'src/hooks.ts': 'export function useCount(start: number): number { return start; }\n',
  'src/tokens.ts':
    "export const hds = { color: { content: { primary: '#000', secondary: '#666' } }, space: { sm: '4px' } };\n",
};

/** releasedRepo() whose 0.20.0 snapshot carries the types section of RELEASED_TYPES_SOURCE. */
export function typesRepo() {
  const root = releasedRepo();
  for (const [rel, text] of Object.entries(RELEASED_TYPES_SOURCE)) write(root, rel, text);
  writeTypesBaseline(root);
  recordRelease(root);
  return root;
}
