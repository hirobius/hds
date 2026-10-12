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
import {
  DOCS_INDEX_PATH,
  FRONT_DOOR_PATH,
  REPO_NOTES_MARKER,
  buildAgentsMd,
  buildDocsIndex,
  buildFrontDoor,
  readRepoNotes,
} from '../generate-agents-md.mjs';
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
  alwaysOn: ['CLAUDE.md', 'docs/ai/FRONT-DOOR.md', 'docs/ai/NORTH_STAR.md', 'public/llms.txt'],
  surfaces: [
    {
      path: 'DESIGN.md',
      describes: 'The visual spec',
      kind: 'generated',
      by: 'scripts/build-design-md.mjs',
      check: 'node scripts/build-design-md.mjs --check',
    },
    {
      path: 'CHANGELOG.md',
      describes: 'Release notes',
      kind: 'generated',
      by: 'changesets (pnpm changeset:version)',
      freshness: 'unchecked',
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

/** Everything after the repo-notes marker. */
const notesOf = (md) => md.slice(md.indexOf(REPO_NOTES_MARKER) + REPO_NOTES_MARKER.length);

describe('AGENTS.md repo notes', () => {
  it('keeps the hand-written notes below the marker byte for byte, with no generated block', () => {
    const md = buildAgentsMd(inputs());
    expect(notesOf(md)).toBe('\n\n## Contributing\n\nRepo-only notes.\n');
    expect(md).not.toContain('hds:front-door');
  });

  it('survives a regenerate: readRepoNotes returns exactly the notes', () => {
    const once = buildAgentsMd(inputs());
    expect(readRepoNotes(once)).toBe('## Contributing\n\nRepo-only notes.\n');
    expect(buildAgentsMd({ ...inputs(), repoNotes: readRepoNotes(once) })).toBe(once);
  });

  it('the committed notes point at the front door in one line, and ship no owner or cadence', () => {
    const notes = notesOf(readFileSync(join(ROOT, 'AGENTS.md'), 'utf8'));
    expect(notes.split('\n').filter((l) => l.includes(FRONT_DOOR_PATH))).toHaveLength(1);
    expect(notes).not.toMatch(/reviewed|re-read within|owner/i);
    expect(notes).not.toMatch(/https?:\/\//);
  });
});

describe('the front door (docs/ai/FRONT-DOOR.md)', () => {
  const door = () => buildFrontDoor(registry());

  it('says in one line what the repo is', () => {
    expect(door()).toMatch(/token-first React/i);
    expect(door()).toContain('@hirobius/design-system');
  });

  it('gives the always-on files in order, CLAUDE.md first, then ENGINEERING.md', () => {
    const at = (needle) => door().indexOf(needle);
    expect(at('`CLAUDE.md`')).toBeGreaterThan(-1);
    expect(at('`CLAUDE.md`')).toBeLessThan(at('`docs/ai/NORTH_STAR.md`'));
    expect(at('`docs/ai/NORTH_STAR.md`')).toBeLessThan(at('`public/llms.txt`'));
    expect(door()).toContain('`docs/ENGINEERING.md`');
  });

  it('says where live state is, without copying any of it and without a host', () => {
    expect(door()).toContain('/ops/standing');
    expect(door()).toContain('/api/projects?status=hirobius/hds');
    expect(door()).toContain('`status.json`');
    expect(door()).not.toMatch(/https?:\/\/|\.vercel\.app|hirobius-ops/);
  });

  it('points at the full docs index instead of holding it', () => {
    expect(door()).toContain(`\`${DOCS_INDEX_PATH}\``);
    expect(door()).not.toContain('docs/ROADMAP.md');
    expect(door()).not.toMatch(/^## (Generated|Checked|Editorial)/m);
  });

  it('is short: it is read by every agent in every session', () => {
    expect(Buffer.byteLength(door())).toBeLessThan(2200);
  });

  it('states no derived fact (version, count, issue list, as-of date) and names no owner', () => {
    expect(
      door()
        .split('\n')
        .flatMap((line) => derivedFacts(line)),
    ).toEqual([]);
    expect(door()).not.toMatch(/Adrian|reviewed|re-read within/);
  });

  it('is marked generated, not shipped, and do-not-edit', () => {
    expect(door()).toMatch(/Generated by scripts\/generate-agents-md\.mjs/);
    expect(door()).toMatch(/not shipped in the npm package/i);
  });
});

describe('the docs index (docs/ai/DOCS-INDEX.md)', () => {
  const index = () => buildDocsIndex(registry());
  const under = (from, to) => {
    const md = index();
    const a = md.indexOf(from);
    const b = to ? md.indexOf(to) : -1;
    expect(a, from).toBeGreaterThan(-1);
    return md.slice(a, b < 0 ? undefined : b);
  };

  it('groups every registered surface under its kind, in kind order', () => {
    const md = index();
    expect(md.indexOf('## Generated')).toBeLessThan(md.indexOf('## Checked'));
    expect(md.indexOf('## Checked')).toBeLessThan(md.indexOf('## Editorial'));
    expect(under('## Checked', '## Editorial')).toMatch(
      /`status\.json` \(consistency\).*Agent-consistency figures.*`scripts\/check-status-claims\.mjs`/,
    );
    expect(under('## Editorial')).toMatch(/`docs\/ROADMAP\.md`.*Backlog and debt.*2026-10-12/);
  });

  it('names the command that proves a generated file fresh', () => {
    expect(under('## Generated', '## Checked')).toMatch(
      /`DESIGN\.md`.*The visual spec.*`node scripts\/build-design-md\.mjs --check`/,
    );
  });

  it('says honestly when nothing checks a generated file is fresh', () => {
    const row = under('## Generated', '## Checked')
      .split('\n')
      .find((l) => l.includes('`CHANGELOG.md`'));
    expect(row).toContain('not freshness-checked');
    expect(row).not.toMatch(/--check/);
  });

  it('indexes the committed registry in full, and flags its unchecked generated files', () => {
    const reg = readJson('docs/state-surfaces.json');
    const md = readFileSync(join(ROOT, DOCS_INDEX_PATH), 'utf8');
    for (const s of reg.surfaces) expect(md, s.path).toContain(`\`${s.path}\``);
    const unchecked = reg.surfaces.filter((s) => s.freshness === 'unchecked');
    expect(unchecked.length).toBeGreaterThan(0);
    expect(md.match(/not freshness-checked/g)).toHaveLength(unchecked.length);
  });
});

describe('generate-agents-md --check', () => {
  const FILES = [
    'AGENTS.md',
    FRONT_DOOR_PATH,
    DOCS_INDEX_PATH,
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
  const withRoot = (fn) => {
    const root = copyRoot();
    try {
      fn(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it('passes on the committed files', () => {
    const res = spawnSync(process.execPath, ['scripts/generate-agents-md.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });

  it('passes on an untouched copy, fails after the registry changes, names the files and the fix', () =>
    withRoot((root) => {
      expect(run(root).status).toBe(0);
      const regPath = join(root, 'docs/state-surfaces.json');
      const reg = JSON.parse(readFileSync(regPath, 'utf8'));
      reg.surfaces.find((s) => s.kind === 'editorial').reviewedAt = '2026-01-02';
      writeFileSync(regPath, JSON.stringify(reg, null, 2));
      const res = run(root);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('pnpm agents:generate');
      expect(res.stderr).toContain(DOCS_INDEX_PATH);
    }));

  it.each([
    [FRONT_DOOR_PATH, (t) => `${t}\nhand edit\n`],
    [DOCS_INDEX_PATH, (t) => `${t}\nhand edit\n`],
    // Below the repo-notes marker AGENTS.md is hand-written; above it is generated.
    ['AGENTS.md', (t) => t.replace('## Rules', '## Rules (edited)')],
  ])('fails when the generated part of %s is hand-edited', (file, edit) =>
    withRoot((root) => {
      const p = join(root, file);
      writeFileSync(p, edit(readFileSync(p, 'utf8')));
      const res = run(root);
      expect(res.status).toBe(1);
      expect(res.stderr).toContain(file);
    }),
  );

  it('accepts a hand edit below the AGENTS.md repo-notes marker', () =>
    withRoot((root) => {
      const p = join(root, 'AGENTS.md');
      writeFileSync(p, `${readFileSync(p, 'utf8')}\nA new repo note.\n`);
      expect(run(root).status).toBe(0);
    }));

  it('fails when a generated file is missing', () =>
    withRoot((root) => {
      rmSync(join(root, FRONT_DOOR_PATH));
      expect(run(root).status).toBe(1);
    }));
});
