/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * props-exports — the rule deciding which props types the package must export.
 *
 * `src/index.ts` re-exports every public component module with `export *`, so
 * a type is published iff its module exports it. Nothing in the build notices
 * when one is not: `tsc` is satisfied because the type is in scope *here*, the
 * component still renders, and every test in this repo imports from `src/`.
 * The only place the gap shows up is in a consumer's editor, where
 *
 *   const Wrapped = (props: AlertProps) => <Alert {...props} />;
 *
 * cannot resolve `AlertProps` and the author falls back to
 * `React.ComponentProps<typeof Alert>` or retypes the shape by hand.
 *
 * THE RULE IS REACHABILITY, NOT THE `Props` SUFFIX.
 * A locally-declared type must be exported iff it annotates the props of a
 * component this module exports. That deliberately leaves private:
 *
 *   - the 33 `VariantProps<typeof xVariants>` cva aliases (`button.tsx`:
 *     `type ButtonVariantProps` private, `export interface ButtonProps`
 *     public — the convention this follows),
 *   - composition bases like `NavNativeProps` that only an exported type
 *     extends, and union arms like `TokenBaseProps`,
 *   - cast targets like `WiredChildProps`, which annotate no component,
 *   - the props of sub-components the module keeps to itself.
 *
 * A suffix match would export all of those and grow the API surface with
 * implementation detail, which is the opposite of the point.
 *
 * Used by scripts/check-props-exports.mjs (the standing gate) and by
 * scripts/__tests__/props-exports.test.mjs (the rule's own tests).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

/** A component, by our convention: a capitalised binding. */
const isComponentName = (name) => typeof name === 'string' && /^[A-Z]/.test(name);

/**
 * The type reference this props annotation names, or null.
 *
 * Only a bare identifier counts. `React.HTMLAttributes<T>` is qualified and
 * belongs to React; `{ as?: string }` is inline and has no name to export.
 */
function referencedTypeName(node) {
  if (!node || !ts.isTypeReferenceNode(node)) return null;
  return ts.isIdentifier(node.typeName) ? node.typeName.text : null;
}

/**
 * The props type named by a component-shaped initializer, or null.
 *
 * Covers the four forms in this codebase:
 *   (props: X) => …                      arrow / function expression
 *   React.forwardRef<Element, X>(…)      second type argument
 *   const C: React.FC<X> = …             annotation on the declaration
 *   const C: FC<X> = …                   same, unqualified import
 */
function propsTypeOfInitializer(initializer, declaredType) {
  if (declaredType && ts.isTypeReferenceNode(declaredType)) {
    const name = ts.isIdentifier(declaredType.typeName)
      ? declaredType.typeName.text
      : declaredType.typeName.right.text;
    if (/^(FC|FunctionComponent|VoidFunctionComponent)$/.test(name)) {
      return referencedTypeName(declaredType.typeArguments?.[0]);
    }
  }

  if (!initializer) return null;

  if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    return referencedTypeName(initializer.parameters[0]?.type);
  }

  if (ts.isCallExpression(initializer)) {
    const callee = initializer.expression;
    const calleeName = ts.isPropertyAccessExpression(callee)
      ? callee.name.text
      : ts.isIdentifier(callee)
        ? callee.text
        : null;
    // forwardRef<Element, Props>(render) — props is the SECOND type argument.
    if (calleeName === 'forwardRef') {
      const fromTypeArgs = referencedTypeName(initializer.typeArguments?.[1]);
      if (fromTypeArgs) return fromTypeArgs;
      // Untyped call: read the render function's own parameter instead.
      const render = initializer.arguments[0];
      if (render && (ts.isArrowFunction(render) || ts.isFunctionExpression(render))) {
        return referencedTypeName(render.parameters[0]?.type);
      }
      return null;
    }
    // memo(Component) and friends wrap something declared elsewhere; that
    // declaration is where the annotation lives, so nothing to read here.
    return null;
  }

  return null;
}

const hasExportModifier = (node) =>
  (ts.getModifiers?.(node) ?? node.modifiers ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ExportKeyword,
  );

/**
 * The props type of an exported class component, or null.
 *
 * `class X extends Component<Props, State>` — props is the FIRST type
 * argument; the second is state and is nobody's business.
 */
function propsTypeOfClass(decl) {
  for (const clause of decl.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    const base = clause.types[0];
    if (!base) continue;
    const name = ts.isIdentifier(base.expression)
      ? base.expression.text
      : ts.isPropertyAccessExpression(base.expression)
        ? base.expression.name.text
        : null;
    if (!/^(Component|PureComponent)$/.test(name ?? '')) continue;
    return referencedTypeName(base.typeArguments?.[0]);
  }
  return null;
}

/**
 * Local bindings an `Object.assign(Inner, { Item: Sub })` initializer folds in.
 *
 * This is the compound-component pattern (`grid.tsx`, `card.tsx`): the
 * exported name is an assembly, and the components a consumer actually
 * renders — with the props types they actually need — are the locals it
 * wraps. Without this the whole assembly reads as having no props at all.
 */
function assignedLocals(initializer) {
  if (!initializer || !ts.isCallExpression(initializer)) return [];
  const callee = initializer.expression;
  const isObjectAssign =
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'Object' &&
    callee.name.text === 'assign';
  if (!isObjectAssign) return [];

  const locals = [];
  for (const arg of initializer.arguments) {
    if (ts.isIdentifier(arg)) locals.push(arg.text);
    else if (ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.initializer)) {
          locals.push(prop.initializer.text);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          locals.push(prop.name.text);
        }
      }
    }
  }
  return locals;
}

/**
 * Every violation of the rule in one module's source.
 *
 * Two passes: collect every local declaration and how the module exports
 * things, then walk out from the exported names to see which props types a
 * consumer can actually reach. One pass would miss both forms this codebase
 * leans on — a bare `const CardHeader` published by a trailing
 * `export { … }`, and an inner component reached only through
 * `Object.assign`.
 *
 * @param {string} source  the module text
 * @param {string} file    path used in the report (not read from disk)
 * @returns {{file: string, component: string, type: string, line: number}[]}
 */
export function violationsInSource(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  /** Locally declared types, by name → whether the module exports them. */
  const localTypes = new Map();
  /** Names introduced by an import; this module cannot export them. */
  const imported = new Set();
  /** Every local component-shaped declaration, by name. */
  const declared = new Map();
  /** Local name → the local names its initializer folds in. */
  const aliases = new Map();
  /** Names a trailing `export { … }` publishes, in source order. */
  const exportedNames = [];
  /** Exported roots, in source order. */
  const roots = [];

  const note = (name, type, node, exportedInline) => {
    declared.set(name, { type, node });
    if (exportedInline) roots.push(name);
  };

  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      localTypes.set(stmt.name.text, hasExportModifier(stmt));
      continue;
    }

    if (ts.isImportDeclaration(stmt)) {
      const clause = stmt.importClause;
      if (clause?.name) imported.add(clause.name.text);
      const named = clause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) imported.add(el.name.text);
      } else if (named && ts.isNamespaceImport(named)) {
        imported.add(named.name.text);
      }
      continue;
    }

    // `export { CardHeader, CardTitle }` / `export type { AlertProps }`.
    if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier && stmt.exportClause) {
      if (ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          exportedNames.push((el.propertyName ?? el.name).text);
        }
      }
      continue;
    }

    if (ts.isFunctionDeclaration(stmt) && isComponentName(stmt.name?.text)) {
      note(
        stmt.name.text,
        referencedTypeName(stmt.parameters[0]?.type),
        stmt,
        hasExportModifier(stmt),
      );
      continue;
    }

    if (ts.isClassDeclaration(stmt) && isComponentName(stmt.name?.text)) {
      note(stmt.name.text, propsTypeOfClass(stmt), stmt, hasExportModifier(stmt));
      continue;
    }

    if (ts.isVariableStatement(stmt)) {
      const exportedInline = hasExportModifier(stmt);
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !isComponentName(decl.name.text)) continue;
        note(
          decl.name.text,
          propsTypeOfInitializer(decl.initializer, decl.type),
          decl,
          exportedInline,
        );
        const folded = assignedLocals(decl.initializer);
        if (folded.length > 0) aliases.set(decl.name.text, folded);
      }
    }
  }

  // A trailing `export { … }` publishes whatever it names, including types.
  const exportedTypeNames = new Set(exportedNames);
  for (const name of exportedNames) {
    if (declared.has(name)) roots.push(name);
  }

  // Walk out from the exported roots. A local reached only through an
  // assembly is as public as the assembly.
  const reachable = [];
  const seenComponent = new Set();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seenComponent.has(name)) continue;
    seenComponent.add(name);
    if (declared.has(name)) reachable.push(name);
    for (const next of aliases.get(name) ?? []) queue.push(next);
  }

  const violations = [];
  const seenType = new Set();
  for (const component of reachable) {
    const { type, node } = declared.get(component);
    if (!type) continue;
    if (imported.has(type)) continue; // not ours to export
    if (!localTypes.has(type)) continue; // a global or an ambient type
    if (localTypes.get(type) || exportedTypeNames.has(type)) continue; // already public
    if (seenType.has(type)) continue;
    seenType.add(type);
    violations.push({
      file,
      component,
      type,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    });
  }
  return violations;
}

/**
 * The modules `src/index.ts` re-exports with `export *`, resolved to files.
 *
 * `export *` is the only form that carries types along, so it is the only
 * form that matters here.
 */
export function publicModuleFiles(root) {
  const barrel = readFileSync(path.join(root, 'src', 'index.ts'), 'utf8');
  const specs = [...barrel.matchAll(/^export \* from '(\.[^']+)';/gm)].map((m) => m[1]);

  const files = [];
  const unresolved = [];
  for (const spec of specs) {
    const base = path.resolve(root, 'src', spec);
    const found = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find(
      (candidate) => existsSync(candidate),
    );
    if (found) files.push(found);
    else unresolved.push(spec);
  }
  return { files, unresolved };
}

/** Every violation across the public barrel. */
export function violationsInRepo(root) {
  const { files, unresolved } = publicModuleFiles(root);
  const violations = files.flatMap((file) =>
    violationsInSource(readFileSync(file, 'utf8'), path.relative(root, file)),
  );
  return { violations, unresolved, scanned: files.length };
}
