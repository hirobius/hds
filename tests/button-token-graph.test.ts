// @vitest-environment node
/**
 * A Button-only import must not carry the whole token bridge (hds#1145).
 *
 * Button reads `hds.motion.*` through useHdsMotion. When that hook imported
 * the default `hds` object from tokens.ts, every Button-only consumer bundle
 * also got tokens.ts, generated-token-refs.ts and the full `hds` literal:
 * ~41 kB of minified source for four motion records. The motion records now
 * live in motion-tokens.ts, which imports only the generated token values.
 *
 * This bundles button.tsx from source with esbuild (packages external, so it
 * runs in well under a second) and checks which local modules reach it. The
 * dist-level budget (.size-limit.cjs, scripts/build-button-probe.mjs) still
 * measures the full bundle; this is the fast guard that runs in `pnpm test`.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
// esbuild is not a direct devDependency; load the copy vite ships with.
const viteRequire = createRequire(createRequire(import.meta.url).resolve('vite'));
const esbuild = viteRequire('esbuild') as typeof import('esbuild');

async function localInputs(entry: string, name: string) {
  const result = await esbuild.build({
    stdin: { contents: `export { ${name} } from '${entry}';`, resolveDir: ROOT, loader: 'ts' },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    metafile: true,
    packages: 'external',
    jsx: 'automatic',
    logLevel: 'silent',
  });
  const output = Object.values(result.metafile.outputs)[0];
  return Object.entries(output.inputs)
    .filter(([file, info]) => !file.includes('node_modules') && info.bytesInOutput > 0)
    .map(([file, info]) => ({ file, bytes: info.bytesInOutput }));
}

describe('Button-only import: token graph', () => {
  it('does not bundle the full token bridge', async () => {
    const inputs = await localInputs(resolve(ROOT, 'src/app/components/button.tsx'), 'Button');
    const files = inputs.map((i) => i.file);
    expect(files).not.toContain('src/app/design-system/tokens.ts');
    expect(files).not.toContain('src/app/design-system/generated-token-refs.ts');
  });

  it('keeps local Button source under 16 kB minified', async () => {
    const inputs = await localInputs(resolve(ROOT, 'src/app/components/button.tsx'), 'Button');
    const total = inputs.reduce((sum, i) => sum + i.bytes, 0);
    expect(total).toBeLessThan(16_000);
  });
});
