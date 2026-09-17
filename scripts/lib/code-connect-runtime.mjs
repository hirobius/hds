/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/code-connect-runtime.mjs
 *
 * A local, token-free stand-in for Figma's Code Connect template runtime.
 *
 * Why it exists: `figma connect preview` (v2) is not local. It needs a
 * FIGMA_ACCESS_TOKEN, fetches component property definitions over REST and
 * renders on Figma's servers (POST /v1/code_connect/preview_snippets), so it
 * cannot run in CI or on the Pro plan. This module executes the exact template
 * JavaScript that `figma connect parse` emits against the property definitions
 * committed in figma/code-connect.json, for every VARIANT × BOOLEAN
 * combination. It implements the `figma` API surface HDS templates use
 * (selectedInstance.getString / getBoolean / getEnum / getInstanceSwap,
 * executeTemplate, figma.code / figma.tsx) and fails loudly the way Figma
 * does: an unknown property, a property read with the wrong type, or an
 * interpolated undefined.
 *
 * It does not replace a live `figma connect preview --all` against the real
 * library. It proves the templates are correct against the recorded
 * property definitions.
 */

import vm from 'node:vm';
import ts from 'typescript';

/** Placeholder snippet a swapped instance renders to in local previews. */
export const SWAPPED_INSTANCE_SNIPPET = '<IconInstance />';

// ── Transpile exactly like `figma connect parse` ─────────────────────────────

// Same regex the CLI uses (dist/connect/raw_templates.js) to rewrite the import.
const FIGMA_IMPORT =
  /^import[ \t]+figma[ \t]+from[ \t]+['"]figma['"][ \t]*;?[ \t]*(?:\/\/[^\r\n]*)?$/m;

/** Rewrite the figma import + transpile TS → JS + drop the leading comment block. */
export function transpileLikeCli(source) {
  const rewritten = source.replace(FIGMA_IMPORT, "const figma = require('figma')");
  const js = ts.transpileModule(rewritten, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2021,
      removeComments: false,
    },
  }).outputText;
  const lines = js.split('\n');
  const start = lines.findIndex((line) => line.trim() !== '' && !line.trim().startsWith('//'));
  return lines.slice(Math.max(start, 0)).join('\n');
}

// ── Execute ──────────────────────────────────────────────────────────────────

/** Compile template JS (as emitted by `figma connect parse`) for repeated renders. */
export function compileTemplate(templateJs) {
  const matches = templateJs.match(/^export default /gm) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `template must have exactly one top-level "export default" (found ${matches.length})`,
    );
  }
  return new vm.Script(templateJs.replace(/^export default /m, '__exports.default = '), {
    filename: 'code-connect-template.js',
  });
}

function toSections(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return [{ type: 'CODE', code: String(value) }];
  }
  if (Array.isArray(value)) return value.flatMap(toSections);
  if (value && value.type === 'SECTIONS') return value.sections;
  if (value && (value.type === 'CODE' || value.type === 'INSTANCE')) return [value];
  throw new Error(
    `template interpolated ${value === null ? 'null' : typeof value} (${String(value)})`,
  );
}

export function sectionsToString(value) {
  return toSections(value)
    .map((section) =>
      section.type === 'INSTANCE' ? sectionsToString(section.resultSections ?? []) : section.code,
    )
    .join('');
}

function createRuntime(properties, values, enumCalls) {
  const read = (name, type) => {
    const def = properties[name];
    if (!def) throw new Error(`PropertyNotFoundError: property "${name}" not found`);
    if (def.type !== type) throw new Error(`property "${name}" is ${def.type}, not ${type}`);
    return values[name];
  };
  const unsupported = (method) => () => {
    throw new Error(`${method}() is not supported by the local Code Connect preview`);
  };
  const tag = (strings, ...interpolated) => {
    const sections = [];
    strings.forEach((text, i) => {
      if (text) sections.push({ type: 'CODE', code: text });
      if (i < interpolated.length) sections.push(...toSections(interpolated[i]));
    });
    return { type: 'SECTIONS', language: 'jsx', sections };
  };

  const instance = {
    type: 'INSTANCE',
    getString: (name) => String(read(name, 'TEXT')),
    getBoolean: (name, mapping) => {
      const value = Boolean(read(name, 'BOOLEAN'));
      return mapping ? mapping[String(value)] : value;
    },
    getEnum: (name, mapping) => {
      const value = read(name, 'VARIANT');
      enumCalls.push({ property: name, mapping: { ...mapping } });
      return mapping[value];
    },
    getInstanceSwap: (name) => {
      const snippet = read(name, 'INSTANCE_SWAP');
      return {
        type: 'INSTANCE',
        executeTemplate: () => ({
          example: [
            {
              type: 'INSTANCE',
              guid: `local:${name}`,
              symbolId: name,
              resultSections: [{ type: 'CODE', code: String(snippet) }],
            },
          ],
          metadata: { nestable: true },
        }),
      };
    },
    getPropertyValue: unsupported('getPropertyValue'),
    getSlot: unsupported('getSlot'),
    findInstance: unsupported('findInstance'),
    findText: unsupported('findText'),
    findConnectedInstance: unsupported('findConnectedInstance'),
    findConnectedInstances: unsupported('findConnectedInstances'),
    findLayers: unsupported('findLayers'),
  };

  return { selectedInstance: instance, currentLayer: instance, code: tag, tsx: tag };
}

/**
 * Render one property combination.
 * @returns {{ snippet?: string, imports?: string[], id?: string, enumCalls: object[], error?: string }}
 */
export function renderTemplate(compiled, { properties, values }) {
  const enumCalls = [];
  try {
    const figma = createRuntime(properties, values, enumCalls);
    const context = {
      __exports: {},
      require: (name) => {
        if (name === 'figma') return figma;
        throw new Error(`templates may only require('figma'), not "${name}"`);
      },
    };
    compiled.runInNewContext(context, { timeout: 1000 });
    const result = context.__exports.default;
    if (!result || result.example === undefined) throw new Error('default export has no example');
    return {
      snippet: sectionsToString(result.example),
      imports: result.imports,
      id: result.id,
      enumCalls,
    };
  } catch (error) {
    return { enumCalls, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Property combinations (the local `--all`) ───────────────────────────────

function fixedValue(name, def) {
  if (def.type === 'TEXT') return def.default ?? name;
  if (def.type === 'INSTANCE_SWAP') return def.default ?? SWAPPED_INSTANCE_SNIPPET;
  if (def.type === 'BOOLEAN') return def.default ?? false;
  return def.default ?? def.options[0];
}

/** Default value for every property (VARIANT default or first option). */
export function defaultValues(properties) {
  return Object.fromEntries(
    Object.entries(properties).map(([name, def]) => [name, fixedValue(name, def)]),
  );
}

/** Every VARIANT × BOOLEAN combination; TEXT / INSTANCE_SWAP stay at their defaults. */
export function enumerateCombinations(properties, { cap = 5000 } = {}) {
  let combos = [defaultValues(properties)];
  for (const [name, def] of Object.entries(properties)) {
    const choices =
      def.type === 'VARIANT' ? def.options : def.type === 'BOOLEAN' ? [false, true] : null;
    if (!choices) continue;
    combos = combos.flatMap((combo) => choices.map((choice) => ({ ...combo, [name]: choice })));
    if (combos.length > cap) {
      throw new Error(`more than ${cap} property combinations; raise the cap deliberately`);
    }
  }
  return combos;
}

/** Defaults, plus each VARIANT option / BOOLEAN flip applied one at a time. */
export function singleVariations(properties) {
  const base = defaultValues(properties);
  const out = [{ label: 'default', values: base }];
  for (const [name, def] of Object.entries(properties)) {
    const choices =
      def.type === 'VARIANT' ? def.options : def.type === 'BOOLEAN' ? [false, true] : [];
    for (const choice of choices) {
      if (choice === base[name]) continue;
      out.push({ label: `${name}=${choice}`, values: { ...base, [name]: choice } });
    }
  }
  return out;
}

// ── Snippet analysis ─────────────────────────────────────────────────────────

/**
 * Parse a rendered JSX snippet and describe its root element.
 * @returns {{ syntaxErrors: string[], tag?: string, attributes: { name: string, value: string|null }[] }}
 */
export function analyzeSnippet(snippet) {
  const wrapped = `const __snippet = (\n${snippet}\n);\n`;
  const syntaxErrors =
    ts
      .transpileModule(wrapped, {
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve },
        fileName: 'snippet.tsx',
      })
      .diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')) ?? [];

  const sourceFile = ts.createSourceFile(
    'snippet.tsx',
    wrapped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let opening;
  const find = (node) => {
    if (opening) return;
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      opening = node;
      return;
    }
    ts.forEachChild(node, find);
  };
  find(sourceFile);

  const attributes = [];
  if (opening) {
    for (const attribute of opening.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue;
      const init = attribute.initializer;
      attributes.push({
        name: attribute.name.getText(sourceFile),
        value: init && ts.isStringLiteral(init) ? init.text : null,
      });
    }
  }
  return { syntaxErrors, tag: opening?.tagName.getText(sourceFile), attributes };
}
