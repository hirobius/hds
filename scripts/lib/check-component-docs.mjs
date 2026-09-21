#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-component-docs.mjs
 *
 * Documentation coverage gate for shared React components.
 * Every top-level component in src/app/components/*.tsx must be shown by at
 * least one Storybook story unless it is explicitly exempted as an internal
 * utility.
 *
 * "A component that isn't documented doesn't exist in the DS."
 *
 * WHERE DOCUMENTATION LIVES. Until ADR-018 it was a bespoke 48-page docs site,
 * and this gate looked for <HdsComponentDoc> / <CategoryComponentDocs> JSX in
 * 11 named page files. ADR-018 cut that site — "the 64 stories become the sole
 * component showcase" — and deleted all 11, but nothing re-pointed the gate. It
 * went on parsing paths that no longer existed, found no signals, and reported
 * 0 of 104 components documented on every run since. That is not a coverage
 * finding; with every input deleted it is the only number the gate could
 * produce. It is now pointed at src/stories, which is where the showcase
 * actually is.
 *
 * Usage: pnpm check:docs
 *
 * To mark a component as intentionally undocumented:
 * 1. Prefer adding a file-level comment near the top of the component:
 *      @doc-exempt: internal shell utility, not a consumer-facing HDS component
 * 2. Or add its filename to INTERNAL_COMPONENTS below for legacy exemptions.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import ts from 'typescript';
import { discoverHdsComponents } from '../component-discovery.mjs';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'public', 'hds-manifest.json');
const COMPONENT_API_PATH = join(ROOT, 'src', 'app', 'data', 'component-api.json');

// Kept in step with .storybook/main.ts's `stories` glob. If that glob moves,
// this gate stops seeing the showcase and silently reports everything
// undocumented — which is exactly the failure ADR-018 left behind.
const STORIES_DIR = join(ROOT, 'src/stories');

// Only imports resolving into the shared component directory can document a
// component. A story also imports Storybook types, React, and local helpers
// like designParameters; none of those are components.
const COMPONENT_IMPORT = /^\.\.\/app\/components\//;

const INVENTORY_ONLY_CATEGORIES = new Set(['Utilities', 'Lab', 'Branding']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/**
 * Every component name a single story file documents.
 *
 * Three signals, unioned. `component:` in the story meta is the primary one —
 * it is what Storybook itself uses to bind autodocs and the props table. But a
 * story sets exactly one, and compound components ship as several discovered
 * components. Named imports from the shared component directory are the second.
 *
 * The third exists because the first two miss whatever a compound component
 * hides behind its namespace. card.stories.tsx imports only `Card` and renders
 * <Card.Header>; card.tsx assigns `Card.Header = CardHeader`. CardHeader is on
 * screen in Storybook but its name appears nowhere in the story, so counting
 * identifiers alone calls five rendered components undocumented. `resolveMember`
 * maps a member access back to the component it resolves to.
 *
 * Type-only imports are excluded: importing CardProps documents nothing.
 *
 * Pure over a source string so the reading is testable without a filesystem;
 * the one lookup that needs the filesystem is injected.
 *
 * @param {string} text - story file source
 * @param {string} [fileName] - only affects TypeScript's error positions
 * @param {(local: string, member: string) => string | null} [resolveMember]
 *   given `Card` and `Header`, returns `CardHeader` if that compound member
 *   exists; null otherwise. Defaults to resolving nothing.
 * @returns {Set<string>} component names this story documents
 */
export function collectStoryComponentNames(
  text,
  fileName = 'story.stories.tsx',
  resolveMember = () => null,
) {
  const names = new Set();
  if (!text) return names;

  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function visit(node) {
    // import { Card, CardHeader } from '../app/components/card'
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const clause = node.importClause;

      if (clause && !clause.isTypeOnly && COMPONENT_IMPORT.test(specifier)) {
        if (clause.name) names.add(clause.name.text);

        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            if (element.isTypeOnly) continue;
            names.add(element.name.text);
          }
        }
      }
    }

    // const meta = { title: '...', component: Badge }
    if (ts.isPropertyAssignment(node)) {
      const key = ts.isIdentifier(node.name)
        ? node.name.text
        : ts.isStringLiteral(node.name)
          ? node.name.text
          : null;

      if (key === 'component') {
        let value = node.initializer;
        while (value && (ts.isAsExpression(value) || ts.isSatisfiesExpression(value))) {
          value = value.expression;
        }
        if (value && ts.isIdentifier(value)) names.add(value.text);
      }
    }

    // <Card.Header /> in JSX, or Card.Header referenced as a value.
    let namespace = null;
    let member = null;

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (ts.isPropertyAccessExpression(node.tagName)) {
        namespace = ts.isIdentifier(node.tagName.expression) ? node.tagName.expression.text : null;
        member = node.tagName.name.text;
      }
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      namespace = node.expression.text;
      member = node.name.text;
    }

    if (namespace && member) {
      const resolved = resolveMember(namespace, member);
      if (resolved) names.add(resolved);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return names;
}

/**
 * The compound members a component module attaches to one of its exports:
 * `Card.Header = CardHeader` → { Card: { Header: 'CardHeader' } }.
 *
 * @param {string} text - component module source
 * @returns {Map<string, Map<string, string>>} namespace → member → component
 */
export function collectCompoundMembers(text) {
  const byNamespace = new Map();
  if (!text) return byNamespace;

  const sourceFile = ts.createSourceFile(
    'component.tsx',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) continue;
    const expression = statement.expression;
    if (!ts.isBinaryExpression(expression)) continue;
    if (expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
    if (!ts.isPropertyAccessExpression(expression.left)) continue;
    if (!ts.isIdentifier(expression.left.expression)) continue;
    if (!ts.isIdentifier(expression.right)) continue;

    const namespace = expression.left.expression.text;
    if (!byNamespace.has(namespace)) byNamespace.set(namespace, new Map());
    byNamespace.get(namespace).set(expression.left.name.text, expression.right.text);
  }

  return byNamespace;
}

/**
 * Builds the `resolveMember` callback for one story, by reading the component
 * modules that story imports from and recording what each attaches to its
 * exports. Memoised per module — 112 stories importing ~30 shared modules
 * would otherwise re-parse each one many times over.
 *
 * @param {string} storyText - story file source
 * @returns {(local: string, member: string) => string | null}
 */
const compoundMemberCache = new Map();

function memberResolverFor(storyText) {
  if (!storyText) return () => null;

  // local import name → the component module it came from
  const moduleByLocal = new Map();
  const sourceFile = ts.createSourceFile(
    'story.tsx',
    storyText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!COMPONENT_IMPORT.test(specifier)) continue;

    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;

    // '../app/components/card' resolves relative to src/stories.
    const modulePath = join(STORIES_DIR, `${specifier}.tsx`);
    if (clause.name) moduleByLocal.set(clause.name.text, modulePath);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if (element.isTypeOnly) continue;
        // `import { Card as C }` — the assignment in the module is on the
        // exported name, so record that, not the story's alias.
        moduleByLocal.set(element.name.text, modulePath);
      }
    }
  }

  return (local, member) => {
    const modulePath = moduleByLocal.get(local);
    if (!modulePath) return null;

    if (!compoundMemberCache.has(modulePath)) {
      compoundMemberCache.set(modulePath, collectCompoundMembers(readText(modulePath)));
    }
    return compoundMemberCache.get(modulePath).get(local)?.get(member) ?? null;
  };
}

/**
 * Every component name documented by any story under src/stories.
 *
 * @returns {Set<string>}
 */
function collectDocumentedComponentNames() {
  const documented = new Set();
  if (!existsSync(STORIES_DIR)) return documented;

  const stack = [STORIES_DIR];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.stories\.tsx?$/.test(entry)) continue;
      const text = readText(full);
      const resolveMember = memberResolverFor(text);
      for (const name of collectStoryComponentNames(text, full, resolveMember)) {
        documented.add(name);
      }
    }
  }

  return documented;
}

function fidelityGrade(percent, missingCount) {
  if (missingCount === 0) return 'A';
  if (percent >= 85) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

export function runComponentDocsCheck() {
  const manifest = readJson(MANIFEST_PATH);
  const componentApi = readJson(COMPONENT_API_PATH);
  const discoveredComponents = discoverHdsComponents()
    .components.filter((component) => !component.ignored)
    .filter((component) => component.tier === 'primitive' || component.tier === 'pattern')
    .filter((component) => !manifest.componentSpecs?.[component.name]?.hidden)
    .filter((component) => !component.docExempt);
  const documentedNames = collectDocumentedComponentNames();

  const undocumented = [];
  const missingSpecimens = [];
  const fidelityResults = [];

  for (const component of discoveredComponents) {
    const baseName = component.name;
    const file = component.filePath.split('/').pop() ?? `${baseName}.tsx`;
    const category = manifest.componentSpecs?.[baseName]?.category ?? component.category ?? null;
    const apiEntry = componentApi.components?.[baseName] ?? {};
    const observedTokens = apiEntry.observedTokens ?? [];
    const mappedTokens = Object.keys(manifest.componentSpecs?.[baseName]?.tokenMapping ?? {});
    const usesTokens = observedTokens.length > 0 || mappedTokens.length > 0;

    const previewSpec = manifest.componentSpecs?.[baseName]?.preview;
    const hasPreview = Boolean(previewSpec?.exportName && previewSpec?.sizing);
    const hasStory = documentedNames.has(baseName);

    if (!hasStory) {
      undocumented.push(file);
    }

    const documentedProps = (apiEntry.props ?? []).filter(
      (prop) => String(prop.description ?? '').trim().length > 0,
    );
    const hasDocumentedProp = (apiEntry.props ?? []).length === 0 || documentedProps.length > 0;
    // A component that uses tokens needs somewhere a reader can see them
    // resolved. On the old docs site that was a hand-authored token table; in
    // Storybook it is the rendered story plus the autodocs table the addon
    // generates. Either way the requirement is satisfied by the same thing:
    // a documentation surface exists for this component.
    const requiresTokenTable = usesTokens && !INVENTORY_ONLY_CATEGORIES.has(category ?? '');
    const hasTokenTable = !requiresTokenTable || hasStory;
    const missing = [];

    if (!hasPreview) missing.push('preview metadata');
    if (!hasDocumentedProp) missing.push('documented props');
    if (!hasTokenTable) missing.push('token table');

    const publicStorefrontComponent = !INVENTORY_ONLY_CATEGORIES.has(category ?? '');
    if (publicStorefrontComponent) {
      if (!previewSpec) {
        missingSpecimens.push(baseName);
      }
      fidelityResults.push({
        name: baseName,
        filePath: component.filePath,
        category,
        hasStory,
        hasPreview,
        hasDocumentedProp,
        usesTokens,
        hasTokenTable,
        missing,
        complete: hasStory && missing.length === 0,
      });
    }
  }

  const total = discoveredComponents.length;
  const covered = total - undocumented.length;
  const fidelityTotal = fidelityResults.length;
  const fidelityComplete = fidelityResults.filter((component) => component.complete).length;
  const fidelityPercent =
    fidelityTotal > 0 ? Math.round((fidelityComplete / fidelityTotal) * 100) : 0;
  const fidelityIncomplete = fidelityResults.filter((component) => !component.complete);

  return {
    ok: undocumented.length === 0,
    total,
    covered,
    undocumented,
    missingSpecimens,
    fidelity: {
      total: fidelityTotal,
      complete: fidelityComplete,
      percent: fidelityPercent,
      grade: fidelityGrade(fidelityPercent, fidelityIncomplete.length),
      incomplete: fidelityIncomplete,
    },
  };
}

export function main() {
  const result = runComponentDocsCheck();

  if (result.ok) {
    if (result.missingSpecimens.length > 0) {
      console.error(
        `\nComponent docs check failed: ${result.missingSpecimens.length} component(s) missing preview metadata.\n`,
      );
      console.error(
        '  Every documented component needs preview metadata in public/hds-manifest.json.\n',
      );
      for (const name of result.missingSpecimens) {
        console.error(`    - ${name}`);
      }
      console.error('');
      process.exit(1);
    }

    console.log(
      `\nComponent docs check passed: ${result.total}/${result.total} components documented and specimen-covered.\n`,
    );
    process.exit(0);
  }

  console.error(
    `\nComponent docs check failed: ${result.undocumented.length} component(s) undocumented.\n`,
  );
  console.error(`  ${result.covered}/${result.total} components appear in a Storybook story.\n`);
  console.error('  Each shared component needs one of these before it is considered done:\n');
  console.error('    1. A story in src/stories/<name>.stories.tsx that either sets');
  console.error('       `component: <Name>` in its meta or imports <Name> from');
  console.error("       '../app/components/<file>'.\n");
  console.error('    2. An explicit file-level exemption comment on the component:');
  console.error('       @doc-exempt: <reason>\n');
  console.error('  Legacy exemptions may still be added to INTERNAL_COMPONENTS in');
  console.error('  scripts/lib/check-component-docs.mjs.\n');

  for (const file of result.undocumented) {
    console.error(`    - ${file}`);
  }
  console.error('');

  if (result.missingSpecimens.length > 0) {
    console.error(`  Missing preview metadata: ${result.missingSpecimens.length}\n`);
    console.error(
      '  Every documented component should expose preview metadata in public/hds-manifest.json:\n',
    );
    for (const name of result.missingSpecimens) {
      console.error(`    - ${name}`);
    }
    console.error('');
  }

  console.error(
    `  Fidelity grade: ${result.fidelity.grade} (${result.fidelity.complete}/${result.fidelity.total}, ${result.fidelity.percent}%)\n`,
  );

  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
