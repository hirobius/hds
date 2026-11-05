/**
 * scripts/build-utility-safelist.mjs (hds#449): the utilities the last
 * release shipped stay emitted, through a generated `@source inline(...)` list
 * that src/styles/theme.css imports, until a ledger step lists their removal.
 * Dropping a utility becomes opt-in instead of a side effect of deleting the
 * last file that named it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readLaneScripts } from '../lib/gate-lanes.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'tailwindcss';
import { SAFELIST_FILE, utilitySafelist } from '../build-utility-safelist.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { cleanUpRepos, cssRepo, note, write } from './helpers/upgrade-repo.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/build-utility-safelist.mjs');
const require = createRequire(import.meta.url);

afterEach(cleanUpRepos);

/** A pending note whose one step drops `names` (their utility-removed facts). */
const dropping = (names) => ({
  impact: 'none',
  steps: [
    {
      id: 'look/utilities',
      kind: 'look',
      impact: 'none',
      plain: 'These utilities are no longer emitted.',
      facts: names.map((name) => `utility-removed:${name}`),
    },
  ],
});

/** cssRepo() whose 0.20.0 release shipped `classes` in its stylesheet. */
function releasedWith(classes) {
  const root = cssRepo();
  const file = join(root, 'docs/api/releases/0.20.0.json');
  const release = JSON.parse(readFileSync(file, 'utf8'));
  release.css.bundles['./styles.css'].classes = classes;
  write(root, 'docs/api/releases/0.20.0.json', formatJson(release));
  return root;
}

/** The CSS Tailwind emits for a stylesheet that imports `safelist` and scans nothing. */
async function emitted(safelist) {
  const files = {
    '/app/main.css': '@import "tailwindcss";\n@import "./safelist.css";\n',
    '/app/safelist.css': safelist,
  };
  const loadStylesheet = async (id, from) => {
    if (id.startsWith('.')) {
      const path = resolve(from, id);
      return { path, base: dirname(path), content: files[path] };
    }
    const path = require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id);
    return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
  };
  const compiler = await compile(files['/app/main.css'], { base: '/app', loadStylesheet });
  return compiler.build([]);
}

describe('utilitySafelist', () => {
  it('lists each utility the last release shipped, one @source inline per line, and no public class', () => {
    const { text, utilities } = utilitySafelist(
      releasedWith(['flex', 'hds-card', 'hds-focus', 'sm:inline-block', 'pt-1']),
    );
    expect(utilities).toEqual(['flex', 'pt-1', 'sm:inline-block']);
    expect(text).toContain('docs/api/releases/0.20.0.json');
    expect(text.split('\n').filter((line) => line.startsWith('@source'))).toEqual([
      '@source inline("flex");',
      '@source inline("pt-1");',
      '@source inline("sm:inline-block");',
    ]);
  });

  it('leaves out a utility a pending step, or the ledger of the version being cut, lists as removed', () => {
    const root = releasedWith(['flex', 'pt-1', 'sm:inline-block']);
    note(root, 'drop-pt', dropping(['pt-1']));
    expect(utilitySafelist(root).utilities).toEqual(['flex', 'sm:inline-block']);
    write(
      root,
      'upgrade/releases/0.20.0.json',
      formatJson({ version: '0.20.0', steps: dropping(['flex']).steps }),
    );
    expect(utilitySafelist(root).utilities).toEqual(['sm:inline-block']);
  });

  it('skips a class Tailwind cannot read back from an inline source (quotes, backslashes, braces)', () => {
    const { utilities, skipped } = utilitySafelist(
      releasedWith(['flex', 'content-["x"]', 'a\\b', 'grid-{a,b}']),
    );
    expect(utilities).toEqual(['flex']);
    expect(skipped).toEqual(['a\\b', 'content-["x"]', 'grid-{a,b}']);
  });

  it('keeps a utility dropped from source in the build until a ledger step removes it', async () => {
    const root = releasedWith(['pt-1', 'sm:inline-block']);
    // No source names pt-1 any more; the safelist still does.
    expect(await emitted(utilitySafelist(root).text)).toContain('.pt-1');
    note(root, 'drop-pt', dropping(['pt-1']));
    const css = await emitted(utilitySafelist(root).text);
    expect(css).not.toContain('.pt-1');
    expect(css).toContain('sm\\:inline-block');
  });
});

describe('build-utility-safelist.mjs CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('writes the safelist for --root, --check passes on it, then fails once a step drops a utility', () => {
    const root = releasedWith(['flex', 'pt-1']);
    expect(run(['--root', root]).status).toBe(0);
    expect(readFileSync(join(root, SAFELIST_FILE), 'utf8')).toContain('@source inline("pt-1");');
    expect(run(['--root', root, '--check']).status).toBe(0);
    note(root, 'drop-pt', dropping(['pt-1']));
    const stale = run(['--root', root, '--check']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('node scripts/build-utility-safelist.mjs');
  }, 30_000);

  it('is imported by src/styles/theme.css in place of a hand-kept list, and checked in pretest', () => {
    const theme = readFileSync(join(REPO, 'src/styles/theme.css'), 'utf8');
    expect(theme).toContain("@import './utility-safelist.generated.css';");
    expect(theme).not.toMatch(/^@source inline/m);
    expect(readLaneScripts(REPO).pretest).toContain(
      'node scripts/build-utility-safelist.mjs --check',
    );
  });
});
