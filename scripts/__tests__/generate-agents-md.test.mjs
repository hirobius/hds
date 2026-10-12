// @vitest-environment node
/**
 * The packaged AGENTS.md (scripts/generate-agents-md.mjs) and the guide it
 * projects (mcp/guide.mjs). Seams: buildAgentsMd() for content, the CLI's
 * --check for the drift gate.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REPO_NOTES_MARKER, buildAgentsMd, readRepoNotes } from '../generate-agents-md.mjs';
import { derivedFacts } from '../check-state-surfaces.mjs';
import { CORE_COMPONENTS } from '../lib/core-components.mjs';
import { HOOKS, INTENTS, recommendedComponents } from '../../mcp/guide.mjs';
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

  it('keeps the ratified core inside the recommended set', () => {
    const rec = recommendedComponents();
    for (const name of CORE_COMPONENTS) expect(rec).toContain(name);
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
    for (const file of ['AGENTS.md', 'public/llms-full.txt']) {
      expect(readFileSync(join(ROOT, file), 'utf8'), file).toContain(needs);
    }
  });

  it('llms.txt no longer offers a choice between the number components', () => {
    const llms = readFileSync(join(ROOT, 'public/llms-full.txt'), 'utf8');
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

/** A registry small enough to read in a failure message, one surface of each kind. */
const registry = () => ({
  alwaysOn: ['CLAUDE.md', 'docs/ai/NORTH_STAR.md', 'public/llms.txt'],
  surfaces: [
    {
      path: 'DESIGN.md',
      describes: 'The visual spec',
      kind: 'generated',
      by: 'scripts/build-design-md.mjs',
    },
    {
      path: 'status.json',
      describes: 'Agent-consistency figures',
      kind: 'checked',
      by: 'scripts/check-status-claims.mjs',
      section: 'consistency',
    },
    {
      path: 'docs/ROADMAP.md',
      describes: 'Backlog and debt',
      kind: 'editorial',
      owner: 'Adrian',
      reviewedAt: '2026-10-12',
      maxAgeDays: 45,
    },
  ],
});

const FRONT_DOOR = 'Front door: working in the hds repo';
const withRegistry = (extra = {}) => ({ ...inputs(), registry: registry(), ...extra });
/** Everything after the repo-notes marker. */
const notesOf = (md) => md.slice(md.indexOf(REPO_NOTES_MARKER) + REPO_NOTES_MARKER.length);

describe('the repo-notes front door', () => {
  it('opens the repo notes with one line on what the repo is', () => {
    const door = section(notesOf(buildAgentsMd(withRegistry())), FRONT_DOOR);
    expect(door).toMatch(/token-first React/i);
    expect(door).toContain('@hirobius/design-system');
  });

  it('gives the read order for an agent working in the repo, CLAUDE.md first', () => {
    const door = section(notesOf(buildAgentsMd(withRegistry())), FRONT_DOOR);
    const at = (needle) => door.indexOf(needle);
    expect(at('`CLAUDE.md`')).toBeGreaterThan(-1);
    expect(at('`CLAUDE.md`')).toBeLessThan(at('`docs/ai/NORTH_STAR.md`'));
    expect(at('`docs/ai/NORTH_STAR.md`')).toBeLessThan(at('`public/llms.txt`'));
    expect(door).toContain('`docs/ENGINEERING.md`');
  });

  it('says where live state is, without copying any of it', () => {
    const door = section(notesOf(buildAgentsMd(withRegistry())), FRONT_DOOR);
    expect(door).toContain('/ops/standing');
    expect(door).toContain('/api/projects?status=hirobius/hds');
    expect(door).toContain('`status.json`');
  });

  it('indexes every registered surface under its kind, in kind order', () => {
    const door = section(notesOf(buildAgentsMd(withRegistry())), FRONT_DOOR);
    const gen = door.indexOf('### Generated');
    const chk = door.indexOf('### Checked');
    const edt = door.indexOf('### Editorial');
    expect(gen).toBeGreaterThan(-1);
    expect(gen).toBeLessThan(chk);
    expect(chk).toBeLessThan(edt);
    const under = (from, to) => door.slice(from, to < 0 ? undefined : to);
    expect(under(gen, chk)).toMatch(/`DESIGN\.md`.*visual spec.*`scripts\/build-design-md\.mjs`/);
    expect(under(chk, edt)).toMatch(
      /`status\.json`.*consistency.*`scripts\/check-status-claims\.mjs`/,
    );
    expect(under(edt, -1)).toMatch(/`docs\/ROADMAP\.md`.*Backlog and debt.*2026-10-12/);
  });

  it('puts the generated block before the hand-written notes, and keeps those notes', () => {
    const md = buildAgentsMd(withRegistry());
    expect(md.indexOf(FRONT_DOOR)).toBeGreaterThan(md.indexOf(REPO_NOTES_MARKER));
    expect(md.indexOf(FRONT_DOOR)).toBeLessThan(md.indexOf('## Contributing'));
    expect(md.endsWith('## Contributing\n\nRepo-only notes.\n')).toBe(true);
  });

  it('leaves the consumer section byte for byte the same with or without a registry', () => {
    const above = (md) => md.slice(0, md.indexOf(REPO_NOTES_MARKER));
    expect(above(buildAgentsMd(withRegistry()))).toBe(above(buildAgentsMd(inputs())));
  });

  it('survives a regenerate: readRepoNotes drops the generated block, the notes stay', () => {
    const once = buildAgentsMd(withRegistry());
    expect(readRepoNotes(once)).toBe('## Contributing\n\nRepo-only notes.\n');
    const again = buildAgentsMd(withRegistry({ repoNotes: readRepoNotes(once) }));
    expect(again).toBe(once);
  });

  it('states no derived fact (version, count, issue list, as-of date)', () => {
    const door = section(notesOf(buildAgentsMd(withRegistry())), FRONT_DOOR);
    const facts = door.split('\n').flatMap((line) => derivedFacts(line));
    expect(facts).toEqual([]);
  });

  it('indexes the committed registry in full', () => {
    const reg = readJson('docs/state-surfaces.json');
    const door = section(notesOf(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')), FRONT_DOOR);
    for (const s of reg.surfaces) expect(door, s.path).toContain(`\`${s.path}\``);
  });
});

describe('generate-agents-md --check on a stale front door', () => {
  const FILES = [
    'AGENTS.md',
    'docs/state-surfaces.json',
    'src/app/data/component-api.json',
    'codemods/patterns-subpath.names.json',
    'content/docs/voice.mdx',
  ];
  const run = (root) =>
    spawnSync(process.execPath, ['scripts/generate-agents-md.mjs', '--check', '--root', root], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  const copyRoot = () => {
    const root = mkdtempSync(join(tmpdir(), 'agents-md-'));
    for (const f of FILES) {
      mkdirSync(dirname(join(root, f)), { recursive: true });
      cpSync(join(ROOT, f), join(root, f));
    }
    return root;
  };

  it('passes on an untouched copy, fails after the registry changes, names the fix', () => {
    const root = copyRoot();
    try {
      expect(run(root).status).toBe(0);
      const regPath = join(root, 'docs/state-surfaces.json');
      const reg = JSON.parse(readFileSync(regPath, 'utf8'));
      reg.surfaces.find((s) => s.kind === 'editorial').reviewedAt = '2031-01-02';
      writeFileSync(regPath, JSON.stringify(reg, null, 2));
      const res = run(root);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('pnpm agents:generate');
      expect(res.stderr).toContain('docs/state-surfaces.json');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails when the generated block is hand-edited in AGENTS.md', () => {
    const root = copyRoot();
    try {
      const p = join(root, 'AGENTS.md');
      writeFileSync(p, readFileSync(p, 'utf8').replace(FRONT_DOOR, `${FRONT_DOOR} (edited)`));
      expect(run(root).status).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
