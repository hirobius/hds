/**
 * hds#789: src/ must not read a token marked `$deprecated` in hirobius.tokens.json.
 * A deprecated token stays live for consumers; HDS's own components move off it first.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const tree = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));

/** CSS custom-property names (--a-b-c) of every token carrying `$deprecated`. */
function deprecatedVars(node, path = [], out = []) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || typeof value !== 'object' || value === null) continue;
    if ('$value' in value) {
      if ('$deprecated' in value) out.push(`--${[...path, key].join('-')}`);
    } else deprecatedVars(value, [...path, key], out);
  }
  return out;
}

// Files that still read a deprecated token on purpose: box-sx.ts keeps the deprecated
// spacing aliases working for consumers, tenants.css overrides component.padding.
// Shrink this list, never grow it (follow-up to hds#789).
const KNOWN_READERS = ['src/app/components/box-sx.ts', 'src/styles/tenants.css'];

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe('src/ reads no deprecated token', () => {
  const vars = deprecatedVars(tree);
  it('finds the deprecated tokens', () => {
    expect(vars).toContain('--semantic-color-border-subdued');
    expect(vars).toContain('--semantic-space-layout-inset');
  });
  it('has no reads of them in src/ (generated files and theme.css declare them, so they are exempt)', () => {
    const hits = [];
    for (const file of sourceFiles(join(root, 'src'))) {
      if (/\.generated\.css$|styles\/theme\.css$|design-system\/generated-/.test(file)) continue; // declarations, not reads
      if (KNOWN_READERS.some((k) => file.endsWith(k))) continue;
      const text = readFileSync(file, 'utf8');
      for (const v of vars) {
        if (new RegExp(`${v}(?![\\w-])`).test(text))
          hits.push(`${file.slice(root.length + 1)}: ${v}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
