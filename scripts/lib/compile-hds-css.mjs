/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Compile the shipped stylesheet (src/styles/index.css: theme, tokens, utilities) with
 * Tailwind v4 for an exact list of class candidates, so a browser test can read computed
 * styles from the real CSS instead of hand-written stand-ins.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

/** @param {string[]} candidates class names to emit utilities for */
export async function compileHdsCss(candidates) {
  const entry = join(ROOT, 'src/styles/index.css');
  const loadStylesheet = async (id, base) => {
    const path =
      id.startsWith('.') || id.startsWith('/')
        ? resolve(base, id)
        : require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id, { paths: [base] });
    return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
  };
  const loadModule = async (id, base) => {
    const path = id.startsWith('.') ? resolve(base, id) : require.resolve(id, { paths: [base] });
    const mod = await import(path);
    return { path, base: dirname(path), module: mod.default ?? mod };
  };
  const compiler = await compile(readFileSync(entry, 'utf8'), {
    base: dirname(entry),
    loadStylesheet,
    loadModule,
  });
  return compiler.build(candidates);
}
