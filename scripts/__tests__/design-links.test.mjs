/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/design-links.mjs — Figma node links projected from one source,
 * `componentSpecs[].figmaUrl` in public/hds-manifest.json (readiness plan A8).
 *
 * Seams: the pure functions (URL parsing, story meta reading, link collection,
 * README section, dev resources plan, descriptions script), the descriptions
 * script run in a fresh V8 context against a fake Plugin API, and the REST sync
 * against an injected fetch. Nothing here talks to Figma.
 */
import { describe, it, expect } from 'vitest';
import vm from 'vm';
import {
  DESIGN_LINKS_END,
  DESIGN_LINKS_START,
  buildDescriptionsScript,
  collectDesignLinks,
  parseFigmaNodeUrl,
  planDevResources,
  readStoryMeta,
  renderReadmeSection,
  storyDocsId,
  syncDevResources,
  upsertReadmeSection,
} from '../lib/design-links.mjs';

const ALERT_URL =
  'https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=33-34';

const storySource = ({
  component = 'Alert',
  call = `...designParameters('${component}'),`,
} = {}) => `
import type { Meta, StoryObj } from '@storybook/react';
import { ${component} } from '../app/components/alert';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/alert',
  component: ${component},
  tags: ['autodocs'],
  parameters: {
    ${call}
    layout: 'padded',
  },
} satisfies Meta<typeof ${component}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = { args: { tone: 'info' } };
export const Danger: Story = { args: { tone: 'danger' } };
`;

const CONFIG = {
  repository: 'https://github.com/hirobius/hds',
  branch: 'main',
  storybookUrl: null,
};
const manifest = (specs) => ({ componentSpecs: specs });
const alertSpec = {
  figmaUrl: ALERT_URL,
  filePath: 'src/app/components/alert.tsx',
  description: 'Alert - compact feedback surface with contextual severity.',
};

describe('parseFigmaNodeUrl', () => {
  it.each([
    [ALERT_URL, { fileKey: 'c8MaVgwxOlxm4wr8wnH0Z4', nodeId: '33:34' }],
    [
      'https://www.figma.com/file/AbC123/Name?node-id=12%3A7',
      { fileKey: 'AbC123', nodeId: '12:7' },
    ],
    ['https://figma.com/proto/AbC123/Name?node-id=1-2&t=x', { fileKey: 'AbC123', nodeId: '1:2' }],
  ])('reads the file key and node id from %s', (url, expected) => {
    expect(parseFigmaNodeUrl(url)).toEqual(expected);
  });

  it.each([
    ['a file URL without a node', 'https://www.figma.com/design/AbC123/Name'],
    ['a placeholder', 'TODO:hds-master:Alert'],
    ['another host', 'https://www.figma.com.example.org/design/AbC123/Name?node-id=1-2'],
    ['an instance sublayer id', 'https://www.figma.com/design/AbC123/Name?node-id=I1-2%3B3-4'],
    ['null', null],
  ])('returns null for %s', (_label, url) => {
    expect(parseFigmaNodeUrl(url)).toBeNull();
  });
});

describe('readStoryMeta', () => {
  it('reads title, component, tags, the first story and designParameters calls from a satisfies-Meta file', () => {
    expect(readStoryMeta(storySource())).toEqual({
      title: 'Primitives/alert',
      component: 'Alert',
      tags: ['autodocs'],
      firstStory: 'Info',
      designParameters: ['Alert'],
      figmaUrlLiterals: 0,
    });
  });

  it('reads an inline `export default {…}` meta and counts hardcoded Figma URLs', () => {
    const source = `
      export default { title: 'Patterns/Card', component: Card, parameters: { design: { type: 'figma', url: '${ALERT_URL}' } } };
      export const Basic = {};
    `;
    expect(readStoryMeta(source)).toMatchObject({
      title: 'Patterns/Card',
      component: 'Card',
      tags: [],
      firstStory: 'Basic',
      designParameters: [],
      figmaUrlLiterals: 1,
    });
  });

  it('returns null for a file with no default-exported meta', () => {
    expect(readStoryMeta('export const x = 1;')).toBeNull();
  });
});

describe('storyDocsId', () => {
  it('follows Storybook id sanitizing', () => {
    expect(storyDocsId('Primitives/alert')).toBe('primitives-alert--docs');
    expect(storyDocsId('Patterns/Sequential Navigator')).toBe(
      'patterns-sequential-navigator--docs',
    );
  });
});

describe('collectDesignLinks', () => {
  const stories = [{ path: 'src/stories/alert.stories.tsx', source: storySource() }];

  it('links a component whose figmaUrl is a Figma node, with its story and source', () => {
    const { links, problems, total } = collectDesignLinks({
      manifest: manifest({
        Alert: alertSpec,
        Badge: { figmaUrl: null, filePath: 'src/app/components/badge.tsx' },
      }),
      stories,
      config: CONFIG,
      packageName: '@hirobius/design-system',
    });
    expect(problems).toEqual([]);
    expect(total).toBe(2);
    expect(links).toEqual([
      {
        name: 'Alert',
        figmaUrl: ALERT_URL,
        fileKey: 'c8MaVgwxOlxm4wr8wnH0Z4',
        nodeId: '33:34',
        importLine: "import { Alert } from '@hirobius/design-system';",
        description: 'Alert - compact feedback surface with contextual severity.',
        source: {
          path: 'src/app/components/alert.tsx',
          url: 'https://github.com/hirobius/hds/blob/main/src/app/components/alert.tsx',
        },
        story: {
          path: 'src/stories/alert.stories.tsx',
          id: 'primitives-alert--docs',
          url: 'https://github.com/hirobius/hds/blob/main/src/stories/alert.stories.tsx',
        },
      },
    ]);
  });

  it('reports a linked component the manifest has no source path for, instead of linking "undefined"', () => {
    const { links, problems } = collectDesignLinks({
      manifest: manifest({ Alert: { ...alertSpec, filePath: undefined } }),
      stories,
      config: CONFIG,
      packageName: '@hirobius/design-system',
    });
    expect(links).toEqual([]);
    expect(problems).toEqual([
      'Alert: has a Figma node but no filePath in public/hds-manifest.json (run pnpm manifest:generate).',
    ]);
  });

  it('points the story link at the deployed Storybook once storybookUrl is set', () => {
    const { links } = collectDesignLinks({
      manifest: manifest({ Alert: alertSpec }),
      stories,
      config: { ...CONFIG, storybookUrl: 'https://storybook.example.org/' },
      packageName: '@hirobius/design-system',
    });
    expect(links[0].story.url).toBe(
      'https://storybook.example.org/?path=/docs/primitives-alert--docs',
    );
  });

  it('reports every way the single source can be bypassed or broken', () => {
    const { problems } = collectDesignLinks({
      manifest: manifest({
        Alert: alertSpec,
        Card: { ...alertSpec, filePath: 'src/app/components/card.tsx' },
        Kbd: {
          figmaUrl: 'https://www.figma.com/design/AbC123/Name',
          filePath: 'src/app/components/kbd.tsx',
        },
      }),
      stories: [
        { path: 'src/stories/alert.stories.tsx', source: storySource({ call: '' }) },
        {
          path: 'src/stories/tag.stories.tsx',
          source: storySource({ component: 'Tag', call: "...designParameters('Tagg')," }),
        },
        {
          path: 'src/stories/hard.stories.tsx',
          source: `export default { title: 'X', component: Hard, parameters: { design: { url: '${ALERT_URL}' } } };`,
        },
      ],
      config: CONFIG,
      packageName: '@hirobius/design-system',
    });
    expect(problems).toEqual([
      'Card: has a Figma node but no story file whose meta component is Card.',
      'Kbd: figmaUrl is not a Figma node URL (…/design/<file>/<name>?node-id=<x>-<y>): https://www.figma.com/design/AbC123/Name',
      "src/stories/alert.stories.tsx: spread designParameters('Alert') into the meta parameters, so Storybook's Design tab shows the Figma node from the manifest.",
      'src/stories/hard.stories.tsx: hardcodes a Figma URL. Set the @figma JSDoc tag on the component and use designParameters() instead.',
      "src/stories/tag.stories.tsx: designParameters('Tagg') names no component in public/hds-manifest.json.",
    ]);
  });
});

describe('README section', () => {
  const links = collectDesignLinks({
    manifest: manifest({ Alert: alertSpec, Badge: { figmaUrl: null } }),
    stories: [{ path: 'src/stories/alert.stories.tsx', source: storySource() }],
    config: CONFIG,
    packageName: '@hirobius/design-system',
  });

  it('renders the coverage and one table row per linked component, between markers', () => {
    const section = renderReadmeSection(links);
    expect(section.startsWith(DESIGN_LINKS_START)).toBe(true);
    expect(section.trimEnd().endsWith(DESIGN_LINKS_END)).toBe(true);
    expect(section).toContain('## Design ↔ Code links');
    expect(section).toContain('**1 of 2** components');
    expect(section).toContain(
      `| \`Alert\` | [33:34](${ALERT_URL}) | [alert.stories.tsx](src/stories/alert.stories.tsx) | [alert.tsx](src/app/components/alert.tsx) |`,
    );
  });

  it('says so plainly when nothing links a Figma node', () => {
    const section = renderReadmeSection({ links: [], total: 5 });
    expect(section).toContain('**0 of 5** components');
    expect(section).not.toContain('| Component |');
  });

  it('replaces the marked section in place, or inserts it before "## Visual direction"', () => {
    const section = renderReadmeSection(links);
    const readme = '# HDS\n\n## Architecture\n\nText.\n\n## Visual direction: X\n\nMore.\n';
    const inserted = upsertReadmeSection(readme, section);
    expect(inserted).toBe(
      `# HDS\n\n## Architecture\n\nText.\n\n${section.trimEnd()}\n\n## Visual direction: X\n\nMore.\n`,
    );
    expect(upsertReadmeSection(inserted, section)).toBe(inserted);
    const stale = inserted.replace('**1 of 2**', '**9 of 9**');
    expect(upsertReadmeSection(stale, section)).toBe(inserted);
  });
});

describe('planDevResources', () => {
  const [alert] = collectDesignLinks({
    manifest: manifest({ Alert: alertSpec }),
    stories: [{ path: 'src/stories/alert.stories.tsx', source: storySource() }],
    config: CONFIG,
    packageName: '@hirobius/design-system',
  }).links;
  const node = { file_key: alert.fileKey, node_id: alert.nodeId };

  it('creates the source and story links a node does not have', () => {
    expect(planDevResources([alert], [])).toEqual({
      create: [
        { component: 'Alert', name: 'HDS source', url: alert.source.url, ...node },
        { component: 'Alert', name: 'HDS story', url: alert.story.url, ...node },
      ],
      update: [],
      unchanged: [],
    });
  });

  it('leaves a link whose URL is already on the node, whatever its name', () => {
    const existing = [{ id: 'r1', name: 'Code', url: alert.source.url, ...node }];
    expect(planDevResources([alert], existing)).toMatchObject({
      create: [{ name: 'HDS story' }],
      unchanged: [{ component: 'Alert', name: 'HDS source', id: 'r1' }],
    });
  });

  it('updates the URL of an HDS link that moved, and ignores other nodes', () => {
    const existing = [
      { id: 'r2', name: 'HDS story', url: 'https://old.example.org/story', ...node },
      {
        id: 'r3',
        name: 'HDS source',
        url: alert.source.url,
        file_key: alert.fileKey,
        node_id: '9:9',
      },
    ];
    expect(planDevResources([alert], existing)).toEqual({
      create: [{ component: 'Alert', name: 'HDS source', url: alert.source.url, ...node }],
      update: [{ component: 'Alert', id: 'r2', name: 'HDS story', url: alert.story.url }],
      unchanged: [],
    });
  });
});

// ── Descriptions script (Plugin API) ─────────────────────────────────────────
/**
 * An in-memory Figma file. With `normalizeMarkdown`, nodes have rich-text
 * descriptions (descriptionMarkdown) and figma.util.normalizeMarkdown exists,
 * as in the Plugin API; without it, nodes have a plain `description` only.
 */
function fakeFile(nodes, { normalizeMarkdown } = {}) {
  const byId = new Map(
    nodes.map((n) => [
      n.id,
      {
        documentationLinks: [],
        description: '',
        ...(normalizeMarkdown ? { descriptionMarkdown: n.description ?? '' } : {}),
        ...n,
        pluginData: new Map(),
      },
    ]),
  );
  const writes = [];
  const figma = {
    root: { name: 'HDS Tokens & Components' },
    getNodeByIdAsync: async (id) => {
      const n = byId.get(id);
      if (!n) return null;
      return new Proxy(n, {
        get(target, key) {
          if (key === 'getSharedPluginData') {
            return (namespace, name) => target.pluginData.get(`${namespace}:${name}`) ?? '';
          }
          if (key === 'setSharedPluginData') {
            return (namespace, name, value) => {
              writes.push([id, `pluginData ${namespace}:${name}`]);
              target.pluginData.set(`${namespace}:${name}`, value);
            };
          }
          return target[key];
        },
        set(target, key, value) {
          writes.push([id, key]);
          target[key] = value;
          if (key === 'descriptionMarkdown') target.description = value.replace(/\*\*/g, '');
          return true;
        },
      });
    },
    ...(normalizeMarkdown ? { util: { normalizeMarkdown } } : {}),
  };
  return { figma, byId, writes };
}
const run = async (script, figma) =>
  JSON.parse(
    JSON.stringify(await vm.runInNewContext(`(async () => {\n${script}\n})()`, { figma })),
  );

describe('buildDescriptionsScript', () => {
  const FILE_KEY = 'c8MaVgwxOlxm4wr8wnH0Z4';
  const linksWith = ({ spec = alertSpec, storybookUrl = null } = {}) =>
    collectDesignLinks({
      manifest: manifest({ Alert: spec }),
      stories: [{ path: 'src/stories/alert.stories.tsx', source: storySource() }],
      config: { ...CONFIG, storybookUrl },
      packageName: '@hirobius/design-system',
    }).links;
  const links = linksWith();
  const IMPORT_LINE = "import { Alert } from '@hirobius/design-system';";
  const componentSet = (patch = {}) => ({
    id: '33:34',
    type: 'COMPONENT_SET',
    name: 'Alert',
    ...patch,
  });

  it('keeps a hand-written description, adds the HDS block after it, and sets the story link; a second run changes nothing', async () => {
    const file = fakeFile([componentSet({ description: 'Hand-written usage guidance' })]);
    const report = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    expect(report.updated).toEqual([
      {
        component: 'Alert',
        node: 'Alert',
        changes: ['description', 'documentationLinks'],
        previousDescription: 'Hand-written usage guidance',
        previousLinks: [],
      },
    ]);
    const alert = file.byId.get('33:34');
    expect(alert.description).toBe(
      [
        'Hand-written usage guidance',
        '▼ HDS · generated by pnpm figma:links from the component JSDoc · edits inside this block are replaced',
        IMPORT_LINE,
        'Alert - compact feedback surface with contextual severity.',
        'Source: src/app/components/alert.tsx',
        '▲ HDS',
      ].join('\n\n'),
    );
    expect(alert.documentationLinks).toEqual([{ uri: links[0].story.url }]);

    file.writes.length = 0;
    const again = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    expect(again.unchanged).toEqual(['Alert']);
    expect(again.updated).toEqual([]);
    expect(file.writes).toEqual([]);
  });

  it('replaces only its own block when the JSDoc changes, keeping text before and after it', async () => {
    const file = fakeFile([componentSet({ description: 'Before' })]);
    await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    const alert = file.byId.get('33:34');
    alert.description += '\n\nAfter, added by a designer later';

    const changed = linksWith({
      spec: { ...alertSpec, description: 'Alert - rewritten summary.' },
    });
    await run(buildDescriptionsScript(changed, FILE_KEY), file.figma);
    expect(alert.description.startsWith('Before\n\n▼ HDS')).toBe(true);
    expect(alert.description.endsWith('▲ HDS\n\nAfter, added by a designer later')).toBe(true);
    expect(alert.description).toContain('Alert - rewritten summary.');
    expect(alert.description).not.toContain('compact feedback surface');
    expect(alert.description.split('▼ HDS')).toHaveLength(2);
  });

  it('keeps a documentation link it did not set and says so; replaces a link it set itself', async () => {
    const file = fakeFile([
      componentSet({ documentationLinks: [{ uri: 'https://docs.example.org/alert-usage' }] }),
    ]);
    const report = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    expect(file.byId.get('33:34').documentationLinks).toEqual([
      { uri: 'https://docs.example.org/alert-usage' },
    ]);
    expect(report.updated[0].changes).toEqual(['description']);
    expect(report.keptLinks).toEqual([
      'Alert: keeps its documentation link https://docs.example.org/alert-usage, which pnpm figma:links did not set (Figma holds one link). Remove it in Figma to get the story link.',
    ]);

    const own = fakeFile([componentSet()]);
    await run(buildDescriptionsScript(links, FILE_KEY), own.figma);
    expect(own.byId.get('33:34').documentationLinks).toEqual([{ uri: links[0].story.url }]);
    const deployed = linksWith({ storybookUrl: 'https://storybook.example.org' });
    const moved = await run(buildDescriptionsScript(deployed, FILE_KEY), own.figma);
    expect(moved.updated[0].changes).toEqual(['documentationLinks']);
    expect(moved.keptLinks).toEqual([]);
    expect(own.byId.get('33:34').documentationLinks).toEqual([{ uri: deployed[0].story.url }]);
  });

  it('refuses a node whose HDS block is damaged, writing nothing to it', async () => {
    for (const description of [
      'Notes\n\n▼ HDS · half a block',
      'Notes\n\n▲ HDS\n\n▼ HDS · generated',
      '▼ HDS one\n\n▲ HDS\n\n▼ HDS two\n\n▲ HDS',
    ]) {
      const file = fakeFile([componentSet({ description })]);
      const report = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
      expect(report.refused, description).toEqual([
        'Alert: its description has a damaged HDS block (the ▼ HDS and ▲ HDS lines must each appear once, in that order). Nothing was written to it: fix or delete the block in Figma, then run the script again.',
      ]);
      expect(file.writes, description).toEqual([]);
    }
  });

  it('keeps the plain description when descriptionMarkdown reads empty but description does not (a known Figma staleness bug)', async () => {
    const file = fakeFile(
      [componentSet({ description: 'Hand-written usage guidance', descriptionMarkdown: '' })],
      { normalizeMarkdown: (md) => md },
    );
    const report = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    expect(report.updated[0].changes).toEqual(['description', 'documentationLinks']);
    const alert = file.byId.get('33:34');
    expect(alert.description.startsWith('Hand-written usage guidance\n\n▼ HDS')).toBe(true);
    expect(file.writes.map(([, key]) => key)).not.toContain('descriptionMarkdown');
  });

  it('writes rich text through descriptionMarkdown, so formatting outside the block survives', async () => {
    const normalizeMarkdown = (md) => md.replace(/\n{3,}/g, '\n\n').trim();
    const file = fakeFile(
      [
        componentSet({
          description: 'Use for status, never errors',
          descriptionMarkdown: 'Use for **status**, never errors',
        }),
      ],
      { normalizeMarkdown },
    );
    const report = await run(buildDescriptionsScript(links, FILE_KEY), file.figma);
    expect(report.updated[0].changes).toEqual(['descriptionMarkdown', 'documentationLinks']);
    expect(report.updated[0].previousDescription).toBe('Use for **status**, never errors');
    const alert = file.byId.get('33:34');
    expect(alert.descriptionMarkdown.startsWith('Use for **status**, never errors\n\n▼ HDS')).toBe(
      true,
    );
    expect(alert.descriptionMarkdown).toContain(`\`${IMPORT_LINE}\``);
    expect(alert.descriptionMarkdown).toContain('Source: `src/app/components/alert.tsx`');
    expect(file.writes.map(([, key]) => key)).not.toContain('description');

    file.writes.length = 0;
    expect((await run(buildDescriptionsScript(links, FILE_KEY), file.figma)).unchanged).toEqual([
      'Alert',
    ]);
    expect(file.writes).toEqual([]);
  });

  it('a dry run reports what it would change and writes nothing', async () => {
    const file = fakeFile([componentSet({ description: 'Kept' })]);
    const script = buildDescriptionsScript(links, FILE_KEY, { dryRun: true });
    const report = await run(script, file.figma);
    expect(report.dryRun).toBe(true);
    expect(report.updated.map((u) => [u.component, u.previousDescription])).toEqual([
      ['Alert', 'Kept'],
    ]);
    expect(file.writes).toEqual([]);
    expect(file.byId.get('33:34').description).toBe('Kept');
  });

  it('reports a missing node and a node that is not a component, writing nothing to either', async () => {
    const onlyFrame = fakeFile([componentSet({ type: 'FRAME' })]);
    expect(
      (await run(buildDescriptionsScript(links, FILE_KEY), onlyFrame.figma)).notComponent,
    ).toEqual(['Alert: node 33:34 is a FRAME']);
    const empty = fakeFile([]);
    expect((await run(buildDescriptionsScript(links, FILE_KEY), empty.figma)).notFound).toEqual([
      'Alert: node 33:34',
    ]);
    expect([...onlyFrame.writes, ...empty.writes]).toEqual([]);
  });

  it('carries only the links of its own file, and refuses a payload changed in transit', async () => {
    const other = { ...links[0], name: 'Badge', fileKey: 'OtherFile', nodeId: '1:1' };
    const script = buildDescriptionsScript([...links, other], FILE_KEY);
    expect(script).not.toContain('OtherFile');
    const file = fakeFile([componentSet()]);
    await expect(run(script.replace('33:34', '33:35'), file.figma)).rejects.toThrow(
      /payload does not match its checksum/,
    );
    expect(file.writes).toEqual([]);
  });

  it('refuses a script whose code changed in transit, such as a retyped dry-run guard, before touching the file', async () => {
    const script = buildDescriptionsScript(links, FILE_KEY, { dryRun: true });
    const guard = 'if (!payload.dryRun) {';
    expect(script).toContain(guard);
    const file = fakeFile([componentSet({ description: 'Hand-written usage guidance' })]);
    await expect(run(script.replace(guard, 'if (true) {'), file.figma)).rejects.toThrow(
      /code does not match its checksum/,
    );
    expect(file.writes).toEqual([]);
    expect(file.byId.get('33:34').description).toBe('Hand-written usage guidance');
  });

  it('checks the source of every function it carries', async () => {
    const script = buildDescriptionsScript(links, FILE_KEY);
    for (const name of [
      'hdsChecksum',
      'hdsLinksVerifyCode',
      'hdsLinksBlock',
      'hdsLinksSplice',
      'hdsApplyDescriptions',
    ]) {
      const at = script.indexOf(`function ${name}(`);
      expect(at, name).toBeGreaterThan(-1);
      const body = script.indexOf('{', script.indexOf(')', at)) + 1;
      const tampered = `${script.slice(0, body)} ${script.slice(body)}`;
      const file = fakeFile([componentSet()]);
      await expect(run(tampered, file.figma), name).rejects.toThrow(
        /code does not match its checksum/,
      );
      expect(file.writes, name).toEqual([]);
    }
  });
});

// ── REST sync (dev resources) ────────────────────────────────────────────────
function fakeFigmaApi({ existing = [], status = 200, postErrors = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: init.headers,
      body: init.body && JSON.parse(init.body),
    });
    const json = (body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
    if (status >= 400) return json({ status, err: 'Forbidden' });
    if ((init.method ?? 'GET') === 'GET') return json({ dev_resources: existing });
    if (init.method === 'POST') return json({ links_created: [], errors: postErrors });
    return json({ links_updated: [], errors: [] });
  };
  return { calls, fetchImpl };
}

describe('syncDevResources', () => {
  const { links } = collectDesignLinks({
    manifest: manifest({ Alert: alertSpec }),
    stories: [{ path: 'src/stories/alert.stories.tsx', source: storySource() }],
    config: CONFIG,
    packageName: '@hirobius/design-system',
  });

  it('refuses without FIGMA_ACCESS_TOKEN, naming the variable, the scopes and where to create one', async () => {
    const api = fakeFigmaApi();
    await expect(syncDevResources({ links, token: '', fetchImpl: api.fetchImpl })).rejects.toThrow(
      /FIGMA_ACCESS_TOKEN is not set.*file_dev_resources:read.*file_dev_resources:write.*https:\/\/www\.figma\.com\/settings/s,
    );
    expect(api.calls).toEqual([]);
  });

  it('reads the nodes it links, then creates and updates only what differs', async () => {
    const api = fakeFigmaApi({
      existing: [
        {
          id: 'r2',
          name: 'HDS story',
          url: 'https://old.example.org',
          file_key: 'c8MaVgwxOlxm4wr8wnH0Z4',
          node_id: '33:34',
        },
      ],
    });
    const result = await syncDevResources({ links, token: 'tkn', fetchImpl: api.fetchImpl });
    expect(api.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://api.figma.com/v1/files/c8MaVgwxOlxm4wr8wnH0Z4/dev_resources?node_ids=33%3A34',
      'POST https://api.figma.com/v1/dev_resources',
      'PUT https://api.figma.com/v1/dev_resources',
    ]);
    expect(api.calls.every((c) => c.headers['X-Figma-Token'] === 'tkn')).toBe(true);
    expect(api.calls[1].body).toEqual({
      dev_resources: [
        {
          name: 'HDS source',
          url: links[0].source.url,
          file_key: 'c8MaVgwxOlxm4wr8wnH0Z4',
          node_id: '33:34',
        },
      ],
    });
    expect(api.calls[2].body).toEqual({
      dev_resources: [{ id: 'r2', name: 'HDS story', url: links[0].story.url }],
    });
    expect(result.line).toBe('dev resources: created 1 · updated 1 · unchanged 0');
    expect(result.errors).toEqual([]);
  });

  it('a dry run only reads', async () => {
    const api = fakeFigmaApi();
    const result = await syncDevResources({
      links,
      token: 'tkn',
      fetchImpl: api.fetchImpl,
      dryRun: true,
    });
    expect(api.calls.map((c) => c.method)).toEqual(['GET']);
    expect(result.line).toBe('dev resources (dry run): created 2 · updated 0 · unchanged 0');
  });

  it('explains a refused token and surfaces per-link errors', async () => {
    await expect(
      syncDevResources({ links, token: 'tkn', fetchImpl: fakeFigmaApi({ status: 403 }).fetchImpl }),
    ).rejects.toThrow(/HTTP 403.*file_dev_resources:write.*expired or revoked/s);
    const api = fakeFigmaApi({
      postErrors: [
        {
          file_key: 'c8MaVgwxOlxm4wr8wnH0Z4',
          node_id: '33:34',
          error: 'The node already has the maximum of 10 dev resources',
        },
      ],
    });
    const result = await syncDevResources({ links, token: 'tkn', fetchImpl: api.fetchImpl });
    expect(result.errors).toEqual(['33:34: The node already has the maximum of 10 dev resources']);
  });
});
