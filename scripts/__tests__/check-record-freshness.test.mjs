/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-record-freshness.mjs (hds#249).
 *
 * The pure functions take in-memory commit fixtures, so these run with no
 * git process and no filesystem writes. A separate CLI-integration test
 * (check-record-freshness.cli.test.mjs) proves the real `git log`/`git
 * diff-tree` wiring against this repo's own history.
 */

import { describe, it, expect } from 'vitest';
import {
  checkChangesetPresence,
  checkStatusFreshness,
  consumerPackageChanges,
  hasStatusNote,
  isStatusNote,
  newestTouching,
  shippedCodeEntries,
  shipsToConsumers,
  touchesWatchedPath,
} from '../check-record-freshness.mjs';

const commit = (overrides) => ({
  sha: 'deadbeef',
  date: '2026-09-20T00:00:00Z',
  message: 'chore: something',
  files: [],
  ...overrides,
});

describe('touchesWatchedPath', () => {
  it('matches a file under a watched prefix', () => {
    expect(touchesWatchedPath('src/app/components/button.tsx', ['src/'])).toBe(true);
  });

  it('does not match a file outside every prefix', () => {
    expect(touchesWatchedPath('docs/guardrails/registry.json', ['src/', 'scripts/'])).toBe(false);
  });
});

describe('newestTouching', () => {
  it('returns null when nothing touches the watched prefixes', () => {
    const commits = [commit({ files: ['README.md'] })];
    expect(newestTouching(commits, ['src/'])).toBeNull();
  });

  it('returns the latest-dated matching commit, not just the last in the array', () => {
    const commits = [
      commit({ sha: 'aaa', date: '2026-09-01T00:00:00Z', files: ['src/a.ts'] }),
      commit({ sha: 'bbb', date: '2026-09-20T00:00:00Z', files: ['src/b.ts'] }),
      commit({ sha: 'ccc', date: '2026-09-10T00:00:00Z', files: ['src/c.ts'] }),
    ];
    expect(newestTouching(commits, ['src/'])?.sha).toBe('bbb');
  });
});

describe('checkStatusFreshness', () => {
  it('passes when no pushed commit touches a watched path', () => {
    const commits = [commit({ date: '2026-09-24T00:00:00Z', files: ['README.md'] })];
    expect(checkStatusFreshness(commits, '2026-01-01T00:00:00Z').ok).toBe(true);
  });

  it('passes when status.json is at least as new as the newest watched commit', () => {
    const commits = [commit({ date: '2026-09-20T00:00:00Z', files: ['scripts/foo.mjs'] })];
    expect(checkStatusFreshness(commits, '2026-09-20T00:00:00Z').ok).toBe(true);
    expect(checkStatusFreshness(commits, '2026-09-21T00:00:00Z').ok).toBe(true);
  });

  it('fails and names the newest offending commit when status.json is older', () => {
    const commits = [
      commit({ sha: 'aaa', date: '2026-09-19T00:00:00Z', files: ['docs/adr/030-x.md'] }),
      commit({ sha: 'bbb', date: '2026-09-23T00:00:00Z', files: ['src/x.ts'] }),
    ];
    const result = checkStatusFreshness(commits, '2026-09-20T00:00:00Z');
    expect(result.ok).toBe(false);
    expect(result.newest.sha).toBe('bbb');
  });
});

describe('checkChangesetPresence', () => {
  it('passes when no pushed commit touches src/', () => {
    const commits = [commit({ files: ['scripts/foo.mjs', 'docs/x.md'] })];
    expect(checkChangesetPresence(commits, []).ok).toBe(true);
  });

  it('passes when a src/ commit exists and a changeset is pending', () => {
    const commits = [commit({ files: ['src/index.ts'] })];
    expect(checkChangesetPresence(commits, ['brave-lions-jump.md']).ok).toBe(true);
  });

  it('passes when a src/ commit carries a skip-changeset marker, even with no pending changeset', () => {
    const commits = [commit({ files: ['src/index.ts'], message: 'fix: typo\n\nskip-changeset' })];
    expect(checkChangesetPresence(commits, []).ok).toBe(true);
  });

  it('fails and names the offending commit(s) when neither is present', () => {
    const commits = [
      commit({ sha: 'aaa', files: ['README.md'] }),
      commit({ sha: 'bbb', files: ['src/index.ts'], message: 'feat: new export' }),
    ];
    const result = checkChangesetPresence(commits, []);
    expect(result.ok).toBe(false);
    expect(result.offenders.map((c) => c.sha)).toEqual(['bbb']);
  });
});

describe('what needs a changeset: what ships to consumers (hds#448)', () => {
  it('counts src/, the shipped codemods, hds-mcp, the ESLint plugin, the token source and the token Tailwind config', () => {
    for (const file of [
      'src/app/components/button.tsx',
      'codemods/tile-grid.mjs',
      'codemods/removed-0.20.json',
      'mcp/hds-mcp.mjs',
      'scripts/eslint-plugin-hds/rules/no-raw-controls.mjs',
      'hirobius.tokens.json',
      'tailwind.config.tokens.cjs',
    ]) {
      expect(shipsToConsumers(file), file).toBe(true);
    }
  });

  // codemods/ also holds what does not ship yet (codemods/lib/ serves
  // pnpm upgrade:consumers here, and joins files when the upgrade command,
  // hds#452, ships it); package.json#files is the list that ships.
  it('counts only the codemods, MCP and plugin files package.json#files ships', () => {
    // codemods/lib/ ships since the upgrade command imports it (hds#452); fixtures never do.
    expect(shipsToConsumers('codemods/lib/installed-version.mjs')).toBe(true);
    expect(shipsToConsumers('codemods/__fixtures__/clean/a.tsx')).toBe(false);
    expect(shipsToConsumers('codemods/hds-prefix.mjs')).toBe(true);
    expect(shipsToConsumers('codemods/patterns-subpath.names.json')).toBe(true);
    expect(shipsToConsumers('mcp/catalog.mjs')).toBe(true);
    expect(shipsToConsumers('scripts/eslint-plugin-hds/package.json')).toBe(true);
    expect(shipsToConsumers('scripts/eslint-plugin-hds/eslint.config.mjs')).toBe(false);
  });

  it('reads the shipped list it is given: files, directories with or without a slash, and globs', () => {
    const files = [
      'codemods/new.mjs',
      'mcp',
      'scripts/eslint-plugin-hds/rules/',
      'codemods/*.json',
    ];
    expect(shipsToConsumers('codemods/new.mjs', files)).toBe(true);
    expect(shipsToConsumers('codemods/new.mjs.bak', files)).toBe(false);
    expect(shipsToConsumers('codemods/hds-prefix.mjs', files)).toBe(false);
    expect(shipsToConsumers('codemods/removed-0.20.json', files)).toBe(true);
    expect(shipsToConsumers('codemods/lib/data.json', files)).toBe(false);
    expect(shipsToConsumers('mcp/hds-mcp.mjs', files)).toBe(true);
    expect(shipsToConsumers('mcpx/hds-mcp.mjs', files)).toBe(false);
    expect(shipsToConsumers('scripts/eslint-plugin-hds/rules/no-raw-controls.mjs', files)).toBe(
      true,
    );
    expect(shipsToConsumers('scripts/eslint-plugin-hds/index.mjs', files)).toBe(false);
    // src/ and the token files ship whatever the list says.
    expect(shipsToConsumers('src/index.ts', [])).toBe(true);
    expect(shipsToConsumers('hirobius.tokens.json', [])).toBe(true);
  });

  // The list a real package.json gives, read whole: a directory with or
  // without ./ or a trailing slash, a parent of a shipped directory, or a glob.
  it('reads package.json#files as npm does, within codemods/, mcp/ and the ESLint plugin', () => {
    const ships = (file, files) => shipsToConsumers(file, shippedCodeEntries({ files }));
    expect(ships('mcp/hds-mcp.mjs', ['mcp'])).toBe(true);
    expect(ships('mcp/hds-mcp.mjs', ['./mcp/'])).toBe(true);
    expect(ships('scripts/eslint-plugin-hds/index.mjs', ['scripts/'])).toBe(true);
    expect(ships('codemods/tile-grid.mjs', ['**/*.mjs'])).toBe(true);
    expect(ships('codemods/tile-grid.mjs', ['dist', 'codemods/hds-prefix.mjs'])).toBe(false);
    expect(ships('mcpx/hds-mcp.mjs', ['mcpx', 'mcp'])).toBe(false);
    // Outside those directories a files entry adds nothing: tooling stays tooling.
    expect(ships('scripts/check-upgrade-ledger.mjs', ['scripts/'])).toBe(false);
    // With no files list npm packs everything, so the whole directories ship.
    expect(ships('codemods/lib/installed-version.mjs', undefined)).toBe(true);
    expect(shippedCodeEntries(null)).toEqual(['codemods/', 'mcp/', 'scripts/eslint-plugin-hds/']);
  });

  it('leaves out tooling, docs, and the tests and fixtures beside shipped code', () => {
    for (const file of [
      'scripts/check-upgrade-ledger.mjs',
      'scripts/upgrade/note.mjs',
      'docs/guardrails/registry.json',
      'README.md',
      'package.json',
      'codemods/__tests__/tile-grid.test.mjs',
      'codemods/__fixtures__/tile-grid/clean/src/App.tsx',
      'scripts/eslint-plugin-hds/__tests__/no-raw-controls.test.mjs',
      'scripts/eslint-plugin-hds/README.md',
      'mcp/hds-mcp.test.mjs',
    ]) {
      expect(shipsToConsumers(file), file).toBe(false);
    }
  });

  const pkg = {
    name: '@hirobius/design-system',
    version: '0.20.0',
    exports: { '.': './dist/hirobius-ui.js', './styles.css': './dist/styles.css' },
    bin: { 'hds-mcp': 'mcp/hds-mcp.mjs' },
    files: ['dist'],
    dependencies: { clsx: '^2.1.1', 'tailwind-merge': '^3.0.0' },
    peerDependencies: { react: '^18.3.0 || ^19.0.0' },
    peerDependenciesMeta: { react: { optional: false } },
    engines: { node: '>=20' },
    scripts: { test: 'vitest run' },
    devDependencies: { vitest: '^4.0.0' },
  };
  const edit = (change) => {
    const next = structuredClone(pkg);
    change(next);
    return next;
  };

  it('reads package.json scripts, devDependencies, version and key order as tooling', () => {
    const tooling = edit((p) => {
      p.scripts.lint = 'eslint .';
      p.devDependencies.zod = '^4.4.3';
      p.version = '0.21.0';
      p.dependencies = { 'tailwind-merge': '^3.0.0', clsx: '^2.1.1' };
    });
    expect(consumerPackageChanges(pkg, tooling)).toEqual([]);
  });

  it('names each package.json field a consumer installs or resolves', () => {
    const cases = {
      dependencies: (p) => delete p.dependencies.clsx,
      peerDependencies: (p) => (p.peerDependencies.react = '^19.0.0'),
      peerDependenciesMeta: (p) => (p.peerDependenciesMeta.react.optional = true),
      engines: (p) => (p.engines.node = '>=22'),
      exports: (p) => delete p.exports['./styles.css'],
      bin: (p) => delete p.bin['hds-mcp'],
      files: (p) => p.files.push('AGENTS.md'),
    };
    for (const [field, change] of Object.entries(cases)) {
      expect(consumerPackageChanges(pkg, edit(change)), field).toEqual([field]);
    }
  });

  it('counts a package.json that cannot be read as a consumer change', () => {
    expect(consumerPackageChanges(pkg, null)).not.toEqual([]);
  });

  it('wants a changeset for a commit that changes a consumer package.json field or a shipped codemod', () => {
    const deps = commit({ sha: 'aaa', files: ['package.json'], packageFields: ['dependencies'] });
    const codemod = commit({ sha: 'bbb', files: ['codemods/tile-grid.mjs'] });
    const scripts = commit({ sha: 'ccc', files: ['package.json'], packageFields: [] });
    const result = checkChangesetPresence([deps, codemod, scripts], []);
    expect(result.offenders.map((c) => c.sha)).toEqual(['aaa', 'bbb']);
    expect(result.offenders[0].reasons).toEqual(['package.json dependencies']);
    expect(result.offenders[1].reasons).toEqual(['codemods/tile-grid.mjs']);
    expect(checkChangesetPresence([deps, codemod], ['brave-lions-jump.md']).ok).toBe(true);
  });
});

describe('status notes (.status/*.md) — conflict-free alternative to bumping updatedAt', () => {
  it('recognises a note file but not the README or nested/other paths', () => {
    expect(isStatusNote('.status/claude-fix-x.md')).toBe(true);
    expect(isStatusNote('.status/README.md')).toBe(false);
    expect(isStatusNote('.status/sub/a.md')).toBe(false);
    expect(isStatusNote('docs/.status/a.md')).toBe(false);
    expect(isStatusNote('.status/a.txt')).toBe(false);
  });

  it('hasStatusNote is true only when a pushed commit carries a note', () => {
    expect(hasStatusNote([commit({ files: ['src/a.ts'] })])).toBe(false);
    expect(
      hasStatusNote([commit({ files: ['src/a.ts'] }), commit({ files: ['.status/a.md'] })]),
    ).toBe(true);
  });

  it('a note satisfies freshness for a stale status.json', () => {
    const commits = [
      commit({ date: '2026-09-23T00:00:00Z', files: ['src/x.ts'] }),
      commit({ date: '2026-09-23T00:00:01Z', files: ['.status/a.md'] }),
    ];
    expect(checkStatusFreshness(commits, '2026-09-01T00:00:00Z').ok).toBe(true);
  });

  it('canary: without a note, the same stale status.json still fails', () => {
    const commits = [commit({ date: '2026-09-23T00:00:00Z', files: ['src/x.ts'] })];
    expect(checkStatusFreshness(commits, '2026-09-01T00:00:00Z').ok).toBe(false);
  });
});
