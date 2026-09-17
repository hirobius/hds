#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * CI-safe Figma Code Connect gate: parses every template with the real `figma connect parse --exit-on-unreadable-files`, requires the committed templates to match the generator, enforces cva ↔ template parity, and renders every VARIANT × BOOLEAN combination locally.
 *
 * No token, no network, runs on any Figma plan. `figma connect preview` is
 * NOT used: in @figma/code-connect v2 it needs FIGMA_ACCESS_TOKEN and renders on
 * Figma's servers. The local renderer (scripts/lib/code-connect-runtime.mjs)
 * executes the exact template JS that parse emits, against the property
 * definitions recorded in figma/code-connect.json.
 *
 * Errors (exit 1):
 *   parse-failed              the CLI exited non-zero (unreadable template)
 *   parse-missing             a registry template is absent from the parse output
 *   registry-invalid          figma/code-connect.json entry fails validation
 *   template-drift            committed .figma.ts differs from generator output
 *   source-missing            `// source=` file does not exist
 *   component-missing         `// component=` export not found in the source
 *   url-invalid               `// url=` is neither a node URL nor the UNMAPPED placeholder
 *   url-source-drift          `// url=` ≠ the component's `@figma` JSDoc tag (manifest or template not regenerated)
 *   parity-missing-template   a public cva module has no template and no exemption
 *   parity-stale-exemption    an exemption names a module that is not a public cva module, or has a template
 *   exemption-invalid         exemption kind/reason malformed
 *   enum-map-keys             a getEnum map does not cover the Figma options exactly
 *   enum-map-values           a getEnum map sends a Figma option to a value outside the cva keys
 *   cva-value-not-in-figma    a cva key of a prop-mapped VARIANT has no Figma option and is not listed under codeOnly
 *   render-error              a combination threw (unknown property, wrong type, undefined…)
 *   render-syntax             a rendered snippet is not valid JSX
 *   render-tag                the snippet's root element is not the component
 *   render-unknown-prop       the snippet passes a prop the component does not accept
 *   render-cva-value          the snippet passes a cva prop a value outside its cva keys
 *   import-line               imports ≠ `import { X } from '<importFrom>'`
 *
 * Reported, not failing (use --strict to fail):
 *   unmapped                  template has no Figma node URL yet (publish would fail)
 *
 * Run: node scripts/check-code-connect.mjs [--strict] [--json]
 * Or:  pnpm figma:connect:check
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCodeModel } from './lib/component-code-model.mjs';
import { classifyFigmaUrl, sameKeys } from './lib/code-connect-template.mjs';
import {
  analyzeSnippet,
  compileTemplate,
  enumerateCombinations,
  renderTemplate,
  singleVariations,
} from './lib/code-connect-runtime.mjs';
import {
  diffAgainstDisk,
  generateTemplates,
  loadCodeConnectInputs,
  registrySourceFiles,
} from './generate-code-connect.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.join(__dirname, '..');
const EXEMPTION_KINDS = new Set(['queued', 'no-figma-component']);
const COMBINATION_CAP = 5000;

// ── Inputs ───────────────────────────────────────────────────────────────────

/** Barrel modules (src/index.ts `export * from './app/components/x'`) whose source calls cva(). */
export function publicCvaModules(root = DEFAULT_ROOT) {
  const barrel = fs.readFileSync(path.join(root, 'src', 'index.ts'), 'utf8');
  const modules = [...barrel.matchAll(/export \* from '\.\/app\/components\/([^']+)'/g)].map(
    (m) => m[1],
  );
  const out = [];
  for (const mod of modules) {
    const file = ['tsx', 'ts']
      .map((ext) => `src/app/components/${mod}.${ext}`)
      .find((candidate) => fs.existsSync(path.join(root, candidate)));
    if (file && /\bcva\(/.test(fs.readFileSync(path.join(root, file), 'utf8'))) out.push(file);
  }
  return out;
}

/** Child env for the CLI: no GIT_* (a hook-exported GIT_DIR must never leak) and no Figma token. */
export function childEnv(env = process.env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !/^GIT_/i.test(key) && key !== 'FIGMA_ACCESS_TOKEN'),
  );
}

/** Run `figma connect parse --exit-on-unreadable-files` and return the parsed docs. */
export function runParse({ root = DEFAULT_ROOT, cli } = {}) {
  const bin = cli ?? path.join(root, 'node_modules', '@figma', 'code-connect', 'bin', 'figma');
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hds-code-connect-parse-'));
  const outFile = path.join(outDir, 'parsed.json');
  try {
    const child = spawnSync(
      process.execPath,
      [
        bin,
        'connect',
        'parse',
        '--skip-update-check',
        '--exit-on-unreadable-files',
        '--outFile',
        outFile,
      ],
      { cwd: root, env: childEnv(), encoding: 'utf8', timeout: 120_000 },
    );
    const output = `${child.stdout ?? ''}${child.stderr ?? ''}${child.error ? String(child.error) : ''}`;
    const docs =
      child.status === 0 && fs.existsSync(outFile)
        ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
        : [];
    return { status: child.status ?? 1, docs, output };
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

// ── The gate ─────────────────────────────────────────────────────────────────

/**
 * Pure gate over already-gathered inputs.
 * @returns {{ errors: object[], warnings: object[], summary: object, previews: object[] }}
 */
export function checkCodeConnect({
  registry,
  codeModel,
  parsed,
  generatorErrors = [],
  generatorDrift = [],
  cvaModules,
  exists,
}) {
  const errors = [];
  const warnings = [];
  const error = (rule, message, component) => errors.push({ rule, component, message });
  const templates = registry.templates ?? {};
  const byExport = new Map(
    Object.entries(templates).map(([name, entry]) => [entry.export ?? name, { name, entry }]),
  );
  const summary = {
    templates: Object.keys(templates).length,
    mapped: [],
    unmapped: [],
    exempt: {},
    combinations: 0,
  };
  const previews = [];

  for (const message of generatorErrors) error('registry-invalid', message);
  for (const message of generatorDrift)
    error('template-drift', `${message} — run pnpm figma:connect:generate`);

  // 1. Parse.
  if (parsed.status !== 0) {
    error(
      'parse-failed',
      `figma connect parse exited ${parsed.status}: ${parsed.output.trim().split('\n').slice(-3).join(' | ')}`,
    );
  }
  const parsedExports = new Set(parsed.docs.map((doc) => doc.component));
  if (parsed.status === 0) {
    for (const exportName of byExport.keys()) {
      if (!parsedExports.has(exportName))
        error('parse-missing', `no parsed template for ${exportName}`, exportName);
    }
  }

  // 2. Parity: every public cva module has a template or an exemption.
  const templatedSources = new Set(Object.values(templates).map((entry) => entry.source));
  const exempt = registry.exempt ?? {};
  for (const module of cvaModules) {
    if (!templatedSources.has(module) && !exempt[module]) {
      error(
        'parity-missing-template',
        `${module} uses cva and is public, but has no Code Connect template or exemption in figma/code-connect.json`,
      );
    }
  }
  for (const [module, exemption] of Object.entries(exempt)) {
    if (!cvaModules.includes(module) || templatedSources.has(module)) {
      error(
        'parity-stale-exemption',
        `${module} is exempt but is ${templatedSources.has(module) ? 'templated' : 'not a public cva module'}`,
      );
    }
    if (
      !EXEMPTION_KINDS.has(exemption?.kind) ||
      typeof exemption?.reason !== 'string' ||
      !exemption.reason
    ) {
      error(
        'exemption-invalid',
        `${module} exemption needs kind (${[...EXEMPTION_KINDS].join(' | ')}) and a reason`,
      );
    } else {
      summary.exempt[exemption.kind] = (summary.exempt[exemption.kind] ?? 0) + 1;
    }
  }

  // 3. Each parsed template.
  for (const doc of parsed.docs) {
    const exportName = doc.component;
    const match = byExport.get(exportName);
    if (!match) {
      error('parse-missing', `parsed template for ${exportName} has no registry entry`, exportName);
      continue;
    }
    const { name, entry } = match;

    if (!doc.source || !exists(doc.source)) {
      error('source-missing', `// source=${doc.source} does not exist`, name);
      continue;
    }
    const code = codeModel.component(doc.source, exportName);
    if (!code) {
      error(
        'component-missing',
        `// component=${exportName} is not exported from ${doc.source}`,
        name,
      );
      continue;
    }

    const urlStatus = classifyFigmaUrl(doc.figmaNode);
    const templateUrl = urlStatus === 'mapped' ? doc.figmaNode : null;
    const sourceUrl = code.figmaUrl ?? null;
    if (urlStatus !== 'invalid' && templateUrl !== sourceUrl) {
      error(
        'url-source-drift',
        `// url= is ${templateUrl ?? 'UNMAPPED'} but the @figma tag in ${doc.source} is ${sourceUrl ?? 'absent'}. Run pnpm manifest:generate && pnpm figma:connect:generate`,
        name,
      );
    }
    if (urlStatus === 'invalid')
      error(
        'url-invalid',
        `// url=${doc.figmaNode} is not a Figma node URL or the UNMAPPED placeholder`,
        name,
      );
    else if (urlStatus === 'mapped') summary.mapped.push(name);
    else {
      summary.unmapped.push(name);
      warnings.push({
        rule: 'unmapped',
        component: name,
        message: `${name} has no Figma node URL; publish would fail. Add @figma <node-url> to ${doc.source}, then run pnpm manifest:generate && pnpm figma:connect:generate`,
      });
    }

    let compiled;
    try {
      compiled = compileTemplate(doc.template);
    } catch (e) {
      error('render-error', e.message, name);
      continue;
    }

    const properties = entry.properties;
    const cvaAxes = code.cva?.axes ?? {};
    const reported = new Set();
    const once = (rule, message) => {
      const key = `${rule}:${message}`;
      if (reported.has(key)) return;
      reported.add(key);
      error(rule, message, name);
    };
    const expectedImport = `import { ${exportName} } from '${registry.importFrom}'`;

    const combinations = enumerateCombinations(properties, { cap: COMBINATION_CAP });
    const unique = new Set();
    const enumTargets = new Map();
    for (const values of combinations) {
      const result = renderTemplate(compiled, { properties, values });
      summary.combinations += 1;
      for (const call of result.enumCalls) {
        const targets = enumTargets.get(call.property) ?? new Set();
        for (const value of Object.values(call.mapping)) targets.add(value);
        enumTargets.set(call.property, targets);
        const def = properties[call.property];
        if (def?.type === 'VARIANT' && !sameKeys(call.mapping, def.options)) {
          once(
            'enum-map-keys',
            `getEnum('${call.property}') maps [${Object.keys(call.mapping).join(', ')}]; Figma options are [${def.options.join(', ')}]`,
          );
        }
        const keys = def?.prop ? cvaAxes[def.prop] : undefined;
        if (keys) {
          const outside = Object.values(call.mapping).filter((value) => !keys.includes(value));
          if (outside.length) {
            once(
              'enum-map-values',
              `getEnum('${call.property}') → ${def.prop} uses [${outside.join(', ')}], not in cva keys [${keys.join(', ')}]`,
            );
          }
        }
      }
      if (result.error) {
        once('render-error', `${JSON.stringify(values)} → ${result.error}`);
        continue;
      }
      if (JSON.stringify(result.imports) !== JSON.stringify([expectedImport])) {
        once('import-line', `imports ${JSON.stringify(result.imports)} ≠ ["${expectedImport}"]`);
      }
      unique.add(result.snippet);
      const analysis = analyzeSnippet(result.snippet);
      if (analysis.syntaxErrors.length) {
        once('render-syntax', `${result.snippet} → ${analysis.syntaxErrors[0]}`);
        continue;
      }
      if (analysis.tag !== exportName)
        once('render-tag', `root element <${analysis.tag}> is not <${exportName}>`);
      for (const attribute of analysis.attributes) {
        if (!code.props[attribute.name]) {
          once('render-unknown-prop', `"${attribute.name}" is not a prop of ${exportName}`);
        } else if (
          attribute.value !== null &&
          cvaAxes[attribute.name] &&
          !cvaAxes[attribute.name].includes(attribute.value)
        ) {
          once(
            'render-cva-value',
            `${attribute.name}="${attribute.value}" is not a cva value [${cvaAxes[attribute.name].join(', ')}]`,
          );
        }
      }
    }

    // Code ahead of Figma: every cva key of a prop-mapped VARIANT must be the
    // target of some Figma option, or be acknowledged under `codeOnly`.
    for (const [figmaName, def] of Object.entries(properties)) {
      if (def?.type !== 'VARIANT' || def.prop === undefined || def.figmaOnly) continue;
      const keys = cvaAxes[def.prop];
      if (!keys) continue;
      const targets = enumTargets.get(figmaName) ?? new Set();
      const acknowledged = Object.keys(def.codeOnly ?? {});
      const missing = keys.filter((key) => !targets.has(key) && !acknowledged.includes(key));
      if (missing.length) {
        once(
          'cva-value-not-in-figma',
          `${def.prop} cva key(s) [${missing.join(', ')}] have no option on the Figma VARIANT "${figmaName}" [${(def.options ?? []).join(', ')}]. Add the option in Figma and to figma/code-connect.json, or list the key under "codeOnly" with a reason`,
        );
      }
    }

    const variations = singleVariations(properties).map(({ label, values }) => {
      const result = renderTemplate(compiled, { properties, values });
      return { label, snippet: result.error ? `ERROR ${result.error}` : result.snippet };
    });
    previews.push({
      name,
      exportName,
      combinations: combinations.length,
      unique: unique.size,
      variations,
    });
  }

  summary.mapped.sort();
  summary.unmapped.sort();
  previews.sort((a, b) => a.name.localeCompare(b.name));
  return { errors, warnings, summary, previews };
}

/**
 * Human-readable snapshot of the local previews (committed as figma/code-connect-preview.txt).
 * It holds snippets only. Mapping status (node URLs) and exemption counts are
 * left out on purpose: they change for reasons that are not snippet changes, and
 * the CLI output and the repository tests already report them.
 */
export function renderPreviewReport({ summary, previews }) {
  const lines = [
    'Figma Code Connect: local preview snapshot',
    'Generated by scripts/__tests__/check-code-connect.test.mjs. Update with: pnpm exec vitest run scripts/__tests__/check-code-connect.test.mjs -u',
    'Snippets are rendered locally from the parsed templates against the Figma property definitions in figma/code-connect.json.',
    'They come from a local emulator of the template runtime, not from Figma, and nothing is published: Dev Mode does not show them.',
    '<IconInstance /> stands in for a swapped icon instance. Text values are preview defaults, not Figma data.',
    '',
    `templates: ${summary.templates} · property combinations rendered: ${summary.combinations}`,
  ];
  for (const preview of previews) {
    lines.push(
      '',
      `## ${preview.name} (${preview.combinations} combinations, ${preview.unique} distinct snippets)`,
    );
    const seen = new Set();
    for (const { label, snippet } of preview.variations) {
      if (label !== 'default' && seen.has(snippet)) continue;
      seen.add(snippet);
      lines.push(`${label.padEnd(24)} ${snippet}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

// ── Repository runner ────────────────────────────────────────────────────────

export async function runCodeConnectGate({ root = DEFAULT_ROOT } = {}) {
  const { registry, manifest } = loadCodeConnectInputs(root);
  const codeModel = createCodeModel({ root, files: registrySourceFiles(registry) });
  const { files, errors: generatorErrors } = await generateTemplates({
    root,
    registry,
    manifest,
    codeModel,
  });
  const generatorDrift = generatorErrors.length ? [] : diffAgainstDisk(root, files);
  const parsed = runParse({ root });
  return checkCodeConnect({
    registry,
    codeModel,
    parsed,
    generatorErrors,
    generatorDrift,
    cvaModules: publicCvaModules(root),
    exists: (file) => fs.existsSync(path.join(root, file)),
  });
}

async function main() {
  const strict = process.argv.includes('--strict');
  const json = process.argv.includes('--json');
  const result = await runCodeConnectGate();
  const failing = [...result.errors, ...(strict ? result.warnings : [])];

  if (json) {
    const violations = [
      ...result.errors.map((e) => ({
        file: 'figma/code-connect.json',
        line: null,
        severity: 'error',
        ...e,
      })),
      ...result.warnings.map((w) => ({
        file: 'figma/code-connect.json',
        line: null,
        severity: strict ? 'error' : 'warn',
        ...w,
      })),
    ];
    process.stdout.write(
      `${JSON.stringify({ ok: failing.length === 0, violations, summary: result.summary }, null, 2)}\n`,
    );
  } else {
    for (const w of result.warnings)
      console.warn(`  ${strict ? 'error' : 'warn '} ${w.rule} ${w.component}: ${w.message}`);
    for (const e of result.errors)
      console.error(`  error ${e.rule}${e.component ? ` ${e.component}` : ''}: ${e.message}`);
    const { summary } = result;
    const line = `${summary.templates} template(s) · mapped ${summary.mapped.length} · unmapped ${summary.unmapped.length} · ${summary.combinations} combinations rendered`;
    if (failing.length === 0) console.log(`✓ check-code-connect — ${line}`);
    else console.error(`✗ check-code-connect — ${failing.length} problem(s); ${line}`);
  }
  process.exit(failing.length === 0 ? 0 : 1);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  await main();
}
