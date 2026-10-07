/**
 * The packaged AGENTS.md (scripts/generate-agents-md.mjs) and the guide it
 * projects (mcp/guide.mjs). Seams: buildAgentsMd() for content, the CLI's
 * --check for the drift gate.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REPO_NOTES_MARKER, buildAgentsMd } from '../generate-agents-md.mjs';
import { CORE_COMPONENTS } from '../lib/core-components.mjs';
import { HOOKS, INTENTS, NOT_RECOMMENDED, RATIFIED_CORE } from '../../mcp/guide.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const inputs = () => ({
  componentApi: readJson('src/app/data/component-api.json'),
  patternNames: readJson('codemods/patterns-subpath.names.json').names,
  repoNotes: '## Contributing\n\nRepo-only notes.\n',
});

/** The text of one `## ` section of a markdown document. */
const section = (md, title) => {
  const start = md.indexOf(`## ${title}`);
  expect(start, `section "${title}"`).toBeGreaterThan(-1);
  const next = md.indexOf('\n## ', start + 3);
  return md.slice(start, next < 0 ? undefined : next);
};

describe('the consumer guide (mcp/guide.mjs)', () => {
  it('only recommends names that exist in component-api.json or are listed hooks', () => {
    const api = readJson('src/app/data/component-api.json').components;
    for (const intent of INTENTS) {
      for (const name of intent.use) expect(api[name] || HOOKS[name], name).toBeTruthy();
    }
  });

  it('never recommends a component under prune review', () => {
    for (const intent of INTENTS) {
      for (const name of intent.use) expect(NOT_RECOMMENDED, intent.id).not.toContain(name);
    }
  });

  it('keeps its core set equal to the ratified core minus the prune candidates', () => {
    const expected = CORE_COMPONENTS.filter((n) => !NOT_RECOMMENDED.includes(n)).sort();
    expect([...RATIFIED_CORE].sort()).toEqual(expected);
  });
});

describe('buildAgentsMd', () => {
  it('names the component to use for every need, with the patterns imported from the subpath', () => {
    const md = buildAgentsMd(inputs());
    const pick = section(md, 'Pick by need');
    for (const intent of INTENTS) {
      expect(pick).toContain(intent.need);
      for (const name of intent.use) expect(pick).toContain(`\`${name}\``);
    }
    const imports = section(md, 'Imports');
    expect(imports).toMatch(/@hirobius\/design-system\/patterns`?: .*`MetricTiles`/);
    expect(imports).toMatch(/@hirobius\/design-system`?: .*`AlertDialog`/);
    expect(imports).not.toMatch(/`Stat`/);
  });

  it('settles the divergences seen in the 2026-10-05 baseline', () => {
    const md = buildAgentsMd(inputs());
    expect(md).toMatch(/MetricTiles.*Not:.*`Stat`/s);
    expect(md).toMatch(/AlertDialog.*Not:.*`Dialog`/s);
    expect(md).toMatch(/useToast/);
    expect(md).toMatch(/raw `<form>`/);
  });

  it('points at the MCP server and the lint plugin shipped in the package', () => {
    const md = buildAgentsMd(inputs());
    expect(md).toContain('hds-mcp');
    expect(md).toContain('@hirobius/design-system/eslint-plugin');
    expect(md).toContain('configs.recommended');
  });

  it('lists the prune candidates only as not recommended', () => {
    const md = buildAgentsMd(inputs());
    const pick = section(md, 'Pick by need');
    for (const line of pick.split('\n').filter((l) => l.startsWith('- '))) {
      const use = line.split('Not:')[0];
      for (const name of NOT_RECOMMENDED) expect(use, line).not.toContain(`\`${name}\``);
    }
    expect(section(md, 'Rules')).toContain('`CardMetric`');
  });

  it('keeps the repo notes below the marker, untouched', () => {
    const md = buildAgentsMd(inputs());
    expect(md.endsWith(`${REPO_NOTES_MARKER}\n\n## Contributing\n\nRepo-only notes.\n`)).toBe(true);
  });

  it('stays short: under 9 KB above the repo notes', () => {
    const md = buildAgentsMd({ ...inputs(), repoNotes: '' });
    expect(Buffer.byteLength(md)).toBeLessThan(9 * 1024);
  });
});

describe('generate-agents-md --check', () => {
  it('passes on the committed AGENTS.md', () => {
    const res = spawnSync(process.execPath, ['scripts/generate-agents-md.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
});
