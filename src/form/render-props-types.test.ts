// @vitest-environment node
/**
 * hds#676: HdsFieldRenderProps must be spreadable onto native controls. The
 * repo typecheck excludes test and fixture files, so this compiles the fixture
 * with the TypeScript API under the repo's own compiler options and requires
 * zero diagnostics. A types-only regression has no runtime symptom, so this is
 * the seam that can go red on it.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE = join(ROOT, 'src/form/__fixtures__/spread-onto-controls.tsx');

describe('HdsFieldRenderProps (hds#676)', () => {
  it('spreads onto <input>, <select> and <textarea> without type errors', () => {
    const cfgPath = join(ROOT, 'tsconfig.json');
    const raw = ts.readConfigFile(cfgPath, ts.sys.readFile);
    const cfg = ts.parseJsonConfigFileContent(raw.config, ts.sys, ROOT);
    const program = ts.createProgram([FIXTURE], {
      ...cfg.options,
      noEmit: true,
      allowImportingTsExtensions: true,
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((d) => d.file?.fileName === FIXTURE)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    expect(diagnostics).toEqual([]);
  }, 60_000);
});
