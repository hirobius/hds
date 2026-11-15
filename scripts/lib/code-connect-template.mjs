/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/code-connect-template.mjs
 *
 * Registry → Figma Code Connect v2 template (`<module>.figma.ts`).
 *
 * The registry (figma/code-connect.json) records, per templated component, the
 * Figma component's property definitions and how each maps onto the code:
 *
 *   VARIANT        { options, default?, prop, values?, codeOnly? }
 *                                                        → getEnum → `prop="value"`
 *                  (codeOnly: { cvaKey: "<reason>" } for cva keys Figma has no option for)
 *                  { options, default?, set: { option: { prop: value } } }
 *                                                        → getEnum → props per option
 *   TEXT           { default?, prop, visibleWhen? }       → getString → `prop="…"` / children
 *   BOOLEAN        { default?, prop?, invert? }           → getBoolean → bare boolean prop
 *                  { default?, set: { true: { prop: value }, false: { … } } }
 *                                                        → getBoolean → props per state
 *                  (no prop / set: must be some property's `visibleWhen`)
 *   INSTANCE_SWAP  { default?, prop, visibleWhen? }       → getInstanceSwap → executeTemplate()
 *   any            { figmaOnly: "<reason>" }              → accounted for, never emitted
 *
 *   staticProps    { prop: "<raw JSX attribute value>" }  → required props Figma has no property for
 *   children       "<raw JSX>"                            → element children; `{{Figma name}}` is
 *                                                           replaced by that TEXT property's value,
 *                                                           or by a VARIANT's mapped value
 *                                                           ({ options, values? } with no prop / set)
 *   importFrom     "<module>"                             → the component's import module, when it
 *                                                           is not the registry's `importFrom`
 *   imports        { "<module>": ["Name"] }               → extra names the snippet uses
 *
 * The code side (props, required-ness, cva axes + defaultVariants) comes from
 * scripts/lib/component-code-model.mjs. VARIANT values that land on a cva axis
 * must be cva keys, and a prop equal to its cva default is omitted.
 *
 * Contract: docs/architecture/variant-contract.md → "Figma mapping".
 */

import path from 'node:path';

export const REGISTRY_PATH = 'figma/code-connect.json';
export const UNMAPPED_URL_PREFIX = 'https://www.figma.com/design/UNMAPPED/';

const PROPERTY_TYPES = new Set(['VARIANT', 'TEXT', 'BOOLEAN', 'INSTANCE_SWAP']);
const PROPERTY_KEYS = new Set([
  'type',
  'options',
  'default',
  'prop',
  'values',
  'set',
  'visibleWhen',
  'invert',
  'figmaOnly',
  'codeOnly',
]);
const ENTRY_KEYS = new Set([
  'source',
  'export',
  'evidence',
  'note',
  'properties',
  'staticProps',
  'children',
  'importFrom',
  'imports',
]);
const BOOLEAN_STATES = ['true', 'false'];
const CHILD_REFERENCE = /\{\{([^{}]+)\}\}/g;

/**
 * The snippet's import lines: the component first (merged with extra names from
 * the same module), then one line per other module in `entry.imports`.
 */
export function importLinesFor(entry, component, defaultImportFrom) {
  const main = entry.importFrom ?? defaultImportFrom;
  const extra = isObject(entry.imports) ? entry.imports : {};
  const line = (names, module) => `import { ${names.join(', ')} } from '${module}'`;
  return [
    line([component, ...(extra[main] ?? [])], main),
    ...Object.entries(extra)
      .filter(([module]) => module !== main)
      .map(([module, names]) => line(names, module)),
  ];
}

/** Figma property names an entry's `children` interpolates. */
export function childReferences(entry) {
  return typeof entry?.children === 'string'
    ? [...entry.children.matchAll(CHILD_REFERENCE)].map((match) => match[1].trim())
    : [];
}
const RESERVED = new Set([
  'figma',
  'instance',
  'default',
  'class',
  'function',
  'var',
  'let',
  'const',
  'new',
  'delete',
  'in',
  'for',
  'if',
  'else',
  'switch',
  'case',
  'return',
  'this',
  'void',
  'with',
  'do',
  'while',
  'import',
  'export',
  'enum',
]);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// ── URLs + paths ─────────────────────────────────────────────────────────────

/** Placeholder `// url=` for a component with no known Figma node. */
export function unmappedUrlFor(name) {
  return `${UNMAPPED_URL_PREFIX}${name}`;
}

/** 'mapped' (real node URL) · 'unmapped' (null / placeholder) · 'invalid'. */
export function classifyFigmaUrl(url) {
  if (url === null || url === undefined || url === '') return 'unmapped';
  if (String(url).startsWith(UNMAPPED_URL_PREFIX)) return 'unmapped';
  return /^https:\/\/(www\.)?figma\.com\/(design|file)\/[A-Za-z0-9]+\/[^?\s]*\?(.*&)?node-id=\d+[-:]\d+/.test(
    String(url),
  )
    ? 'mapped'
    : 'invalid';
}

/**
 * `src/app/components/checkbox.tsx` → `src/app/components/checkbox.figma.ts`.
 * With `exportName` (a second template of the same module), the file is named
 * after the export: `tabs.tsx` + `TabsTrigger` → `tabs-trigger.figma.ts`.
 */
export function templatePathFor(entry, exportName) {
  const dir = path.posix.dirname(entry.source);
  const base = exportName
    ? kebabCase(exportName)
    : path.posix.basename(entry.source).replace(/\.(tsx|ts)$/, '');
  return `${dir}/${base}.figma.ts`;
}

export function kebabCase(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function identifierFor(figmaName, taken) {
  const words = String(figmaName)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  let id = words
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
  if (!id || /^[0-9]/.test(id)) id = `p${id}`;
  if (RESERVED.has(id)) id = `${id}Value`;
  let unique = id;
  for (let n = 2; taken.has(unique); n += 1) unique = `${id}${n}`;
  taken.add(unique);
  return unique;
}

// ── Validation ───────────────────────────────────────────────────────────────

function mappedValues(def) {
  if (isObject(def.values)) return def.values;
  return Object.fromEntries((def.options ?? []).map((option) => [option, option]));
}

/** True when `object` has exactly the keys in `list` (order-free). */
export const sameKeys = (object, list) => {
  const keys = Object.keys(object ?? {});
  return keys.length === list.length && list.every((item) => keys.includes(item));
};

/**
 * `codeOnly` on a prop-mapped VARIANT acknowledges cva keys that have no Figma
 * option yet, each with a reason. scripts/check-code-connect.mjs fails on any
 * other cva key a Figma option does not map to.
 */
function validateCodeOnly(figmaName, def, code, fail) {
  if (def.type !== 'VARIANT' || def.prop === undefined || !isObject(def.codeOnly)) {
    fail(`property "${figmaName}": codeOnly needs a VARIANT mapped with prop`);
    return;
  }
  const cvaKeys = code.cva?.axes?.[def.prop] ?? [];
  const mapped = Object.values(mappedValues(def));
  for (const [key, reason] of Object.entries(def.codeOnly)) {
    if (!cvaKeys.includes(key)) {
      fail(
        `VARIANT "${figmaName}": codeOnly "${key}" is not a cva value of ${def.prop} [${cvaKeys.join(', ')}]`,
      );
    } else if (mapped.includes(key)) {
      fail(
        `VARIANT "${figmaName}": codeOnly "${key}" is mapped from a Figma option; remove it from codeOnly`,
      );
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      fail(`VARIANT "${figmaName}": codeOnly "${key}" needs a reason`);
    }
  }
}

/**
 * Validate one registry entry against the component's code model.
 * @returns {string[]} human-readable errors (empty = valid)
 */
export function validateTemplateEntry(name, entry, code) {
  const errors = [];
  const fail = (message) => errors.push(`${name}: ${message}`);

  if (!code) {
    fail(`export "${entry?.export ?? name}" not found in ${entry?.source ?? '(no source)'}`);
    return errors;
  }
  for (const key of Object.keys(entry)) {
    if (!ENTRY_KEYS.has(key)) fail(`unknown registry key "${key}"`);
  }
  const properties = entry.properties;
  if (!isObject(properties)) {
    fail('has no Figma properties object');
    return errors;
  }
  if (
    entry.importFrom !== undefined &&
    (typeof entry.importFrom !== 'string' || !entry.importFrom)
  ) {
    fail('importFrom must be a module name');
  }
  if (
    entry.imports !== undefined &&
    !(
      isObject(entry.imports) &&
      Object.values(entry.imports).every(
        (names) =>
          Array.isArray(names) &&
          names.length > 0 &&
          names.every((n) => /^[A-Za-z_$][\w$]*$/.test(n)),
      )
    )
  ) {
    fail('imports must map a module to a list of names');
  }

  const isProp = (prop) => Boolean(code.props?.[prop]);
  const covered = new Set();
  const referenced = new Set(
    Object.values(properties)
      .map((def) => def?.visibleWhen)
      .filter(Boolean),
  );

  const validateSet = (figmaName, def, states, kind) => {
    if (!isObject(def.set) || !sameKeys(def.set, states)) {
      fail(
        kind === 'VARIANT'
          ? `VARIANT "${figmaName}" set must map every option exactly [${states.join(', ')}]`
          : `BOOLEAN "${figmaName}" set must map exactly [${states.join(', ')}]`,
      );
      return;
    }
    for (const [option, props] of Object.entries(def.set)) {
      for (const [prop, value] of Object.entries(props ?? {})) {
        if (!isProp(prop)) {
          fail(
            `${kind} "${figmaName}" option "${option}": "${prop}" is not a prop of ${entry.export ?? name}`,
          );
          continue;
        }
        covered.add(prop);
        const cvaKeys = code.cva?.axes?.[prop];
        if (typeof value === 'string' && cvaKeys && !cvaKeys.includes(value)) {
          fail(
            `${kind} "${figmaName}" option "${option}": "${value}" is not a cva value of ${prop}`,
          );
        }
        const validValue =
          typeof value === 'boolean' ||
          typeof value === 'string' ||
          (isObject(value) && typeof value.$expr === 'string');
        if (!validValue)
          fail(`${kind} "${figmaName}" option "${option}": unsupported value for "${prop}"`);
      }
    }
  };

  const childRefs = new Set(childReferences(entry));

  for (const [figmaName, def] of Object.entries(properties)) {
    if (!isObject(def) || !PROPERTY_TYPES.has(def.type)) {
      fail(`property "${figmaName}" has an unknown type (${def?.type})`);
      continue;
    }
    for (const key of Object.keys(def)) {
      if (!PROPERTY_KEYS.has(key)) fail(`property "${figmaName}" has unknown key "${key}"`);
    }
    if (def.visibleWhen !== undefined && properties[def.visibleWhen]?.type !== 'BOOLEAN') {
      fail(
        `property "${figmaName}": visibleWhen "${def.visibleWhen}" must name a BOOLEAN property`,
      );
    }
    if (def.codeOnly !== undefined) validateCodeOnly(figmaName, def, code, fail);
    if (def.figmaOnly) continue;

    if (def.prop !== undefined) {
      if (isProp(def.prop)) covered.add(def.prop);
      else
        fail(
          `property "${figmaName}" maps to "${def.prop}", but "${def.prop}" is not a prop of ${entry.export ?? name}`,
        );
    }

    switch (def.type) {
      case 'VARIANT': {
        if (!Array.isArray(def.options) || def.options.length === 0) {
          fail(`VARIANT "${figmaName}" needs options`);
          break;
        }
        if (def.default !== undefined && !def.options.includes(def.default)) {
          fail(`VARIANT "${figmaName}" default "${def.default}" is not an option`);
        }
        if (def.prop === undefined && def.set === undefined && childRefs.has(figmaName)) {
          if (!sameKeys(mappedValues(def), def.options)) {
            fail(`VARIANT "${figmaName}" values must map every option exactly`);
          }
          break;
        }
        if ((def.prop === undefined) === (def.set === undefined)) {
          fail(`VARIANT "${figmaName}" needs exactly one of prop / set`);
          break;
        }
        if (def.prop !== undefined) {
          const values = mappedValues(def);
          if (!sameKeys(values, def.options)) {
            fail(
              `VARIANT "${figmaName}" values must map every option exactly [${def.options.join(', ')}]; got [${Object.keys(values).join(', ')}]`,
            );
          }
          const cvaKeys = code.cva?.axes?.[def.prop];
          if (cvaKeys) {
            for (const value of Object.values(values)) {
              if (!cvaKeys.includes(value)) {
                fail(
                  `VARIANT "${figmaName}": "${value}" is not a cva value of ${def.prop} [${cvaKeys.join(', ')}]`,
                );
              }
            }
          }
        } else {
          validateSet(figmaName, def, def.options, 'VARIANT');
        }
        break;
      }
      case 'TEXT':
      case 'INSTANCE_SWAP':
        if (def.prop === undefined && !(def.type === 'TEXT' && childRefs.has(figmaName))) {
          fail(`${def.type} "${figmaName}" needs a prop (or figmaOnly)`);
        }
        break;
      case 'BOOLEAN':
        if (def.set !== undefined) {
          if (def.prop !== undefined)
            fail(`BOOLEAN "${figmaName}" needs at most one of prop / set`);
          validateSet(figmaName, def, BOOLEAN_STATES, 'BOOLEAN');
        } else if (def.prop === undefined && !referenced.has(figmaName)) {
          fail(
            `BOOLEAN "${figmaName}" is not mapped: give it a prop, reference it from visibleWhen, or mark it figmaOnly`,
          );
        }
        break;
      default:
        break;
    }
  }

  for (const [prop, raw] of Object.entries(entry.staticProps ?? {})) {
    if (!isProp(prop)) fail(`staticProps "${prop}" is not a prop of ${entry.export ?? name}`);
    else covered.add(prop);
    if (typeof raw !== 'string' || !/^(\{.*\}|".*")$/.test(raw)) {
      fail(`staticProps "${prop}" must be a raw JSX attribute value ("…" or {…})`);
    }
  }

  if (entry.children !== undefined) {
    if (typeof entry.children !== 'string' || !entry.children.trim()) {
      fail('children must be a non-empty raw JSX string');
    }
    if (Object.values(properties).some((def) => def?.prop === 'children' && !def.figmaOnly)) {
      fail('children is set twice: by the entry and by a property mapped to "children"');
    }
    for (const reference of childRefs) {
      const target = properties[reference];
      const usable =
        target?.type === 'TEXT' ||
        (target?.type === 'VARIANT' && target.prop === undefined && target.set === undefined);
      if (!usable || target.figmaOnly) {
        fail(
          `children names "${reference}", which is not a TEXT property or a VARIANT without prop / set`,
        );
      }
    }
    covered.add('children');
  }

  for (const [prop, info] of Object.entries(code.props ?? {})) {
    if (info && info.optional === false && !covered.has(prop)) {
      fail(`required prop "${prop}" has no Figma property or staticProps value`);
    }
  }

  return errors;
}

// ── Source generation ────────────────────────────────────────────────────────

const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
/** Escape literal text placed inside a tagged template. */
const literal = (text) =>
  String(text).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const objectKey = (key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key));

function enumMap(mapping) {
  const entries = Object.entries(mapping).map(([k, v]) => `  ${objectKey(k)}: ${quote(v)},`);
  return `{\n${entries.join('\n')}\n}`;
}

function setValueAttribute(prop, value, required) {
  if (value === true) return ` ${prop}`;
  if (value === false) return required ? ` ${prop}={false}` : '';
  if (typeof value === 'string') return ` ${prop}="${literal(value)}"`;
  return ` ${prop}={${literal(value.$expr)}}`;
}

/**
 * Build the (unformatted) `.figma.ts` template source for one registry entry.
 * Callers validate the entry first (validateTemplateEntry).
 */
export function buildTemplateSource({ name, exportName, entry, code, figmaUrl, importFrom }) {
  const component = exportName ?? entry.export ?? name;
  const url = classifyFigmaUrl(figmaUrl) === 'mapped' ? figmaUrl : unmappedUrlFor(name);
  const unmapped = classifyFigmaUrl(figmaUrl) !== 'mapped';
  const required = (prop) => code?.props?.[prop]?.optional === false;
  const cvaDefault = (prop) => code?.cva?.defaults?.[prop];

  const header = [`// url=${url}`, `// source=${entry.source}`, `// component=${component}`, '//'];
  if (unmapped) {
    header.push(
      `// UNMAPPED: no Figma node URL is recorded for ${name}. Add \`@figma <node-url>\` to the`,
      `// component JSDoc in ${entry.source}, then run`,
      '// `pnpm manifest:generate && pnpm figma:connect:generate`.',
      '// `pnpm figma:connect:check` lists every unmapped template.',
      '//',
    );
  }
  header.push(
    '// GENERATED by scripts/generate-code-connect.mjs from figma/code-connect.json',
    `// (Figma properties${entry.evidence ? `, evidence: ${entry.evidence}` : ''}) and the cva variants in the source.`,
    '// Do not edit by hand: change the registry or the component, then regenerate.',
  );

  const body = ["import figma from 'figma';", ''];
  const instanceLine = body.length;
  const taken = new Set(['figma', 'instance']);
  const vars = {};
  const properties = entry.properties;

  // Declarations, in registry order.
  for (const [figmaName, def] of Object.entries(properties)) {
    if (def.figmaOnly) continue;
    const isInert =
      def.type === 'VARIANT' &&
      def.set &&
      Object.values(def.set).every((p) => Object.keys(p ?? {}).length === 0);
    if (isInert) continue;
    const id = identifierFor(figmaName, taken);
    vars[figmaName] = id;
    switch (def.type) {
      case 'VARIANT': {
        const mapping =
          def.set === undefined
            ? mappedValues(def)
            : Object.fromEntries(def.options.map((o) => [o, o]));
        body.push(`const ${id} = instance.getEnum(${quote(figmaName)}, ${enumMap(mapping)});`);
        break;
      }
      case 'TEXT':
        body.push(`const ${id} = instance.getString(${quote(figmaName)});`);
        break;
      case 'BOOLEAN':
        body.push(`const ${id} = instance.getBoolean(${quote(figmaName)});`);
        break;
      default:
        break;
    }
  }
  for (const [figmaName, def] of Object.entries(properties)) {
    if (def.figmaOnly || def.type !== 'INSTANCE_SWAP') continue;
    const id = vars[figmaName] ?? identifierFor(figmaName, taken);
    vars[figmaName] = id;
    const gate = def.visibleWhen ? `${vars[def.visibleWhen]} ? ` : '';
    const read = `instance.getInstanceSwap(${quote(figmaName)})`;
    body.push(`const ${id} = ${gate ? `${gate}${read} : undefined` : read};`);
    body.push(
      `const ${id}Code = ${id} && ${id}.type === 'INSTANCE' ? ${id}.executeTemplate().example : undefined;`,
    );
  }

  // Read the selected instance only when a property is read (an inert or
  // property-less entry would leave the constant unused).
  if (body.length > instanceLine) {
    body.splice(instanceLine, 0, 'const instance = figma.selectedInstance;', '');
  }

  // Attribute fragments, in registry order.
  const attributes = [];
  let children = null;
  const wrapVisible = (def, fragment) =>
    def.visibleWhen ? `\${${vars[def.visibleWhen]} ? ${fragment} : ''}` : null;

  for (const [figmaName, def] of Object.entries(properties)) {
    if (def.figmaOnly) continue;
    const id = vars[figmaName];
    switch (def.type) {
      case 'VARIANT': {
        if (!id) break;
        if (def.prop === undefined && def.set === undefined) break;
        if (def.prop !== undefined) {
          const fallback = cvaDefault(def.prop);
          attributes.push(
            fallback !== undefined
              ? `\${${id} === ${quote(fallback)} ? '' : \` ${def.prop}="\${${id}}"\`}`
              : ` ${def.prop}="\${${id}}"`,
          );
        } else {
          const props = [...new Set(Object.values(def.set).flatMap((p) => Object.keys(p ?? {})))];
          for (const prop of props) {
            const branches = new Map();
            for (const [option, propsForOption] of Object.entries(def.set)) {
              if (!(prop in (propsForOption ?? {}))) continue;
              const fragment = setValueAttribute(prop, propsForOption[prop], required(prop));
              if (!fragment) continue;
              branches.set(fragment, [...(branches.get(fragment) ?? []), option]);
            }
            let expression = "''";
            for (const [fragment, options] of [...branches.entries()].reverse()) {
              const test = options.map((option) => `${id} === ${quote(option)}`).join(' || ');
              expression = `${test} ? ${quote(fragment)} : ${expression}`;
            }
            if (branches.size > 0) attributes.push(`\${${expression}}`);
          }
        }
        break;
      }
      case 'TEXT': {
        if (def.prop === undefined) break;
        if (def.prop === 'children') {
          children = def.visibleWhen ? `\${${vars[def.visibleWhen]} ? ${id} : ''}` : `\${${id}}`;
        } else {
          const fragment = `\` ${def.prop}="\${${id}}"\``;
          attributes.push(wrapVisible(def, fragment) ?? ` ${def.prop}="\${${id}}"`);
        }
        break;
      }
      case 'BOOLEAN': {
        if (def.set !== undefined) {
          const props = [...new Set(Object.values(def.set).flatMap((p) => Object.keys(p ?? {})))];
          for (const prop of props) {
            const fragment = (state) =>
              prop in (def.set[state] ?? {})
                ? setValueAttribute(prop, def.set[state][prop], required(prop))
                : '';
            const [on, off] = [fragment('true'), fragment('false')];
            if (on || off) attributes.push(`\${${id} ? ${quote(on)} : ${quote(off)}}`);
          }
          break;
        }
        if (def.prop === undefined) break;
        const on = def.invert ? `!${id}` : id;
        const offFragment = required(def.prop) ? quote(` ${def.prop}={false}`) : "''";
        attributes.push(`\${${on} ? ${quote(` ${def.prop}`)} : ${offFragment}}`);
        break;
      }
      case 'INSTANCE_SWAP':
        attributes.push(`\${${id}Code ? figma.code\` ${def.prop}={\${${id}Code}}\` : ''}`);
        break;
      default:
        break;
    }
  }
  for (const [prop, raw] of Object.entries(entry.staticProps ?? {})) {
    attributes.push(` ${prop}=${literal(raw)}`);
  }

  if (entry.children !== undefined) {
    children = literal(entry.children).replace(
      CHILD_REFERENCE,
      (_, reference) => `\${${vars[reference.trim()]}}`,
    );
  }

  const open = `<${component}${attributes.join('')}`;
  const example = children === null ? `${open} />` : `${open}>${children}</${component}>`;

  body.push(
    '',
    'export default {',
    `  example: figma.code\`${example}\`,`,
    `  imports: ${JSON.stringify(importLinesFor(entry, component, importFrom))},`,
    `  id: ${quote(kebabCase(component))},`,
    '  metadata: { nestable: true },',
    '};',
    '',
  );

  return [...header, ...body].join('\n');
}
