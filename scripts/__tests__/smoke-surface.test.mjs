// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_PEER_SUBPATHS,
  TS_FLOOR,
  auditDistImports,
  bareSpecifiers,
  importEverySubpath,
  packageNameOf,
  smokeSubpaths,
} from '../lib/smoke-surface.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

// A minimal built package: dist/*.js entries plus a chunk, wired by `exports`.
function fakePackage(files, exportsMap, extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'smoke-surface-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  const pkg = { name: '@x/pkg', type: 'module', exports: exportsMap, ...extra };
  writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
  return { root, pkg };
}

const entry = (file) => ({ import: file, default: file });

describe('smokeSubpaths', () => {
  it('resolves every exports key of the real package and imports every JS one', () => {
    const { resolve: res, imports } = smokeSubpaths(PKG);
    expect(res).toEqual(Object.keys(PKG.exports));
    for (const key of ['./patterns', './form', './scroll', './brand', '.', './eslint-plugin']) {
      expect(imports).toContain(key);
    }
    for (const key of ['./tokens.css', './stats.json', './package.json']) {
      expect(imports).not.toContain(key);
    }
  });

  it('the smoke script takes its lists from smokeSubpaths, not a hand list', () => {
    const smoke = readFileSync(join(REPO, 'scripts/smoke-consumer.mjs'), 'utf8');
    expect(smoke).toContain('smokeSubpaths(');
    expect(smoke).not.toMatch(/const resolvable = \[/);
  });
});

describe('bare-import audit', () => {
  it('reads static, re-export, side-effect and dynamic specifiers', () => {
    const src = [
      'import { a } from "react";',
      "export { b } from './chunks/x.js';",
      "import 'lenis/dist/lenis.css';",
      "const m = await import('zod');",
      'import*as c from"motion/react";',
    ].join('\n');
    expect(bareSpecifiers(src).sort()).toEqual([
      'lenis/dist/lenis.css',
      'motion/react',
      'react',
      'zod',
    ]);
    expect(packageNameOf('@hookform/resolvers/zod')).toBe('@hookform/resolvers');
    expect(packageNameOf('react/jsx-runtime')).toBe('react');
  });

  it('passes the real optional-peer map: every optional peer is mapped', () => {
    const optional = Object.keys(PKG.peerDependenciesMeta ?? {}).filter(
      (p) => PKG.peerDependenciesMeta[p].optional,
    );
    expect(Object.keys(OPTIONAL_PEER_SUBPATHS).sort()).toEqual(optional.sort());
  });

  const base = {
    dependencies: { clsx: '^2' },
    peerDependencies: { react: '^18', 'react-hook-form': '^7' },
    peerDependenciesMeta: { 'react-hook-form': { optional: true } },
  };
  const peerMap = { 'react-hook-form': ['./form'] };

  it('fixture: an undeclared import in /patterns fails', () => {
    const { root, pkg } = fakePackage(
      {
        'dist/index.js': "import 'react';\nimport 'clsx';\n",
        'dist/patterns.js': "import './chunks/p.js';\n",
        'dist/chunks/p.js': "import { x } from 'left-pad';\nimport 'node:fs';\n",
      },
      { '.': entry('./dist/index.js'), './patterns': entry('./dist/patterns.js') },
      base,
    );
    const problems = auditDistImports(root, pkg, peerMap);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/dist\/chunks\/p\.js.*left-pad.*not a dependency or peer/);
  });

  it('fixture: an optional peer reached from another subpath fails, its own passes', () => {
    const { root, pkg } = fakePackage(
      {
        'dist/index.js': "import './chunks/shared.js';\n",
        'dist/form.js': "import 'react-hook-form';\n",
        'dist/chunks/shared.js': "import { useForm } from 'react-hook-form';\n",
      },
      { '.': entry('./dist/index.js'), './form': entry('./dist/form.js') },
      base,
    );
    const problems = auditDistImports(root, pkg, peerMap);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/optional peer react-hook-form is reachable from "\." /);
  });

  it('fails an optional peer the map does not name', () => {
    const { root, pkg } = fakePackage(
      { 'dist/index.js': "import 'react-hook-form';\n" },
      { '.': entry('./dist/index.js') },
      base,
    );
    expect(auditDistImports(root, pkg, {})[0]).toMatch(/react-hook-form.*OPTIONAL_PEER_SUBPATHS/);
  });
});

describe('importEverySubpath (clean Node, no window)', () => {
  function installed(files, exportsMap) {
    const app = mkdtempSync(join(tmpdir(), 'smoke-app-'));
    const dir = join(app, 'node_modules', '@x', 'pkg');
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), text);
    }
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: '@x/pkg', type: 'module', exports: exportsMap }),
    );
    writeFileSync(join(app, 'package.json'), JSON.stringify({ type: 'module' }));
    return app;
  }

  it('fixture: top-level window access in a subpath fails', () => {
    const app = installed(
      {
        'dist/index.js': 'export const a = 1;\n',
        'dist/bad.js': 'export const w = window.innerWidth;\n',
      },
      { '.': entry('./dist/index.js'), './bad': entry('./dist/bad.js') },
    );
    const { failures, passed } = importEverySubpath(app, '@x/pkg', ['.', './bad']);
    expect(passed).toEqual(['@x/pkg']);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/@x\/pkg\/bad: .*window is not defined/);
  });

  it('passes when every subpath imports without browser globals', () => {
    const app = installed(
      { 'dist/index.js': "export const ok = typeof window === 'undefined';\n" },
      { '.': entry('./dist/index.js') },
    );
    expect(importEverySubpath(app, '@x/pkg', ['.'])).toEqual({ failures: [], passed: ['@x/pkg'] });
  });
});

describe('TypeScript floor', () => {
  it('CONSUMING.md states the floor the smoke typechecks at', () => {
    const doc = readFileSync(join(REPO, 'CONSUMING.md'), 'utf8');
    const [major, minor] = TS_FLOOR.split('.');
    expect(doc).toContain(`TypeScript ${major}.${minor}`);
  });

  it('the smoke tools are pinned in devDependencies', () => {
    for (const tool of ['publint', 'typescript', 'jsdom', 'vite', '@vitejs/plugin-react']) {
      expect(PKG.devDependencies[tool]).toBeTruthy();
    }
    const smoke = readFileSync(join(REPO, 'scripts/smoke-consumer.mjs'), 'utf8');
    expect(smoke).not.toMatch(/npx', \['--yes', '[^']+@latest/);
  });
});
