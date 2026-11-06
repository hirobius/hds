/**
 * hds-tokens-subpath (hds#1205): root imports of `hds` and `tokens` move to
 * `@hirobius/design-system/tokens`; other root names stay; a namespace read is
 * listed for a manual edit; a second run changes nothing.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempTree } from './helpers/codemod-fixture.mjs';
import { runCodemod, transformSource } from '../../codemods/tokens-subpath.mjs';
import { CODEMODS } from '../../codemods/registry.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(REPO, 'codemods/tokens-subpath.mjs');

describe('tokens-subpath transformSource', () => {
  it('moves hds and tokens, keeps component names on the root', () => {
    const src = "import { Button, hds, tokens as raw } from '@hirobius/design-system';\n";
    const r = transformSource(src);
    expect(r.changed).toBe(true);
    expect(r.source).toContain("import { Button } from '@hirobius/design-system';");
    expect(r.source).toContain(
      "import { hds, tokens as raw } from '@hirobius/design-system/tokens';",
    );
    expect(transformSource(r.source).changed).toBe(false);
  });

  it('joins an existing /tokens import', () => {
    const src = [
      "import { hds } from '@hirobius/design-system';",
      "import { ct } from '@hirobius/design-system/tokens';",
      '',
    ].join('\n');
    const out = transformSource(src).source;
    expect(out).not.toContain("from '@hirobius/design-system';");
    expect(out.match(/design-system\/tokens/g)).toHaveLength(1);
    expect(out).toMatch(/import \{ ct, hds \}|import \{ hds, ct \}/);
  });

  it('leaves a file without the moved names alone', () => {
    const src = "import { Button } from '@hirobius/design-system';\n";
    expect(transformSource(src).changed).toBe(false);
  });
});

describe('tokens-subpath runCodemod', () => {
  it('lists a namespace read for a manual edit', () => {
    const dir = tempTree('hds-tokens-subpath-', {
      'src/a.tsx': "import * as H from '@hirobius/design-system';\nexport const c = H.hds.color;\n",
    });
    const res = runCodemod({ root: dir });
    expect(res.sites).toBe(0);
    expect(res.manual.map((m) => m.file)).toEqual(['src/a.tsx']);
  });

  it('--check exits 1 and writes nothing; a write run then checks clean', () => {
    const dir = tempTree('hds-tokens-subpath-', {
      'src/a.tsx': "import { hds } from '@hirobius/design-system';\nexport const c = hds;\n",
    });
    const check = () =>
      spawnSync(process.execPath, [BIN, '--root', dir, '--check'], { encoding: 'utf8' });
    expect(check().status).toBe(1);
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain("'@hirobius/design-system'");
    runCodemod({ root: dir, write: true });
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('design-system/tokens');
    expect(check().status).toBe(0);
  });

  it('is registered as the hds-tokens-subpath bin', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(CODEMODS['hds-tokens-subpath']).toEqual({ file: 'tokens-subpath.mjs' });
    expect(pkg.bin['hds-tokens-subpath']).toBe('codemods/tokens-subpath.mjs');
    expect(pkg.files).toContain('codemods/tokens-subpath.mjs');
  });
});
