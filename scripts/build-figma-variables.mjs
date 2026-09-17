#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — legacy Figma variable exports (`pnpm figma-variables`)
 *
 * Projects the Figma model (scripts/lib/figma-model.mjs, `pnpm figma:model`)
 * into the two formats earlier tooling consumed:
 *   hirobius.figma-variables.json      — Variables Import/Export plugin format
 *   hirobius.figma-variables-api.json  — Figma REST POST /v1/files/:key/variables
 *                                        payload (Enterprise-only API; the sync
 *                                        workflow that sent it is archived)
 *
 * Both are generated and gitignored. Collections, modes, values, scopes and the
 * not-in-Figma decisions all come from the model; nothing is re-derived here.
 * Text and effect styles are not part of either format.
 *
 * Run: node scripts/build-figma-variables.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from './lib/figma-model.mjs';
import { validateFigmaModel } from './lib/figma-model-invariants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** path → { variable, collection } for alias lookups. */
function indexVariables(model) {
  const index = new Map();
  for (const collection of model.collections) {
    for (const variable of collection.variables) index.set(variable.path, { variable, collection });
  }
  return index;
}

/**
 * Variables Import/Export plugin format: aliases are
 * `{ aliasCollection, aliasVariable }` (names), raw values are Figma values.
 */
export function toPluginFormat(model) {
  const index = indexVariables(model);
  return {
    version: '1.0',
    collections: model.collections.map((collection) => ({
      name: collection.name,
      modes: collection.modes,
      variables: collection.variables.map((v) => ({
        name: v.name,
        resolvedType: v.resolvedType,
        description: v.description,
        scopes: v.scopes,
        hiddenFromPublishing: v.hiddenFromPublishing,
        codeSyntax: v.codeSyntax,
        valuesByMode: Object.fromEntries(
          Object.entries(v.valuesByMode).map(([mode, entry]) => {
            if (!('alias' in entry)) return [mode, entry.value];
            const target = index.get(entry.alias);
            return [
              mode,
              { aliasCollection: target.collection.name, aliasVariable: target.variable.name },
            ];
          }),
        ),
      })),
    })),
  };
}

/**
 * Figma REST variables payload. Temporary ids are unique per request: a
 * collection's initial mode is created with the collection and renamed with
 * UPDATE; only additional modes are CREATEd.
 */
export function toRestPayload(model) {
  const collectionId = (c) => `collection:${c.key}`;
  const modeId = (c, mode) => `mode:${c.key}:${mode}`;
  const variableId = (path) => `variable:${path}`;

  const variableCollections = model.collections.map((c) => ({
    action: 'CREATE',
    id: collectionId(c),
    name: c.name,
    initialModeId: modeId(c, c.modes[0]),
    hiddenFromPublishing: c.hiddenFromPublishing,
  }));

  const variableModes = model.collections.flatMap((c) =>
    c.modes.map((mode, i) => ({
      action: i === 0 ? 'UPDATE' : 'CREATE',
      id: modeId(c, mode),
      name: mode,
      variableCollectionId: collectionId(c),
    })),
  );

  const variables = [];
  const variableModeValues = [];
  for (const c of model.collections) {
    for (const v of c.variables) {
      variables.push({
        action: 'CREATE',
        id: variableId(v.path),
        name: v.name,
        variableCollectionId: collectionId(c),
        resolvedType: v.resolvedType,
        description: v.description,
        scopes: v.scopes,
        hiddenFromPublishing: v.hiddenFromPublishing,
        codeSyntax: v.codeSyntax,
      });
      for (const mode of c.modes) {
        const entry = v.valuesByMode[mode];
        variableModeValues.push({
          variableId: variableId(v.path),
          modeId: modeId(c, mode),
          value:
            'alias' in entry
              ? { type: 'VARIABLE_ALIAS', id: variableId(entry.alias) }
              : entry.value,
        });
      }
    }
  }

  return { variableCollections, variableModes, variables, variableModeValues };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const model = buildFigmaModel(
    JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8')),
  );
  const violations = validateFigmaModel(model);
  if (violations.length > 0) {
    console.error(
      `✗ figma-variables — the Figma model has ${violations.length} invariant violation(s):`,
    );
    for (const v of violations) console.error(`  • ${v}`);
    process.exit(1);
  }
  const plugin = toPluginFormat(model);
  writeFileSync(join(ROOT, 'hirobius.figma-variables.json'), JSON.stringify(plugin, null, 2));
  writeFileSync(
    join(ROOT, 'hirobius.figma-variables-api.json'),
    JSON.stringify(toRestPayload(model), null, 2),
  );

  console.log('✓ hirobius.figma-variables.json      (plugin import)');
  console.log('✓ hirobius.figma-variables-api.json  (REST API payload, Enterprise-only)');
  console.log(
    `  ${plugin.collections.reduce((n, c) => n + c.variables.length, 0)} variables across ${plugin.collections.length} collections`,
  );
}
