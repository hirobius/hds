/**
 * strip-dts-side-effects — remove side-effect CSS imports from emitted .d.ts.
 *
 * Components/barrel import CSS for its build side-effect (vite emits
 * dist/tokens.css from `import './styles/index.css'`). tsc copies those
 * side-effect imports into the .d.ts, where they're meaningless and point at
 * paths not shipped under dist/types — attw flags them as InternalResolutionError
 * and a node16 consumer can't resolve them. Strip them; the runtime CSS emission
 * (driven by the source import, untouched) is unaffected.
 *
 * Part of `pnpm build:types`. Idempotent.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'types');
// A line that is ONLY a side-effect import of a stylesheet: `import './x.css';`
const CSS_SIDE_EFFECT = /^\s*import\s+['"][^'"]+\.css['"];?\s*$/gm;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

let stripped = 0;
for (const file of walk(DTS_ROOT)) {
  const src = readFileSync(file, 'utf8');
  if (!CSS_SIDE_EFFECT.test(src)) continue;
  writeFileSync(file, src.replace(CSS_SIDE_EFFECT, '').replace(/^\n+/, ''));
  stripped += 1;
}
console.log(
  `strip-dts-side-effects — cleaned ${stripped} .d.ts file(s) of CSS side-effect imports`,
);
