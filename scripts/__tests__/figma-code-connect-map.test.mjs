import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  codeConnectMap,
  mapFile,
  mappingsPayload,
  usageSnippet,
} from '../lib/figma-code-connect-map.mjs';

const links = { repository: 'https://github.com/o/r', branch: 'main', libraryFileKey: 'K' };
const barrels = {
  root: "export * from './app/components/alert';\nexport * from './app/components/sheet';",
  patterns: "export * from './app/components/page-header';",
};
const manifest = {
  componentSpecs: {
    Alert: {
      filePath: 'src/app/components/alert.tsx',
      figmaUrl: 'https://www.figma.com/design/K/HDS?node-id=33-34',
      props: { children: {}, title: { type: 'string' } },
      requiredProps: ['title'],
    },
    PageHeader: {
      filePath: 'src/app/components/page-header.tsx',
      figmaUrl: 'https://www.figma.com/design/K/HDS?node-id=2121-3',
    },
    SheetTrigger: { filePath: null },
    Lost: { filePath: 'src/app/components/lost.tsx' },
    Old: { filePath: 'src/app/components/old.tsx', deprecated: 'Use Alert.' },
  },
};
const disposition = {
  components: ['Alert', 'PageHeader', 'SheetTrigger', 'Lost', 'Old', 'Box'].map((name) => ({
    name,
    class: name === 'Box' ? 'layout' : 'library',
  })),
};
const overrides = {
  overrides: [
    {
      nodeId: '2265:3',
      name: 'SheetTrigger',
      mapsTo: 'Sheet.Trigger',
      source: 'src/app/components/sheet.tsx',
    },
  ],
};
const exists = (p) => !p.endsWith('lost.tsx');
const build = () => codeConnectMap({ manifest, disposition, overrides, links, barrels, exists });

describe('figma-code-connect-map', () => {
  it('maps each library component to its node, source, import and usage', () => {
    const { entries } = build();
    const by = Object.fromEntries(entries.map((e) => [e.name, e]));
    expect(by.Alert).toEqual({
      name: 'Alert',
      nodeId: '33:34',
      componentName: 'Alert',
      source: 'src/app/components/alert.tsx',
      sourceUrl: 'https://github.com/o/r/blob/main/src/app/components/alert.tsx',
      import: "import { Alert } from '@hirobius/design-system';",
      snippet: '<Alert title="…">…</Alert>',
    });
    expect(by.PageHeader.import).toBe(
      "import { PageHeader } from '@hirobius/design-system/patterns';",
    );
    // A tagless part takes its node and code name from figma/mapping-overrides.json.
    expect(by.SheetTrigger).toMatchObject({
      nodeId: '2265:3',
      componentName: 'Sheet.Trigger',
      import: "import { Sheet } from '@hirobius/design-system';",
      snippet: '<Sheet.Trigger />',
    });
    expect(entries.map((e) => e.name)).not.toContain('Box');
  });
  it('reports a library component with no node or no source, and exempts deprecated ones', () => {
    const { missing, exempt } = build();
    expect(exempt).toEqual([{ name: 'Old', reason: 'deprecated' }]);
    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe('Lost');
    expect(missing[0].why.join(' ')).toMatch(/no Figma node.*does not exist/);
  });
  it('builds the send_code_connect_mappings payload', () => {
    const payload = mappingsPayload(mapFile(build(), 'K'));
    expect(payload[0]).toEqual({
      nodeId: '33:34',
      componentName: 'Alert',
      source: 'https://github.com/o/r/blob/main/src/app/components/alert.tsx',
      label: 'React',
    });
  });
  it('writes self-closing usage when the component takes no children', () => {
    expect(
      usageSnippet('Icon', { requiredProps: ['icon'], props: { icon: { type: 'LucideIcon' } } }),
    ).toBe('<Icon icon={…} />');
  });
  it('the committed map is fresh and every repo library component is mapped', () => {
    const out = execFileSync('node', [path.resolve('scripts/check-code-connect-map.mjs')], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/library components mapped to code/);
  });
});
