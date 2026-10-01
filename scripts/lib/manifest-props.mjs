/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * manifest-props.mjs — the `props` / `propConstraints` / `requiredProps` of a
 * manifest spec, derived from its src/app/data/component-api.json entry.
 * Pure: enrich-manifest.mjs does the I/O.
 *
 * component-api.json is generated from the code by react-docgen, so it is the
 * source of truth for which props a component takes and their types. The
 * manifest rows used to be filled from it only when absent, which froze each
 * prop at its first-seen type (hds#390: Stack.wrap stayed `boolean` after the
 * code moved to FlexWrap). refreshSpecProps rebuilds them on every run.
 */

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

/** Split a type on its top-level `|`, ignoring any inside (), <>, [] or {}. */
function splitTopLevelUnion(typeText) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const [i, ch] of [...typeText].entries()) {
    if ('(<[{'.includes(ch)) depth += 1;
    // The `>` of an arrow (`=>`) closes nothing.
    else if (')]}'.includes(ch) || (ch === '>' && typeText[i - 1] !== '=')) depth -= 1;
    if (ch === '|' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/** `(x)` → `x` when the parentheses wrap the whole type. */
function unwrapParens(typeText) {
  let text = typeText.trim();
  while (text.startsWith('(') && text.endsWith(')')) {
    let depth = 0;
    let wrapsAll = true;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === '(') depth += 1;
      else if (text[i] === ')') depth -= 1;
      if (depth === 0 && i < text.length - 1) {
        wrapsAll = false;
        break;
      }
    }
    if (!wrapsAll) break;
    text = text.slice(1, -1).trim();
  }
  return text;
}

/**
 * The manifest form of a docgen type string. Nullish members are dropped
 * (`optional` and `default` carry that), `NonNullable<…>` is unwrapped, and a
 * union of string literals becomes `{ type: 'enum', values }`.
 *
 * @param {string} type
 * @returns {{ type: string, values?: string[] }}
 */
export function normalizePropType(type) {
  const raw = String(type).trim();
  const parts = splitTopLevelUnion(raw)
    .flatMap((part) => {
      const inner = /^NonNullable<([\s\S]*)>$/.exec(part);
      return inner ? splitTopLevelUnion(inner[1]) : [part];
    })
    .filter((part) => part !== 'null' && part !== 'undefined');

  if (parts.length === 0) return { type: raw || 'unknown' };

  if (parts.every((part) => /^['"][^'"]+['"]$/.test(part))) {
    return { type: 'enum', values: parts.map(stripQuotes) };
  }

  if (parts.includes('boolean')) return { type: 'boolean' };

  return { type: parts.length === 1 ? unwrapParens(parts[0]) : parts.join(' | ') };
}

function parseDefaultValue(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(String(value))) {
    return Number(value);
  }

  if (/^['"].*['"]$/.test(String(value))) {
    return stripQuotes(String(value));
  }

  return value;
}

/**
 * component-api prop rows → the manifest `props` map.
 *
 * @param {Array<{ name: string, type?: string, default?: string, required?: boolean }>} apiProps
 */
export function normalizeApiProps(apiProps) {
  if (!Array.isArray(apiProps)) {
    return {};
  }

  const props = {};

  for (const prop of apiProps) {
    if (!prop || typeof prop.name !== 'string') {
      continue;
    }

    const normalized = normalizePropType(prop.type ?? 'unknown');

    if (normalized.values) {
      props[prop.name] = { type: normalized.type, values: normalized.values };
    } else {
      props[prop.name] = { type: normalized.type };
    }

    const parsedDefault = parseDefaultValue(prop.default);
    if (parsedDefault !== undefined) {
      props[prop.name].default = parsedDefault;
    }

    if (prop.required === false && parsedDefault === undefined) {
      props[prop.name].optional = true;
    }
  }

  return props;
}

export function deriveRequiredProps(props) {
  return Object.entries(props)
    .filter(([, config]) => isPlainObject(config))
    .filter(
      ([, config]) =>
        config.optional !== true && !Object.prototype.hasOwnProperty.call(config, 'default'),
    )
    .map(([propName]) => propName);
}

export function derivePropConstraints(props) {
  const constraints = {};

  for (const [propName, config] of Object.entries(props)) {
    if (!isPlainObject(config) || typeof config.type !== 'string') {
      continue;
    }

    if (config.type === 'enum' && Array.isArray(config.values)) {
      constraints[propName] = { type: 'enum', values: [...config.values] };
      continue;
    }

    if (config.type === 'boolean') {
      constraints[propName] = { type: 'boolean' };
      continue;
    }

    if (config.type === 'string') {
      constraints[propName] = { type: 'string' };
    }
  }

  return constraints;
}

/**
 * The spec's `props` and `propConstraints`, refreshed from its component-api
 * entry. With no api props the spec keeps what it has (a compiler stub, or a
 * component docgen cannot read). Otherwise `props` is rebuilt from the api,
 * and `propConstraints` is re-derived from it when `derive` is set (the
 * enrich-manifest target set); a spec outside that set keeps its hand-kept
 * constraints, minus any for a prop the code no longer has.
 *
 * @param {{ props?: object, propConstraints?: object }} spec
 * @param {{ props?: unknown[] } | undefined} apiComponent
 * @param {{ derive: boolean }} options
 * @returns {{ props: object, propConstraints: object }}
 */
export function refreshSpecProps(spec, apiComponent, { derive }) {
  const apiProps = apiComponent?.props;
  if (!Array.isArray(apiProps) || apiProps.length === 0) {
    const props = isPlainObject(spec.props) ? spec.props : normalizeApiProps(apiProps);
    const propConstraints = isPlainObject(spec.propConstraints)
      ? spec.propConstraints
      : derive
        ? derivePropConstraints(props)
        : {};
    return { props, propConstraints };
  }

  const props = normalizeApiProps(apiProps);
  if (derive) return { props, propConstraints: derivePropConstraints(props) };

  const kept = isPlainObject(spec.propConstraints) ? spec.propConstraints : {};
  return {
    props,
    propConstraints: Object.fromEntries(Object.entries(kept).filter(([name]) => name in props)),
  };
}
