// @vitest-environment node
/**
 * Every runtime dependency must be imported by code the package ships.
 *
 * `dependencies` is what every consumer downloads with `pnpm add
 * @hirobius/design-system`. When a component goes, the packages only it used
 * stay listed unless someone notices: the 0.20.0 removals left
 * `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`,
 * `@radix-ui/react-toolbar`, `date-fns` and `react-day-picker` installed for
 * nobody, and only a review found them (hds#429). knip reports the same thing,
 * but `pretest` runs it with `--no-exit-code`, so nothing failed.
 *
 * Stories, tests and Code Connect templates are exempt: none of them ship, so a
 * package used only there belongs in `devDependencies`.
 *
 * The fix for a failure is to drop the package, not to exempt it here:
 * `pnpm remove <name>` in a checkout with its own install, plus a minor
 * changeset that names it (a major from 1.0) and its upgrade step from
 * `pnpm upgrade:note`. A consumer that imports the package without declaring
 * it breaks when HDS stops installing it, so a dropped dependency is breaking
 * (hds#445 decision 3); 0.20.0 shipped five under Patch Changes before
 * scripts/check-upgrade-ledger.mjs read the bump (hds#448).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
};
const runtimeDependencies = Object.keys(pkg.dependencies ?? {});

/** Comments are stripped so prose naming a package is not an import site. */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Files built as an app or a template, not as the published library. */
const isExempt = (path: string) =>
  /\.(test|spec|stories)\.[jt]sx?$/.test(path) ||
  /\.figma\.tsx?$/.test(path) ||
  path.includes('/__tests__/') ||
  path.startsWith('src/stories/');

function shippedSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      shippedSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) continue;
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (!isExempt(rel)) acc.push(rel);
  }
  return acc;
}

/**
 * Module specifiers in `code`: `import … from`, `export … from`, side-effect
 * `import '…'`, dynamic `import('…')` and `require('…')`.
 */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g;

function importedSpecifiers(code: string): string[] {
  return [...stripComments(code).matchAll(SPECIFIER)].map((match) => match[2]);
}

/** `@scope/name/sub` -> `@scope/name`, `name/sub` -> `name`; relative and aliased paths -> null. */
function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) {
    return null;
  }
  if (specifier.startsWith('virtual:') || specifier.startsWith('node:')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function importedPackages(): Set<string> {
  const packages = new Set<string>();
  for (const rel of shippedSourceFiles(SRC)) {
    for (const specifier of importedSpecifiers(readFileSync(join(ROOT, rel), 'utf8'))) {
      const name = packageOf(specifier);
      if (name) packages.add(name);
    }
  }
  return packages;
}

describe('runtime dependencies', () => {
  it('are each imported by shipped source, so no consumer downloads a package nothing uses', () => {
    const used = importedPackages();
    const unused = runtimeDependencies.filter((name) => !used.has(name));

    expect(
      unused,
      `In package.json dependencies but imported by nothing under src/ that ships. ` +
        `Drop each with \`pnpm remove <name>\`, a minor changeset that names it, and its upgrade ` +
        `step from \`pnpm upgrade:note\` (a dropped dependency is breaking, hds#448).`,
    ).toEqual([]);
  });

  it('match the lockfile root importer, so the lockfile drops what package.json drops', () => {
    const lock = parse(readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf8')) as {
      importers: Record<string, { dependencies?: Record<string, unknown> }>;
    };
    const locked = Object.keys(lock.importers['.'].dependencies ?? {}).sort();

    expect(locked).toEqual([...runtimeDependencies].sort());
  });

  it('reads every import form a shipped file can use', () => {
    const code = [
      `import * as Primitive from '@radix-ui/react-slot';`,
      `import { cva } from "class-variance-authority";`,
      `import type { LucideIcon } from 'lucide-react';`,
      `export { motion } from 'motion/react';`,
      `export * from 'clsx';`,
      `import 'tailwind-merge';`,
      `const lazy = () => import('@radix-ui/react-dialog');`,
      `const req = require('@radix-ui/react-tabs');`,
      `import {\n  a,\n  b,\n} from '@radix-ui/react-popover';`,
      `import { cn } from '@/lib/utils';`,
      `import { Button } from './button';`,
      `// import { DayPicker } from 'react-day-picker';`,
      `/* import { format } from 'date-fns'; */`,
    ].join('\n');

    const packages = importedSpecifiers(code).map(packageOf).filter(Boolean);

    expect(packages).toEqual([
      '@radix-ui/react-slot',
      'class-variance-authority',
      'lucide-react',
      'motion',
      'clsx',
      'tailwind-merge',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
    ]);
  });

  it('scans a meaningful number of files, so a broken walker cannot pass vacuously', () => {
    expect(shippedSourceFiles(SRC).length).toBeGreaterThan(100);
    expect(importedPackages()).toContain('class-variance-authority');
  });
});
