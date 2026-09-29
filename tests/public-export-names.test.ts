// @vitest-environment node
/**
 * Public component exports are bare names (`Button`, `Toggle`, ...), never
 * `Hds`-prefixed. The six components that used to ship as `HdsToggle`-style
 * names keep those spellings only as `@deprecated` aliases in src/index.ts,
 * until the 1.0 alias-removal window (hds#254).
 *
 * The check reads the barrel through the TypeScript checker (so `export *`
 * chains are resolved) and reads the alias block syntactically (so the JSDoc
 * on each `export { X as HdsX }` is visible).
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '..');
const INDEX = resolve(ROOT, 'src/index.ts');

/** The components de-prefixed by hds#315: bare name -> legacy alias. */
const DEPRECATED_ALIASES: Record<string, string> = {
  Checkbox: 'HdsCheckbox',
  Radio: 'HdsRadio',
  Select: 'HdsSelect',
  Slider: 'HdsSlider',
  Toggle: 'HdsToggle',
  Tooltip: 'HdsTooltip',
};

/**
 * Hds-prefixed value exports that are NOT component primitives being renamed
 * here: app-level providers and docs-shell layouts (root barrel only; subpath entry
 * points such as ./form are out of scope here).
 * Adding a component to this list is a review decision, not a shortcut.
 */
const HDS_PREFIXED_ALLOWLIST = new Set([
  'HdsThemeProvider',
  'HdsRouterProvider',
  'HdsSystemDocLayout',
  'HdsDocsShell',
]);

function readBarrel() {
  const config = ts.readConfigFile(resolve(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const program = ts.createProgram([INDEX], { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(INDEX)!; // tier-ok: root file passed to createProgram above
  const moduleSymbol = checker.getSymbolAtLocation(source)!; // tier-ok: barrel is a module
  return { checker, source, exports: checker.getExportsOfModule(moduleSymbol) };
}

/** Local -> exported-name pairs from `export { A as B } [from '...']`, with their JSDoc text. */
function readAliasSpecifiers(source: ts.SourceFile) {
  const found: { local: string; exported: string; jsdoc: string }[] = [];
  const text = source.getFullText();
  for (const stmt of source.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.exportClause) continue;
    if (!ts.isNamedExports(stmt.exportClause)) continue;
    const leading = ts.getLeadingCommentRanges(text, stmt.getFullStart()) ?? [];
    const jsdoc = leading.map((r) => text.slice(r.pos, r.end)).join('\n');
    for (const el of stmt.exportClause.elements) {
      if (!el.propertyName) continue; // plain re-export, not a rename
      found.push({
        local: (el.propertyName ?? el.name).text,
        exported: el.name.text,
        jsdoc,
      });
    }
  }
  return found;
}

describe('public component export names', () => {
  const { checker, source, exports } = readBarrel();
  const aliases = readAliasSpecifiers(source);

  const isValue = (s: ts.Symbol) => {
    const target = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
    return (target.flags & ts.SymbolFlags.Value) !== 0;
  };
  const valueNames = exports.filter(isValue).map((s) => s.name);

  it('exports each de-prefixed component under its bare name', () => {
    for (const bare of Object.keys(DEPRECATED_ALIASES)) {
      expect(valueNames, `${bare} missing from the root barrel`).toContain(bare);
    }
  });

  it('keeps every legacy Hds* name as an alias that carries @deprecated', () => {
    for (const [bare, legacy] of Object.entries(DEPRECATED_ALIASES)) {
      const alias = aliases.find((a) => a.exported === legacy);
      expect(
        alias,
        `${legacy} must be re-exported as \`export { ${bare} as ${legacy} }\``,
      ).toBeDefined();
      expect(alias!.local).toBe(bare); // tier-ok: asserted defined on the previous line
      expect(alias!.jsdoc, `${legacy} alias is missing @deprecated`).toMatch(/@deprecated/);
      expect(alias!.jsdoc, `${legacy} alias should point at hds#254`).toContain('hds#254');
    }
  });

  it('has no other Hds-prefixed component export outside the alias block and allowlist', () => {
    const legacyNames = new Set(Object.values(DEPRECATED_ALIASES));
    const offenders = valueNames.filter(
      (n) => /^Hds[A-Z]/.test(n) && !legacyNames.has(n) && !HDS_PREFIXED_ALLOWLIST.has(n),
    );
    expect(offenders).toEqual([]);
  });

  it('every Hds* alias is a deprecated alias (no un-tagged Hds* aliases)', () => {
    for (const a of aliases.filter((x) => /^Hds[A-Z]/.test(x.exported))) {
      expect(a.jsdoc, `${a.exported} lacks @deprecated`).toMatch(/@deprecated/);
    }
  });
});
