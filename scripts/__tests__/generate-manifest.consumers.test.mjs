/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Consumer scan: `generated-*` files are build output, never consumers.
 * A token description such as "Grid gap: ..." names a component in prose and
 * used to land in `consumers`, so re-running `pnpm tokens` dirtied the manifest.
 * Test files exercise a component; they do not ship with it, so they are not
 * consumers either (and listing them cost the manifest gzip budget, hds#413).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

vi.setConfig({ testTimeout: 60_000 });

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let roots = [];
afterEach(() => {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }));
  roots = [];
});

describe('generate-manifest consumer scan', () => {
  it('ignores generated-* and test files but keeps real consumers', () => {
    mkdirSync(join(REPO, 'temp'), { recursive: true });
    const root = mkdtempSync(join(REPO, 'temp', 'manifest-consumers-'));
    roots.push(root);
    mkdirSync(join(root, 'scripts'), { recursive: true });
    cpSync(join(REPO, 'scripts', 'lib'), join(root, 'scripts', 'lib'), { recursive: true });
    mkdirSync(join(root, 'mcp'), { recursive: true });
    cpSync(join(REPO, 'mcp', 'core-set.mjs'), join(root, 'mcp', 'core-set.mjs'));
    for (const f of [
      'generate-manifest.mjs',
      'component-discovery.mjs',
      'generate-manifest-projection.mjs',
    ]) {
      cpSync(join(REPO, 'scripts', f), join(root, 'scripts', f));
    }
    const comps = join(root, 'src', 'app', 'components');
    mkdirSync(comps, { recursive: true });
    writeFileSync(
      join(comps, 'demo-widget.tsx'),
      '/**\n * Demo.\n *\n * @category Inputs\n * @tier primitive\n */\nexport const DemoWidget = () => null;\n',
    );
    writeFileSync(join(comps, 'uses-it.tsx'), 'export const X = () => DemoWidget;\n');
    writeFileSync(join(comps, 'demo-widget.test.tsx'), 'DemoWidget;\n');
    const ds = join(root, 'src', 'app', 'design-system');
    mkdirSync(ds, { recursive: true });
    writeFileSync(
      join(ds, 'generated-token-descriptions.ts'),
      "export const d = 'DemoWidget gap: x';\n",
    );
    mkdirSync(join(root, 'public'), { recursive: true });
    writeFileSync(join(root, 'public', 'hds-manifest.json'), '{"componentSpecs":{}}\n');

    const env = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')),
    );
    execFileSync(process.execPath, [join(root, 'scripts', 'generate-manifest.mjs')], {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const m = JSON.parse(readFileSync(join(root, 'public', 'hds-manifest.json'), 'utf8'));
    expect(m.componentSpecs.DemoWidget.consumers).toEqual(['src/app/components/uses-it.tsx']);
  });
});
