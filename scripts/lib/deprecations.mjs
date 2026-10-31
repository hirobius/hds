/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * deprecations.mjs — the data behind the shipped `deprecations.json`
 * (hds#469): every deprecation a consumer can hit, in one record.
 *
 * Three sources, no other ledger to drift:
 *   - the public surface's JSDoc (the same files check-deprecations reads):
 *     a `@deprecated` block sits on an export, on a prop of an exported
 *     interface, or on one value of an exported union type;
 *   - `hirobius.tokens.json` `$deprecated` tokens (lib/token-deprecations);
 *   - the shipped upgrade ledgers: a step of kind `removed` / `folded` whose
 *     `detect.imports` names a name took that name away in that release
 *     (the same reading codemods/lib/removals.mjs makes).
 *
 * Pure: callers hand in file texts and parsed ledgers; no fs here.
 */
import ts from 'typescript';
import { parseDeprecation } from './jsdoc-contract.mjs';

/** The name a node declares, or null. */
const nameOf = (node) => (node?.name && ts.isIdentifier(node.name) ? node.name.text : null);

const JSDOC_RE = /\/\*\*[\s\S]*?\*\//g;

/**
 * Classify the declaration a `@deprecated` block documents.
 * @returns {{ kind: 'export'|'prop'|'propValue', name: string, owner?: string } | null}
 *   null when this module cannot name what the block documents.
 */
function classify(node) {
  if (!node) return null;
  // One value of a union type: `| 'heading1'` under `type TextVariant = …`.
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    const alias = node.parent && ts.isUnionTypeNode(node.parent) ? node.parent.parent : null;
    return ts.isTypeAliasDeclaration(alias)
      ? { kind: 'propValue', name: node.literal.text, owner: alias.name.text }
      : null;
  }
  // A prop of an interface or type literal: `size?: …` in BlockquoteProps.
  if (ts.isPropertySignature(node)) {
    const holder = node.parent;
    const ownerNode = ts.isTypeLiteralNode(holder) ? holder.parent : holder;
    const owner = ownerNode && nameOf(ownerNode);
    return owner ? { kind: 'prop', name: node.name.text, owner } : null;
  }
  // A key of an object literal (the token objects in src/app/design-system):
  // the consumer writes the dotted path, `hds.density`-style.
  if (ts.isPropertyAssignment(node)) {
    const path = [];
    for (let at = node; at; at = at.parent) {
      if (ts.isPropertyAssignment(at)) path.unshift(nameOf(at));
      else if (ts.isVariableDeclaration(at)) {
        path.unshift(nameOf(at));
        break;
      } else if (!ts.isObjectLiteralExpression(at) && !ts.isAsExpression(at)) return null;
    }
    return path.every(Boolean) ? { kind: 'export', name: path.join('.') } : null;
  }
  // A top-level declaration: a component, an interface, a type, a function.
  const declared =
    (ts.isVariableStatement(node) && nameOf(node.declarationList.declarations[0])) ||
    ((ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
      nameOf(node));
  return declared ? { kind: 'export', name: declared } : null;
}

/**
 * Every `@deprecated` block of one public-surface file, with the declaration
 * it documents. Mirrors scripts/__tests__/upgrade-deprecations.test.mjs: the
 * outermost node starting after the block is what the block documents.
 * @param {string} file repo-relative path (kept on each entry as `file`)
 * @param {string} text the file's source
 */
export function deprecationsInFile(file, text) {
  if (text.includes('// deprecation-ok')) return [];
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const nodes = [];
  const walk = (node) => {
    nodes.push(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
  const out = [];
  for (const match of text.matchAll(JSDOC_RE)) {
    const deprecation = parseDeprecation(match[0]);
    if (!deprecation) continue;
    const end = match.index + match[0].length;
    // Not the SourceFile itself: its start is its first token, which is the
    // declaration the block documents when the block opens the file.
    const node = nodes.find((n) => !ts.isSourceFile(n) && n.getStart(source) >= end);
    const found = classify(node);
    if (!found) continue;
    const entry = {
      kind: found.kind,
      name: found.name,
      ...(found.owner ? { owner: found.owner } : {}),
      ...(deprecation.removeIn ? { removeIn: deprecation.removeIn } : {}),
      notice: deprecation.deprecated,
      ...(deprecation.useInstead ? { useInstead: deprecation.useInstead } : {}),
      file,
    };
    out.push(entry);
  }
  return out;
}

/** Step kinds that take a name away (codemods/lib/removals.mjs reads the same set). */
const GONE = new Set(['removed', 'folded']);

/**
 * The names the shipped releases took away, from the upgrade ledgers:
 * one entry per (name, entry point), with the first release that took it.
 * @param {Array<{ version: string, steps: object[] }>} ledgers
 * @returns {Array<{ name: string, from: string, removedIn: string, note: string }>}
 */
export function removedFromLedgers(ledgers) {
  const byKey = new Map();
  const ordered = [...ledgers].sort((a, b) =>
    a.version.localeCompare(b.version, undefined, { numeric: true }),
  );
  for (const ledger of ordered) {
    for (const step of ledger.steps ?? []) {
      if (!GONE.has(step.kind)) continue;
      for (const entry of step.detect?.imports ?? []) {
        for (const name of entry.names ?? []) {
          const key = `${entry.from} ${name}`;
          if (!byKey.has(key)) {
            byKey.set(key, { name, from: entry.from, removedIn: ledger.version, note: step.plain });
          }
        }
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.from.localeCompare(b.from),
  );
}

/**
 * The shipped record. `api` is deprecationsInFile over the public surface,
 * `tokens` is collectDeprecations(hirobius.tokens.json), `removed` is
 * removedFromLedgers(upgrade/releases). A removed name that its entry point
 * exports again today is dropped: it is alive there, not removed.
 * @param {{ version: string, api: object[], tokens: object[], removed: object[], liveExports: Set<string> }} parts
 *   liveExports holds `${from} ${name}` keys, the same keying as removedFromLedgers.
 */
export function buildDeprecations({ version, api, tokens, removed, liveExports }) {
  const deprecatedExports = api.filter((e) => e.kind === 'export');
  return {
    $comment:
      'Generated by scripts/build-deprecations.mjs from the @deprecated JSDoc on the public surface, the $deprecated tokens in hirobius.tokens.json and the shipped upgrade ledgers. Do not edit.',
    version,
    exports: deprecatedExports,
    props: api.filter((e) => e.kind === 'prop'),
    propValues: api.filter((e) => e.kind === 'propValue'),
    tokens,
    removed: removed.filter((r) => !liveExports.has(`${r.from} ${r.name}`)),
  };
}
