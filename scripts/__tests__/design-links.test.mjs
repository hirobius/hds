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
function fakeFile(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, { documentationLinks: [], description: '', ...n }]));
  const writes = [];
  const figma = {
    root: { name: 'HDS Tokens & Components' },
    getNodeByIdAsync: async (id) => {
      const n = byId.get(id);
      if (!n) return null;
      return new Proxy(n, {
        set(target, key, value) {
          writes.push([id, key]);
          target[key] = value;
          return true;
        },
      });
    },
  };
  return { figma, byId, writes };
}
const run = async (script, figma) =>
  JSON.parse(
    JSON.stringify(await vm.runInNewContext(`(async () => {\n${script}\n})()`, { figma })),
  );

describe('buildDescriptionsScript', () => {
  const { links } = collectDesignLinks({
    manifest: manifest({ Alert: alertSpec }),
    stories: [{ path: 'src/stories/alert.stories.tsx', source: storySource() }],
    config: CONFIG,
    packageName: '@hirobius/design-system',
  });

  it('sets the import line, description and documentation link on the component set, once', async () => {
    const file = fakeFile([
      { id: '33:34', type: 'COMPONENT_SET', name: 'Alert', description: 'old' },
    ]);
    const report = await run(buildDescriptionsScript(links, 'c8MaVgwxOlxm4wr8wnH0Z4'), file.figma);
    expect(report.updated).toEqual([
      { component: 'Alert', node: 'Alert', previousDescription: 'old', previousLinks: [] },
    ]);
    const alert = file.byId.get('33:34');
    expect(alert.description.split('\n')[0]).toBe(
      "import { Alert } from '@hirobius/design-system';",
    );
    expect(alert.description).toContain('compact feedback surface');
    expect(alert.documentationLinks).toEqual([{ uri: links[0].story.url }]);

    file.writes.length = 0;
    const again = await run(buildDescriptionsScript(links, 'c8MaVgwxOlxm4wr8wnH0Z4'), file.figma);
    expect(again.unchanged).toEqual(['Alert']);
    expect(file.writes).toEqual([]);
  });

  it('a dry run reports what it would change and writes nothing', async () => {
    const file = fakeFile([{ id: '33:34', type: 'COMPONENT_SET', name: 'Alert' }]);
    const script = buildDescriptionsScript(links, 'c8MaVgwxOlxm4wr8wnH0Z4', { dryRun: true });
    const report = await run(script, file.figma);
    expect(report.dryRun).toBe(true);
    expect(report.updated.map((u) => u.component)).toEqual(['Alert']);
    expect(file.writes).toEqual([]);
  });

  it('reports a missing node and a node that is not a component, writing nothing to either', async () => {
    const onlyFrame = fakeFile([{ id: '33:34', type: 'FRAME', name: 'Alert' }]);
    expect(
      (await run(buildDescriptionsScript(links, 'c8MaVgwxOlxm4wr8wnH0Z4'), onlyFrame.figma))
        .notComponent,
    ).toEqual(['Alert: node 33:34 is a FRAME']);
    const empty = fakeFile([]);
    expect(
      (await run(buildDescriptionsScript(links, 'c8MaVgwxOlxm4wr8wnH0Z4'), empty.figma)).notFound,
    ).toEqual(['Alert: node 33:34']);
    expect([...onlyFrame.writes, ...empty.writes]).toEqual([]);
  });

  it('carries only the links of its own file, and refuses a payload changed in transit', async () => {
    const other = { ...links[0], name: 'Badge', fileKey: 'OtherFile', nodeId: '1:1' };
    const script = buildDescriptionsScript([...links, other], 'c8MaVgwxOlxm4wr8wnH0Z4');
    expect(script).not.toContain('OtherFile');
    const file = fakeFile([{ id: '33:34', type: 'COMPONENT_SET', name: 'Alert' }]);
    await expect(run(script.replace('33:34', '33:35'), file.figma)).rejects.toThrow(
      /does not match its checksum/,
    );
    expect(file.writes).toEqual([]);
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
