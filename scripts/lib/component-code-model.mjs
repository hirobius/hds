/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/component-code-model.mjs
 *
 * The code side of the Figma parity contract (docs/architecture/variant-contract.md
 * "Figma mapping"). Answers three questions about a component module, straight
 * from source, so the gates never trust a prose or manifest copy of the API:
 *
 *   - props:   which props does the exported component accept (and which are
 *              required)? Resolved with the TypeScript checker, so forwardRef,
 *              VariantProps<typeof cva>, Omit<> and inherited DOM props all count.
 *   - members: compound parts (`Dialog.Title`, `Dialog.Content`) and their props.
 *   - cva:     every `cva(base, { variants, defaultVariants })` axis in the
 *              module, read syntactically (keys are the only contract values).
 *   - figmaUrl: the component's `@figma <node-url>` JSDoc tag, read by the same
 *              code that feeds public/hds-manifest.json.
 *
 * Consumers: scripts/check-figma-mapping.mjs, scripts/generate-code-connect.mjs,
 * scripts/check-code-connect.mjs. Tests inject a plain object with the same
 * `component(filePath, exportName)` shape instead of building a program.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readComponentTags } from '../component-discovery.mjs';

// ── cva extraction (syntactic) ───────────────────────────────────────────────

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return null;
}

function literalValue(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (ts.isNumericLiteral(node)) return node.text;
  return null;
}

function objectProperty(objectLiteral, name) {
  return objectLiteral.properties.find(
    (p) => ts.isPropertyAssignment(p) && propertyName(p.name) === name,
  );
}

/**
 * Extract the union of cva axes (variant name → option keys, in source order)
 * and default variants across every `cva(...)` call in a module.
 *
 * @param {string} sourceText
 * @returns {{ axes: Record<string, string[]>, defaults: Record<string, string> }}
 */
export function extractCva(sourceText) {
  const sourceFile = ts.createSourceFile('module.tsx', sourceText, ts.ScriptTarget.Latest, true);
  const axes = {};
  const defaults = {};

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'cva' &&
      node.arguments[1] &&
      ts.isObjectLiteralExpression(node.arguments[1])
    ) {
      const config = node.arguments[1];
      const variants = objectProperty(config, 'variants');
      if (variants && ts.isObjectLiteralExpression(variants.initializer)) {
        for (const axis of variants.initializer.properties) {
          const axisName = ts.isPropertyAssignment(axis) ? propertyName(axis.name) : null;
          if (!axisName || !ts.isObjectLiteralExpression(axis.initializer)) continue;
          const keys = axis.initializer.properties.map((p) => propertyName(p.name)).filter(Boolean);
          axes[axisName] = [...new Set([...(axes[axisName] ?? []), ...keys])];
        }
      }
      const defaultVariants = objectProperty(config, 'defaultVariants');
      if (defaultVariants && ts.isObjectLiteralExpression(defaultVariants.initializer)) {
        for (const entry of defaultVariants.initializer.properties) {
          if (!ts.isPropertyAssignment(entry)) continue;
          const name = propertyName(entry.name);
          const value = literalValue(entry.initializer);
          if (name && value !== null && !(name in defaults)) defaults[name] = value;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { axes, defaults };
}

// ── Props via the TypeScript checker ─────────────────────────────────────────

function readCompilerOptions(root) {
  const configPath = path.join(root, 'tsconfig.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  );
  return { ...(parsed?.options ?? {}), noEmit: true };
}

function propsOfCallable(checker, type, location) {
  const signature = type.getCallSignatures()[0];
  const param = signature?.getParameters()[0];
  if (!param) return null;
  const paramType = checker.getTypeOfSymbolAtLocation(param, location);
  const props = {};
  for (const symbol of checker.getPropertiesOfType(paramType)) {
    props[symbol.getName()] = {
      optional: (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0,
    };
  }
  return props;
}

/**
 * Build a code model over a fixed set of component modules.
 *
 * @param {{ root: string, files: string[], compilerOptions?: import('typescript').CompilerOptions }} options
 *   `files` are repo-relative paths; they become the program roots.
 */
export function createCodeModel({ root, files, compilerOptions }) {
  const absolute = [...new Set(files)].map((file) => path.join(root, file));
  const program = ts.createProgram(absolute, compilerOptions ?? readCompilerOptions(root));
  const checker = program.getTypeChecker();
  const cache = new Map();

  function component(filePath, exportName) {
    const key = `${filePath}#${exportName}`;
    if (cache.has(key)) return cache.get(key);

    const sourceFile = program.getSourceFile(path.join(root, filePath));
    let result = null;
    const moduleSymbol = sourceFile ? checker.getSymbolAtLocation(sourceFile) : undefined;
    const exported = moduleSymbol
      ? checker.getExportsOfModule(moduleSymbol).find((s) => s.getName() === exportName)
      : undefined;

    if (exported) {
      const type = checker.getTypeOfSymbolAtLocation(exported, sourceFile);
      const props = propsOfCallable(checker, type, sourceFile);
      if (props) {
        const members = {};
        for (const member of checker.getPropertiesOfType(type)) {
          const name = member.getName();
          if (!/^[A-Z]/.test(name)) continue;
          const memberProps = propsOfCallable(
            checker,
            checker.getTypeOfSymbolAtLocation(member, sourceFile),
            sourceFile,
          );
          if (memberProps) members[name] = { props: memberProps };
        }
        const text = fs.readFileSync(path.join(root, filePath), 'utf8');
        result = {
          props,
          members,
          cva: extractCva(text),
          // Read exactly as the manifest reads it (component-discovery.mjs).
          figmaUrl: readComponentTags(text, exportName).figmaUrl,
        };
      }
    }

    cache.set(key, result);
    return result;
  }

  return { component };
}
