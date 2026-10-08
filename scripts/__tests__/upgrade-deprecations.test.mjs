/**
 * Every deprecation on the public surface is in the upgrade record (hds#451):
 * each `@deprecated` JSDoc block check-deprecations.mjs reads has a
 * deprecation step, in a committed ledger or a pending note, whose detect
 * finds a use of it and whose removeIn is its `@removeIn`. So UPGRADING.md's
 * Coming next and upgrade/index.json `deprecated` (which the upgrade command
 * reads) never miss one, the way they missed Divider `strong` and
 * InlineCode `compact`, deprecated before the 0.16.0 floor.
 *
 * A use is written the way a consumer writes it: `hds.semantic.space.
 * component.padding` for a token object key, `<Divider strong` for a prop,
 * `<Text variant="heading1"` for a union member of TextVariant.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { deprecationScope } from '../check-deprecations.mjs';
import { parseDeprecation } from '../lib/jsdoc-contract.mjs';
import { compileHistory, deprecationRemovals } from '../upgrade/compile.mjs';
import { readPendingNotes } from '../upgrade/pending.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

/** The name a node declares, or null. */
const nameOf = (node) => (node.name && ts.isIdentifier(node.name) ? node.name.text : null);

/** `TextVariant` → `<Text variant=`; `DividerProps` → `<Divider`. */
function jsxOf(typeName, literal) {
  if (literal === undefined) {
    const component = typeName.replace(/Props$/, '');
    return component === typeName ? null : `<${component}`;
  }
  const split = /^(.*[a-z0-9])([A-Z][a-z0-9]*)$/.exec(typeName);
  return split ? `<${split[1]} ${split[2].toLowerCase()}="${literal}"` : null;
}

/** How a consumer writes a use of the declaration `node`, or null when this test cannot tell. */
function usageOf(node) {
  if (ts.isPropertyAssignment(node)) {
    const path = [];
    for (let at = node; at; at = at.parent) {
      if (ts.isPropertyAssignment(at)) path.unshift(nameOf(at));
      else if (ts.isVariableDeclaration(at)) {
        path.unshift(nameOf(at));
        break;
      } else if (!ts.isObjectLiteralExpression(at) && !ts.isAsExpression(at)) return null;
    }
    return path.join('.');
  }
  if (ts.isPropertySignature(node)) {
    const owner = ts.isTypeLiteralNode(node.parent) ? node.parent.parent : node.parent;
    const jsx = owner && nameOf(owner) ? jsxOf(nameOf(owner)) : null;
    return jsx && `${jsx} ${nameOf(node)}`;
  }
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    const alias = node.parent && ts.isUnionTypeNode(node.parent) ? node.parent.parent : null;
    return alias && ts.isTypeAliasDeclaration(alias)
      ? jsxOf(alias.name.text, node.literal.text)
      : null;
  }
  return null;
}

/** Each `@deprecated` block of `file` with the declaration it sits on. */
function deprecationsIn(file) {
  const text = readFileSync(file, 'utf8');
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
  for (const match of text.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    const deprecation = parseDeprecation(match[0]);
    if (!deprecation) continue;
    const end = match.index + match[0].length;
    // Pre-order: the outermost node that starts after the block is what it documents.
    const node = nodes.find((n) => n.getStart(source) >= end);
    const line = text.slice(0, match.index).split('\n').length;
    out.push({ where: `${relative(REPO, file)}:${line}`, deprecation, use: node && usageOf(node) });
  }
  return out;
}

/** True when the step's detect finds `use`. */
function detects(step, use) {
  const { regex = [], imports = [], classes = [] } = step.detect ?? {};
  return (
    regex.some((source) => new RegExp(source).test(use)) ||
    imports.some((i) => i.names.includes(use)) ||
    classes.includes(use)
  );
}

describe('every public deprecation is in the upgrade record', () => {
  const removals = deprecationRemovals(compileHistory().ledgers);
  const steps = [
    ...compileHistory()
      .ledgers.flatMap((ledger) => ledger.steps)
      .filter((step) => step.kind === 'deprecated')
      .filter((step) => removals.get(step.id).removed.size < removals.get(step.id).uses.length),
    ...readPendingNotes(REPO)
      .flatMap((note) => note.note?.steps ?? [])
      .filter((step) => step.kind === 'deprecated'),
  ];
  const found = deprecationScope(REPO).flatMap(deprecationsIn);

  it('reads the deprecations of the public surface', () => {
    expect(found.length).toBeGreaterThan(20);
    expect(found.map((d) => d.use)).toEqual(
      expect.arrayContaining(['<Divider strong', '<Text variant="heading1"', 'hds.density']),
    );
  });

  it('has a deprecation step for each, whose detect finds a use and whose removeIn matches', () => {
    const missing = found
      .filter(({ use, deprecation }) => {
        if (!use) return true;
        return !steps.some((step) => step.removeIn === deprecation.removeIn && detects(step, use));
      })
      .map(({ where, use, deprecation }) =>
        use
          ? `${where}: ${use} (removeIn ${deprecation.removeIn}) has no deprecation step; add one to its changeset's upgrade/pending note`
          : `${where}: teach usageOf in this test how a consumer writes a use of it`,
      );
    expect(missing).toEqual([]);
  });
});
