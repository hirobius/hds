/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the Figma model as files for Figma's native
 * Variables ▸ Import (the fallback when no plugin or MCP write can run).
 *
 * Figma's importer reads DTCG JSON and creates one mode per imported file, so
 * this writes one file per collection × mode. Per Figma's import documentation
 * (help.figma.com "Modes for variables"): colors are DTCG color objects,
 * dimensions are px only, a font family is a single string, and a variable in
 * another collection is referenced with `$extensions["com.figma.aliasData"]`.
 * Within a file, an alias is a plain DTCG reference ("{color.surface.page}").
 * A cross-collection alias also keeps the resolved value for that mode as
 * `$value`, so a file imported before its target collection still holds the
 * right value.
 *
 * Not carried (the importer has no field for them): codeSyntax, text styles,
 * effect styles. `pnpm figma:push` is the complete path.
 */

import { hdsHex } from './figma-runtime.mjs';

const colorObject = ({ r, g, b, a }) => ({
  colorSpace: 'srgb',
  components: [r, g, b],
  alpha: a,
  hex: hdsHex({ r, g, b }),
});

/** The model's only STRING variables are font families (FIGMA_TYPE in figma-model.mjs). */
function dtcgType(variable) {
  if (variable.resolvedType === 'COLOR') return 'color';
  if (variable.resolvedType === 'STRING') return 'fontFamily';
  return variable.unit === 'px' ? 'dimension' : 'number';
}

function dtcgValue(variable, value) {
  if (variable.resolvedType === 'COLOR') return colorObject(value);
  if (variable.resolvedType === 'FLOAT' && variable.unit === 'px') return { value, unit: 'px' };
  return value;
}

/** Figma names split on "/" into DTCG groups; DTCG reserves ".", "{", "}" and a leading "$". */
function segmentsOf(name, collection) {
  const segments = name.split('/');
  for (const segment of segments) {
    const bad =
      ['.', '{', '}'].find((ch) => segment.includes(ch)) ?? (segment.startsWith('$') ? '$' : null);
    if (bad || segment === '') {
      const problem = bad ? `a segment containing "${bad}"` : 'an empty segment';
      throw new Error(
        `${collection}: the variable name "${name}" has ${problem}, which DTCG does not allow in group names. Rename the token so each "/" segment avoids ".", "{", "}" and a leading "$".`,
      );
    }
  }
  return segments;
}

/**
 * @param {object} model  The Figma model (scripts/lib/figma-model.mjs).
 * @returns {Array<{ path: string, collection: string, mode: string, tokens: object }>}
 */
export function buildNativeImportFiles(model) {
  const home = new Map();
  for (const collection of model.collections) {
    for (const variable of collection.variables) home.set(variable.path, { variable, collection });
  }

  /** The raw value `path` takes in `mode`, following aliases (a single-mode collection uses its only mode). */
  const resolve = (path, mode, seen = new Set()) => {
    if (seen.has(path)) throw new Error(`Circular alias at ${path}`);
    seen.add(path);
    const { variable, collection } = home.get(path);
    const entry =
      variable.valuesByMode[collection.modes.includes(mode) ? mode : collection.modes[0]];
    return 'alias' in entry ? resolve(entry.alias, mode, seen) : entry.value;
  };

  return model.collections.flatMap((collection, index) =>
    collection.modes.map((mode) => {
      const tokens = {};
      for (const variable of collection.variables) {
        const segments = segmentsOf(variable.name, collection.name);
        const entry = variable.valuesByMode[mode];
        const extensions = {
          'com.figma.hiddenFromPublishing': variable.hiddenFromPublishing,
          'com.figma.scopes': variable.scopes,
        };
        const token = { $type: dtcgType(variable) };
        if ('alias' in entry) {
          const target = home.get(entry.alias);
          if (target.collection === collection) {
            token.$value = `{${target.variable.name.split('/').join('.')}}`;
          } else {
            token.$value = dtcgValue(variable, resolve(entry.alias, mode));
            extensions['com.figma.aliasData'] = {
              targetVariableSetName: target.collection.name,
              targetVariableName: target.variable.name,
            };
          }
        } else {
          token.$value = dtcgValue(variable, entry.value);
        }
        if (variable.description) token.$description = variable.description;
        token.$extensions = extensions;

        let group = tokens;
        for (const segment of segments.slice(0, -1)) group = group[segment] ??= {};
        group[segments.at(-1)] = token;
      }
      return {
        path: `${String(index + 1).padStart(2, '0')}-${collection.key}/${mode}.json`,
        collection: collection.name,
        mode,
        tokens,
      };
    }),
  );
}
