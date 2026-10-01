// @vitest-environment node
/**
 * Public component exports are bare names (`Button`, `Toggle`, ...), never
 * `Hds`-prefixed. The six components that used to ship as `HdsToggle`-style
 * names kept those spellings as `@deprecated` aliases in src/index.ts until
 * 0.20.0, which removed them (hds#389 R1); `codemods/hds-prefix.mjs` rewrites
 * consumer imports.
 *
 * The check reads the barrel through the TypeScript checker, so `export *`
 * chains are resolved.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '..');
const INDEX = resolve(ROOT, 'src/index.ts');

/** The components de-prefixed by hds#315: bare name -> legacy alias (removed in 0.20.0). */
const REMOVED_ALIASES: Record<string, string> = {
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
  return { checker, exports: checker.getExportsOfModule(moduleSymbol) };
}

describe('public component export names', () => {
  const { checker, exports } = readBarrel();

  const isValue = (s: ts.Symbol) => {
    const target = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
    return (target.flags & ts.SymbolFlags.Value) !== 0;
  };
  const names = exports.map((s) => s.name);
  const valueNames = exports.filter(isValue).map((s) => s.name);

  it('exports each de-prefixed component under its bare name', () => {
    for (const bare of Object.keys(REMOVED_ALIASES)) {
      expect(valueNames, `${bare} missing from the root barrel`).toContain(bare);
    }
  });

  it('no longer exports the legacy Hds* aliases (removed in 0.20.0, hds#389)', () => {
    for (const legacy of Object.values(REMOVED_ALIASES)) {
      expect(names, `${legacy} is still exported from the root`).not.toContain(legacy);
    }
  });

  it('no longer exports the five hds#232 docs/lab components (removed in 0.20.0)', () => {
    for (const gone of [
      'CinematicLink',
      'ComponentInstanceMatrix',
      'FoundationSwatch',
      'Sketch',
      'Token',
    ]) {
      expect(names, `${gone} is still exported from the root`).not.toContain(gone);
    }
  });

  it('has no Hds-prefixed component export outside the allowlist', () => {
    const offenders = valueNames.filter(
      (n) => /^Hds[A-Z]/.test(n) && !HDS_PREFIXED_ALLOWLIST.has(n),
    );
    expect(offenders).toEqual([]);
  });
});
