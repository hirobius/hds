// @vitest-environment node
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
import { HOOKS, INTENTS, RATIFIED_CORE } from '../../mcp/guide.mjs';
import { needsMarkdown } from '../lib/guide-markdown.mjs';

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

  it('keeps its core set equal to the ratified core', () => {
    expect([...RATIFIED_CORE].sort()).toEqual([...CORE_COMPONENTS].sort());
  });

  it('gives every need exactly one first answer, and one need per number row', () => {
    const firsts = INTENTS.map((i) => i.use[0]);
    const metrics = INTENTS.filter((i) => i.use.includes('MetricTiles'));
    expect(metrics.map((i) => i.id)).toEqual(['metrics']);
    for (const name of ['Stat', 'CardMetric', 'StatusTile']) {
      expect(firsts).not.toContain(name);
      expect(metrics[0].avoid).toContain(name);
    }
  });

  it('recommends the kept components for their own purposes', () => {
    const used = new Set(INTENTS.flatMap((i) => i.use));
    for (const name of [
      'Kbd',
      'Blockquote',
      'Timestamp',
      'AvatarGroup',
      'MetadataList',
      'DestructiveSection',
      'Pin',
      'Switcher',
      'Sidebar',
    ]) {
      expect(used, name).toContain(name);
    }
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

  it('keeps the repo notes below the marker, untouched', () => {
    const md = buildAgentsMd(inputs());
    expect(md.endsWith(`${REPO_NOTES_MARKER}\n\n## Contributing\n\nRepo-only notes.\n`)).toBe(true);
  });

  it('stays short: under 11 KB above the repo notes', () => {
    const md = buildAgentsMd({ ...inputs(), repoNotes: '' });
    expect(Buffer.byteLength(md)).toBeLessThan(11 * 1024);
  });
});

describe('AGENTS.md and llms.txt agree', () => {
  it('both carry the same pick-by-need list, rendered from mcp/guide.mjs', () => {
    const needs = needsMarkdown(readJson('src/app/data/component-api.json').components);
    for (const file of ['AGENTS.md', 'llms.txt', 'public/llms.txt']) {
      expect(readFileSync(join(ROOT, file), 'utf8'), file).toContain(needs);
    }
  });

  it('llms.txt no longer offers a choice between the number components', () => {
    const llms = readFileSync(join(ROOT, 'public/llms.txt'), 'utf8');
    expect(llms).not.toMatch(/Pick between `MetricTiles`, `Stat`/);
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
