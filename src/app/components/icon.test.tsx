/**
 * Icon colour and Table column width accept only token-shaped values (audit
 * 2026-10-14). Test files are outside `pnpm typecheck`, so the type contract
 * is proven here by compiling a snippet with the TypeScript API.
 */
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Check } from 'lucide-react';
import ts from 'typescript';

import { Icon } from './icon';

const ROOT = resolve(__dirname, '../../..');
const dir = mkdtempSync(join(tmpdir(), 'hds-type-contract-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Compile `body` against the real source; return the error lines (file-local). */
function typeErrors(body: string): string[] {
  const file = join(dir, `case-${Math.random().toString(36).slice(2)}.ts`);
  const src = (p: string) => JSON.stringify(resolve(ROOT, p));
  writeFileSync(
    file,
    `import type { IconColor } from ${src('src/app/components/icon')};\n` +
      `import type { TableColumnWidth } from ${src('src/app/components/table')};\n` +
      body,
  );
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === file)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
}

describe('Icon color type', () => {
  it('accepts currentColor, inherit and semantic or component token variables', () => {
    expect(
      typeErrors(
        `const ok: IconColor[] = ['currentColor', 'inherit', 'var(--semantic-color-content-secondary)', 'var(--component-button-primary-text)'];`,
      ),
    ).toEqual([]);
  });

  it('rejects raw hex, rgb() and primitive tokens', () => {
    const errors = typeErrors(
      `const a: IconColor = '#ff0000';\nconst b: IconColor = 'rgb(0 0 0)';\nconst c: IconColor = 'var(--primitive-color-neutral-500)';`,
    );
    expect(errors).toHaveLength(3);
  });
}, 60_000);

describe('Table column width type', () => {
  it('accepts grid keywords, fr, minmax() and token variables', () => {
    expect(
      typeErrors(
        `const ok: TableColumnWidth[] = ['auto', 'max-content', 'min-content', '2fr', 'minmax(0, 1fr)', 'var(--semantic-space-scale-xl)'];`,
      ),
    ).toEqual([]);
  });

  it('rejects raw pixel and rem widths', () => {
    expect(
      typeErrors(`const a: TableColumnWidth = '120px';\nconst b: TableColumnWidth = '8rem';`),
    ).toHaveLength(2);
  });
}, 60_000);

describe('Icon color at runtime', () => {
  it('renders the token as the SVG stroke colour', () => {
    const { container } = render(
      <Icon icon={Check} color="var(--semantic-color-content-secondary)" />,
    );
    expect(container.querySelector('svg')?.getAttribute('stroke')).toBe(
      'var(--semantic-color-content-secondary)',
    );
  });
});
