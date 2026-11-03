/**
 * Read a module's exports through the TypeScript checker, with the repo's
 * tsconfig, so `export *` chains are resolved. Shared by the barrel tests
 * (public-export-names, screen-patterns-exports), hds#1011.
 */
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '../..');

export function readModuleExports(entry: string) {
  const config = ts.readConfigFile(resolve(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const program = ts.createProgram([entry], { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entry)!; // tier-ok: root file passed to createProgram above
  const moduleSymbol = checker.getSymbolAtLocation(source)!; // tier-ok: entry is a module
  return { checker, exports: checker.getExportsOfModule(moduleSymbol) };
}
