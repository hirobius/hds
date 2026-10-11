#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-component-docs.mjs
 *
 * Documentation coverage gate for the documented surface: every core component
 * and pattern must have a page on the docs site (docs-site/, hds#506) with a
 * live demo, i.e. a DEMOS entry in docs-site/components/component-demos.tsx
 * whose name is listed in docs-site/lib/previewed-components.ts.
 *
 * "A component that isn't documented doesn't exist in the DS."
 *
 * WHERE DOCUMENTATION LIVES. A bespoke 48-page docs site until ADR-018, then
 * Storybook stories (this gate scanned src/stories), now the Fumadocs docs site:
 * one generated page per core component and pattern, each with a live demo.
 * Pages come from the component data (scripts/lib/docs-component-pages.mjs), so
 * what a component needs from a person is its demo. The providers have no demo:
 * they are documented on the providers guide, which is generated for them.
 *
 * What is in scope is the documented surface, not every discovered component:
 * the core set (mcp/core-set.mjs) and the modules src/patterns.ts re-exports
 * (scripts/lib/docs-routing.mjs). Compound parts (CardHeader) are documented on
 * their parent's page. A component outside both lists is not on the docs site
 * by decision, so it is not reported as undocumented.
 *
 * Usage: pnpm check:docs
 *
 * To mark a component as intentionally undocumented:
 * 1. Prefer adding a file-level comment near the top of the component:
 *      @doc-exempt: internal shell utility, not a consumer-facing HDS component
 * 2. Or add its filename to INTERNAL_COMPONENTS below for legacy exemptions.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import ts from 'typescript';
import { discoverHdsComponents } from '../component-discovery.mjs';
import { loadDocsRouting } from './docs-routing.mjs';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'public', 'hds-manifest.json');
const COMPONENT_API_PATH = join(ROOT, 'src', 'app', 'data', 'component-api.json');

const DEMOS_FILE = join(ROOT, 'docs-site/components/component-demos.tsx');
const PREVIEWED_FILE = join(ROOT, 'docs-site/lib/previewed-components.ts');

const INVENTORY_ONLY_CATEGORIES = new Set(['Utilities', 'Lab', 'Branding']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/**
 * The names a source file lists in an array literal assigned to `exportName`,
 * read from the syntax tree (`as const` and `satisfies` look through).
 *
 * @param {string} text
 * @param {string} exportName
 * @returns {Set<string>}
 */
export function collectArrayNames(text, exportName) {
  const names = new Set();
  if (!text) return names;
  const sourceFile = ts.createSourceFile(
    'x.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const unwrap = (node) => {
    let current = node;
    while (
      current &&
      (ts.isAsExpression(current) ||
        ts.isSatisfiesExpression(current) ||
        ts.isParenthesizedExpression(current))
    ) {
      current = current.expression;
    }
    return current;
  };
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue;
      const value = unwrap(declaration.initializer);
      if (!value || !ts.isArrayLiteralExpression(value)) continue;
      for (const element of value.elements) {
        if (ts.isStringLiteralLike(element)) names.add(element.text);
      }
    }
  }
  return names;
}

/**
 * The keys of the object literal assigned to `exportName` (the DEMOS registry).
 *
 * @param {string} text
 * @param {string} exportName
 * @returns {Set<string>}
 */
export function collectObjectKeys(text, exportName) {
  const keys = new Set();
  if (!text) return keys;
  const sourceFile = ts.createSourceFile(
    'x.tsx',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue;
      const value = declaration.initializer;
      if (!value || !ts.isObjectLiteralExpression(value)) continue;
      for (const prop of value.properties) {
        if (
          (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) &&
          (ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name))
        ) {
          keys.add(prop.name.text);
        }
      }
    }
  }
  return keys;
}

/**
 * The compound members a component module attaches to one of its exports, in
 * either shape the codebase uses:
 *
 *   Card.Header = CardHeader;                                   (property write)
 *   const Card = Object.assign(CardRoot, { Header: CardHeader }) (hds#363)
 *
 * → { Card: { Header: 'CardHeader' } }. Only identifier-valued properties are
 * members; `displayName: 'Card'` is metadata. The `Object.assign` form is read
 * only from a top-level `const`/`let` declaration (through any `as` cast or
 * parentheses), since that is where a compound is declared; a merge inside a
 * function or of a plain object literal is not one.
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

  const record = (namespace, member, component) => {
    if (!byNamespace.has(namespace)) byNamespace.set(namespace, new Map());
    byNamespace.get(namespace).set(member, component);
  };

  const unwrap = (node) => {
    let current = node;
    while (
      current &&
      (ts.isAsExpression(current) ||
        ts.isParenthesizedExpression(current) ||
        ts.isSatisfiesExpression?.(current) ||
        ts.isTypeAssertionExpression(current) ||
        ts.isNonNullExpression(current))
    ) {
      current = current.expression;
    }
    return current;
  };

  const isObjectAssign = (node) =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Object' &&
    node.expression.name.text === 'assign';

  for (const statement of sourceFile.statements) {
    // Property-write shape.
    if (ts.isExpressionStatement(statement)) {
      const expression = statement.expression;
      if (!ts.isBinaryExpression(expression)) continue;
      if (expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
      if (!ts.isPropertyAccessExpression(expression.left)) continue;
      if (!ts.isIdentifier(expression.left.expression)) continue;
      if (!ts.isIdentifier(expression.right)) continue;
      record(expression.left.expression.text, expression.left.name.text, expression.right.text);
      continue;
    }

    // Object.assign shape.
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      // A compound is a component: capitalised, assembled onto a component
      // (an identifier or a factory call), never onto a plain `{}`.
      if (!/^[A-Z]/.test(declaration.name.text)) continue;
      const initializer = unwrap(declaration.initializer);
      if (!initializer || !isObjectAssign(initializer)) continue;
      const [target] = initializer.arguments;
      if (!target || !(ts.isIdentifier(target) || ts.isCallExpression(target))) continue;
      for (const arg of initializer.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) continue;
        for (const prop of arg.properties) {
          if (ts.isShorthandPropertyAssignment(prop)) {
            record(declaration.name.text, prop.name.text, prop.name.text);
          } else if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            ts.isIdentifier(prop.initializer)
          ) {
            record(declaration.name.text, prop.name.text, prop.initializer.text);
          }
        }
      }
    }
  }

  return byNamespace;
}

/**
 * The components the docs site documents: a DEMOS entry (the live demo) whose
 * name is listed in PREVIEWED_COMPONENTS (the page marks it previewable), plus
 * the providers, which the providers guide covers. Both registries are read
 * from source, so a name in one and not the other is not documented.
 *
 * @param {{ previewedText: string, demosText: string, providers?: string[] }} sources
 * @returns {Set<string>}
 */
export function documentedFromSources({ previewedText, demosText, providers = [] }) {
  const previewed = collectArrayNames(previewedText, 'PREVIEWED_COMPONENTS');
  const demos = collectObjectKeys(demosText, 'DEMOS');
  const documented = new Set([...previewed].filter((name) => demos.has(name)));
  for (const name of providers) documented.add(name);
  return documented;
}

function collectDocumentedComponentNames({ providers = [] } = {}) {
  return documentedFromSources({
    previewedText: readText(PREVIEWED_FILE),
    demosText: readText(DEMOS_FILE),
    providers,
  });
}

function fidelityGrade(percent, missingCount) {
  if (missingCount === 0) return 'A';
  if (percent >= 85) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

export function runComponentDocsCheck() {
  const routing = loadDocsRouting(ROOT);
  const documentedSurface = new Set([...routing.core, ...routing.patterns]);
  const documentedNames = collectDocumentedComponentNames(routing);
  const manifest = readJson(MANIFEST_PATH);
  const componentApi = readJson(COMPONENT_API_PATH);
  const discoveredComponents = discoverHdsComponents()
    .components.filter((component) => !component.ignored)
    .filter((component) => component.tier === 'primitive' || component.tier === 'pattern')
    .filter((component) => !manifest.componentSpecs?.[component.name]?.hidden)
    .filter((component) => !component.docExempt)
    .filter((component) => documentedSurface.has(component.name));

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
    // resolved. On the docs site that is its page: the live demo plus the
    // generated design tokens section. The requirement is satisfied by the
    // same thing: a documentation page exists for this component.
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
  console.error(
    `  ${result.covered}/${result.total} core components and patterns have a live demo on the docs site.\n`,
  );
  console.error('  Each shared component needs one of these before it is considered done:\n');
  console.error('    1. A live demo: a <Name>Demo in docs-site/components/component-demos.tsx,');
  console.error('       registered in DEMOS, with <Name> listed in');
  console.error('       docs-site/lib/previewed-components.ts (pnpm hds:new does both).\n');
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
