#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Enforces the component parity contract: every Figma mapping recorded in public/hds-manifest.json (variantAxes, componentProperties, figmaPropertyMapping) must bind to props the component really accepts, and Code Connect templates must map the same contract axes.
 *
 * Contract: docs/architecture/variant-contract.md → "Figma mapping".
 *
 * Errors (exit 1):
 *   unknown-component         spec's export not found in its filePath
 *   variant-axis-not-a-prop   variantAxes entry is not a prop (Figma-only `state` excepted)
 *   contract-axis-missing     a variant/tone/size/density prop backed by a cva axis is not in variantAxes
 *   axis-prop-undocumented    a variant axis is missing from the manifest `props` table
 *   enum-values-drift         manifest props/propConstraints enum values ≠ cva keys
 *   source-prop-unknown       componentProperties[].sourceProp is not a prop (or `Member.prop`)
 *   mapping-prop-unknown      figmaPropertyMapping key is not a prop (or `Member.prop`)
 *   mapping-name-conflict     one prop mapped to two different Figma property names
 *   inverted-boolean-name     `invert: true` on a property not named "Show …"
 *   invert-non-boolean        `invert: true` on a non-BOOLEAN property
 *   registry-axis-drift       figma/code-connect.json template maps different contract axes than the manifest
 *   registry-property-unknown a templated component's manifest names a Figma property the registry does not define
 *   registry-property-type    manifest and registry record different types for one Figma property
 *   registry-property-binding manifest maps a prop to a different Figma property than the registry does
 *
 * Warnings (advisory, exit 0):
 *   property-name-case        Figma property name is not Title Case
 *
 * Run: node scripts/check-figma-mapping.mjs [--json]
 * Or:  pnpm check:figma-mapping
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCodeModel } from './lib/component-code-model.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// runFigmaMappingCheck already takes `root`, so a fixture root only had to be
// readable from the environment. See docs/guardrails/FIXTURE_DIR_HARNESS.md.
const DEFAULT_ROOT = process.env.FIXTURE_DIR
  ? path.resolve(process.env.FIXTURE_DIR)
  : path.join(__dirname, '..');

export const CONTRACT_AXES = ['variant', 'tone', 'size', 'density'];
/** Axes that exist only on the Figma side (interaction-state previews). */
export const FIGMA_ONLY_AXES = ['state'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function hasFigmaMapping(spec) {
  return (
    (Array.isArray(spec?.variantAxes) && spec.variantAxes.length > 0) ||
    (Array.isArray(spec?.componentProperties) && spec.componentProperties.length > 0) ||
    (isObject(spec?.figmaPropertyMapping) && Object.keys(spec.figmaPropertyMapping).length > 0)
  );
}

/**
 * Specs in scope — any Figma mapping data, or a Code Connect template in the
 * registry — with the file + export they bind to.
 */
export function specsWithFigmaMapping(manifest, registry) {
  const templated = new Set(Object.keys(registry?.templates ?? {}));
  return Object.entries(manifest?.componentSpecs ?? {})
    .filter(([name, spec]) => hasFigmaMapping(spec) || templated.has(name))
    .map(([name, spec]) => ({
      name,
      spec,
      filePath: spec.filePath || spec.sourcePath,
      exportName: spec.sourceExport ?? spec.preview?.exportName ?? name,
    }));
}

function resolvesToProp(code, ref) {
  const [head, tail] = String(ref).split('.');
  if (tail !== undefined) return Boolean(code.members?.[head]?.props?.[tail]);
  return Boolean(code.props?.[head]);
}

const isTitleCase = (name) =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => /^[A-Z0-9]/.test(word));

const sameSet = (a, b) => a.length === b.length && a.every((value) => b.includes(value));

/**
 * @param {{ manifest: object, codeModel: { component(filePath: string, exportName: string): object|null }, registry?: object }} input
 * @returns {{ errors: object[], warnings: object[] }}
 */
export function checkFigmaMapping({ manifest, codeModel, registry }) {
  const errors = [];
  const warnings = [];
  const error = (component, rule, message) =>
    errors.push({ component, rule, message, severity: 'error' });
  const warn = (component, rule, message) =>
    warnings.push({ component, rule, message, severity: 'warn' });

  for (const { name, spec, filePath, exportName } of specsWithFigmaMapping(manifest, registry)) {
    const code = filePath ? codeModel.component(filePath, exportName) : null;
    if (!code) {
      error(
        name,
        'unknown-component',
        `export "${exportName}" not found in ${filePath ?? '(no filePath)'}`,
      );
      continue;
    }

    const axes = Array.isArray(spec.variantAxes) ? spec.variantAxes : [];
    const cvaAxes = code.cva?.axes ?? {};

    // Variant axes must be real props.
    for (const axis of axes) {
      if (FIGMA_ONLY_AXES.includes(axis)) continue;
      if (!code.props[axis]) {
        error(
          name,
          'variant-axis-not-a-prop',
          `variantAxes lists "${axis}", which ${exportName} does not accept`,
        );
      }
    }

    // Contract axes that are real cva-backed props must be declared.
    for (const axis of CONTRACT_AXES) {
      if (code.props[axis] && cvaAxes[axis] && !axes.includes(axis)) {
        error(
          name,
          'contract-axis-missing',
          `"${axis}" is a cva-backed prop of ${exportName} but is missing from variantAxes`,
        );
      }
    }

    // Manifest enum tables must match cva keys for every declared cva axis.
    const propsTable = isObject(spec.props) ? spec.props : {};
    for (const axis of axes) {
      if (FIGMA_ONLY_AXES.includes(axis) || !code.props[axis]) continue;
      if (Object.keys(propsTable).length > 0 && !propsTable[axis]) {
        error(
          name,
          'axis-prop-undocumented',
          `variant axis "${axis}" is missing from the manifest props table`,
        );
      }
      const keys = cvaAxes[axis];
      if (!keys) continue;
      for (const [table, entries] of [
        ['props', propsTable],
        ['propConstraints', spec.propConstraints],
      ]) {
        const values = entries?.[axis]?.values;
        if (Array.isArray(values) && !sameSet(values, keys)) {
          error(
            name,
            'enum-values-drift',
            `${table}.${axis} values [${values.join(', ')}] ≠ cva keys [${keys.join(', ')}]`,
          );
        }
      }
    }

    // componentProperties must bind to real props; inversion must read as visibility.
    const namesByProp = new Map();
    for (const property of spec.componentProperties ?? []) {
      if (property.sourceProp && !resolvesToProp(code, property.sourceProp)) {
        error(
          name,
          'source-prop-unknown',
          `componentProperties "${property.name}" binds to "${property.sourceProp}", which ${exportName} does not accept`,
        );
      }
      if (property.invert) {
        if (property.type !== 'BOOLEAN') {
          error(
            name,
            'invert-non-boolean',
            `"${property.name}" is ${property.type}; only BOOLEAN properties can invert`,
          );
        } else if (!/^Show\s/i.test(property.name)) {
          error(
            name,
            'inverted-boolean-name',
            `inverted boolean "${property.name}" must be a "Show …" visibility toggle (true = visible)`,
          );
        }
      }
      if (property.sourceProp) namesByProp.set(property.sourceProp, property.name);
      if (!isTitleCase(property.name)) {
        warn(name, 'property-name-case', `Figma property "${property.name}" is not Title Case`);
      }
    }

    for (const [prop, figmaName] of Object.entries(spec.figmaPropertyMapping ?? {})) {
      if (!resolvesToProp(code, prop)) {
        error(
          name,
          'mapping-prop-unknown',
          `figmaPropertyMapping "${prop}" is not a prop of ${exportName}`,
        );
      }
      const bound = namesByProp.get(prop);
      if (bound !== undefined && bound !== figmaName) {
        error(
          name,
          'mapping-name-conflict',
          `"${prop}" maps to "${figmaName}" in figmaPropertyMapping but "${bound}" in componentProperties`,
        );
      }
      if (bound === undefined && !isTitleCase(figmaName)) {
        warn(name, 'property-name-case', `Figma property "${figmaName}" is not Title Case`);
      }
    }

    // Code Connect template must map the same contract axes the manifest declares.
    const template = registry?.templates?.[name];
    if (template) {
      const manifestContract = axes.filter((axis) => CONTRACT_AXES.includes(axis)).sort();
      const templateContract = Object.values(template.properties ?? {})
        .map((property) => property.prop)
        .filter((prop) => CONTRACT_AXES.includes(prop))
        .sort();
      if (!sameSet(manifestContract, templateContract)) {
        error(
          name,
          'registry-axis-drift',
          `manifest contract axes [${manifestContract.join(', ')}] ≠ Code Connect template axes [${templateContract.join(', ')}] (figma/code-connect.json)`,
        );
      }
      checkRegistryPropertyNames({ name, spec, template, error });
    }
  }

  return { errors, warnings };
}

/**
 * The manifest (componentProperties, figmaPropertyMapping) and the Code Connect
 * registry both record Figma property names. For a templated component they must
 * not contradict each other: every name the manifest records is a registry
 * property of the same type, and a prop the registry binds maps to the same
 * property (or to the `Show …` toggle that gates it). The manifest may bind an
 * extra prop the template does not use (Button `label` → `Label`).
 */
function checkRegistryPropertyNames({ name, spec, template, error }) {
  const properties = template.properties ?? {};
  const bindings = new Map();
  const bind = (prop, figmaName) => {
    if (!bindings.has(prop)) bindings.set(prop, new Set());
    bindings.get(prop).add(figmaName);
  };
  for (const [figmaName, def] of Object.entries(properties)) {
    if (def?.prop) {
      bind(def.prop, figmaName);
      if (def.visibleWhen) bind(def.prop, def.visibleWhen);
    }
    for (const setProps of Object.values(def?.set ?? {})) {
      for (const prop of Object.keys(setProps ?? {})) bind(prop, figmaName);
    }
  }

  const recorded = [
    ...(spec.componentProperties ?? []).map((property) => ({
      figmaName: property.name,
      type: property.type,
      prop: property.sourceProp,
    })),
    ...Object.entries(spec.figmaPropertyMapping ?? {}).map(([prop, figmaName]) => ({
      figmaName,
      prop,
    })),
  ];
  const reported = new Set();
  const once = (rule, key, message) => {
    if (reported.has(`${rule}:${key}`)) return;
    reported.add(`${rule}:${key}`);
    error(name, rule, message);
  };
  const source = `figma/code-connect.json${template.evidence ? ` (evidence: ${template.evidence})` : ''}`;

  for (const { figmaName, type, prop } of recorded) {
    const def = properties[figmaName];
    if (!def) {
      once(
        'registry-property-unknown',
        figmaName,
        `the manifest records Figma property "${figmaName}", which ${source} does not define for ${name} [${Object.keys(properties).join(', ')}]`,
      );
      continue;
    }
    if (type && def.type && type !== def.type) {
      once(
        'registry-property-type',
        figmaName,
        `the manifest records "${figmaName}" as ${type}; ${source} records ${def.type}`,
      );
    }
    const bound = prop ? bindings.get(prop) : undefined;
    if (bound && !bound.has(figmaName)) {
      once(
        'registry-property-binding',
        `${prop}:${figmaName}`,
        `the manifest maps "${prop}" to "${figmaName}"; ${source} maps it to [${[...bound].join(', ')}]`,
      );
    }
  }
}

// ── Repository runner ────────────────────────────────────────────────────────

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : undefined;
}

export function runFigmaMappingCheck({ root = DEFAULT_ROOT } = {}) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'public', 'hds-manifest.json'), 'utf8'),
  );
  const registry = readJsonIfExists(path.join(root, 'figma', 'code-connect.json'));
  const files = specsWithFigmaMapping(manifest, registry)
    .map((entry) => entry.filePath)
    .filter((file) => file && fs.existsSync(path.join(root, file)));
  const codeModel = createCodeModel({ root, files });
  return checkFigmaMapping({ manifest, codeModel, registry });
}

function main() {
  const json = process.argv.includes('--json');
  const { errors, warnings } = runFigmaMappingCheck();
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ ok: errors.length === 0, violations: [...errors, ...warnings] }, null, 2)}\n`,
    );
  } else {
    for (const v of warnings) console.warn(`  warn  ${v.component}: ${v.rule} — ${v.message}`);
    for (const v of errors) console.error(`  error ${v.component}: ${v.rule} — ${v.message}`);
    if (errors.length === 0) {
      console.log(`✓ check-figma-mapping — 0 errors, ${warnings.length} advisory warning(s)`);
    } else {
      console.error(
        `✗ check-figma-mapping — ${errors.length} error(s). Contract: docs/architecture/variant-contract.md#figma-mapping`,
      );
    }
  }
  process.exit(errors.length === 0 ? 0 : 1);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
