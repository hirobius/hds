/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/lib/jsx.mjs — shared JSX-validator boilerplate (hds#1011):
 * parse-or-error, the element walk, element names, the manifest read.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../parse-jsx.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));
}

/** Calls visitor on every JSXElement under node, depth-first. */
export function walkJsx(node, visitor) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement') visitor(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => walkJsx(c, visitor));
    else if (child && typeof child === 'object') walkJsx(child, visitor);
  }
}

/** "Name" or "Object.Property"; null for anything else. */
export function getElementName(node) {
  const name = node.openingElement?.name;
  if (!name) return null;
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${name.object.name}.${name.property.name}`;
  return null;
}

/**
 * @param {string} jsxString
 * @returns {{ ast: object } | { result: { ok: false, errors: object[] } }}
 */
export function parseOrError(jsxString) {
  const parsed = parse(jsxString);
  if (parsed.ok) return { ast: parsed.ast };
  return {
    result: {
      ok: false,
      errors: [
        { path: '', code: 'PARSE_ERROR', message: parsed.error, suggestion: 'Fix JSX syntax' },
      ],
    },
  };
}

/**
 * Parse, walk every element, collect errors. visit(element, { tagName, attrs, errors })
 * pushes onto errors; tagName is the plain identifier name or null.
 * @param {string} jsxString
 * @param {(element: object, ctx: { tagName: string | null, attrs: object[], errors: object[] }) => void} visit
 * @returns {Promise<{ ok: boolean, errors: object[] }>}
 */
export async function validateElements(jsxString, visit) {
  const { ast, result } = parseOrError(jsxString);
  if (result) return result;
  const errors = [];
  walkJsx(ast, (element) => {
    const tagName = element.openingElement?.name?.name ?? null;
    const attrs = element.openingElement?.attributes || [];
    visit(element, { tagName, attrs, errors });
  });
  return { ok: errors.length === 0, errors };
}
