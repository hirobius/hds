/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/figma-inventory.mjs.
 *
 * The fixture mirrors the real shape of `GET /v1/files/:key?depth=2` for this
 * library, including the two structures that broke every earlier attempt to
 * enumerate it: a component set wrapped in a same-named frame (Button lives in
 * a frame called "Button" on a page called "Button"), and a page of bare
 * components with no set at all (Icon).
 */

import { describe, it, expect, vi } from 'vitest';
import { parseDocument, mappedNodes, coverage, fetchFile } from '../lib/figma-inventory.mjs';

const FILE_KEY = 'c8MaVgwxOlxm4wr8wnH0Z4';

/** Shaped after the real document; ids are the ones verified on 2026-09-20. */
const FILE = {
  name: 'HDS Tokens & Components',
  document: {
    id: '0:0',
    type: 'DOCUMENT',
    children: [
      {
        id: '0:1',
        name: 'Cover',
        type: 'CANVAS',
        children: [
          {
            id: '22:2',
            name: 'CoverCard',
            type: 'FRAME',
            children: [{ id: '22:4', type: 'TEXT' }],
          },
        ],
      },
      {
        // The wrapper case: page "Button" → frame "Button" → the set.
        id: '28:2',
        name: 'Button',
        type: 'CANVAS',
        children: [
          {
            id: '28:137',
            name: 'Button',
            type: 'FRAME',
            children: [
              {
                id: '28:138',
                name: 'Button',
                type: 'COMPONENT_SET',
                children: [
                  { id: '28:3', name: 'Variant=Primary', type: 'COMPONENT' },
                  { id: '28:8', name: 'Variant=Secondary', type: 'COMPONENT' },
                ],
              },
            ],
          },
          { id: '62:2', name: 'Text', type: 'TEXT' },
        ],
      },
      {
        // The bare-components case: an icon sheet, no set.
        id: '27:2',
        name: 'Icon',
        type: 'CANVAS',
        children: [
          { id: '27:5', name: 'Icon/check', type: 'COMPONENT' },
          { id: '27:9', name: 'Icon/x', type: 'COMPONENT' },
          { id: '27:43', name: 'Authentic Lucide geometry', type: 'TEXT' },
        ],
      },
      {
        id: '33:2',
        name: 'Alert',
        type: 'CANVAS',
        children: [
          {
            id: '33:34',
            name: 'Alert',
            type: 'COMPONENT_SET',
            children: [{ id: '33:3', name: 'Tone=info', type: 'COMPONENT' }],
          },
        ],
      },
    ],
  },
};

describe('parseDocument', () => {
  it('finds a component set nested inside a wrapper frame', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    const button = inventory.pages.find((page) => page.name === 'Button');
    expect(button.assets).toEqual([
      { id: '28:138', name: 'Button', type: 'COMPONENT_SET', variantCount: 2 },
    ]);
  });

  it('does not treat a set’s variants as separate assets', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    const ids = inventory.pages.flatMap((page) => page.assets.map((a) => a.id));
    expect(ids).not.toContain('28:3');
    expect(ids).not.toContain('28:8');
  });

  it('collects bare components on a page with no set', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    const icons = inventory.pages.find((page) => page.name === 'Icon');
    expect(icons.assets.map((a) => a.name)).toEqual(['Icon/check', 'Icon/x']);
    expect(icons.assets.every((a) => a.variantCount === 1)).toBe(true);
  });

  it('classifies an all-Icon/* page as an icon sheet, not a components page', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    expect(inventory.pages.find((page) => page.name === 'Icon').kind).toBe('icons');
  });

  it('marks a page carrying no components as a doc page', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    const cover = inventory.pages.find((page) => page.name === 'Cover');
    expect(cover.kind).toBe('doc');
    expect(cover.assets).toEqual([]);
    expect(inventory.pages.find((page) => page.name === 'Button').kind).toBe('components');
  });

  it('carries the file key and name through', () => {
    const inventory = parseDocument(FILE, FILE_KEY);
    expect(inventory.fileKey).toBe(FILE_KEY);
    expect(inventory.fileName).toBe('HDS Tokens & Components');
  });

  it('refuses a body that is not a files response', () => {
    expect(() => parseDocument({ err: 'nope' }, FILE_KEY)).toThrow(/no `document`/);
  });
});

describe('mappedNodes', () => {
  it('normalises the URL dash form to the colon form Figma uses everywhere else', () => {
    const manifest = {
      componentSpecs: {
        Button: {
          figmaUrl: `https://www.figma.com/design/${FILE_KEY}/HDS?node-id=28-138`,
        },
      },
    };
    expect(mappedNodes(manifest).get('28:138')).toBe('Button');
  });

  it('ignores specs with no figmaUrl and URLs with no node-id', () => {
    const manifest = {
      componentSpecs: {
        Untagged: { figmaUrl: null },
        FileOnly: { figmaUrl: `https://www.figma.com/design/${FILE_KEY}/HDS` },
      },
    };
    expect(mappedNodes(manifest).size).toBe(0);
  });
});

describe('coverage', () => {
  const inventory = parseDocument(FILE, FILE_KEY);

  it('reports every Figma asset the code does not point at', () => {
    const manifest = {
      componentSpecs: {
        Button: { figmaUrl: `https://www.figma.com/design/${FILE_KEY}/HDS?node-id=28-138` },
      },
    };
    const report = coverage(inventory, manifest);
    // Button set + Alert set. The 2 icons are an icon sheet, not a components
    // page, so they are inventoried without being policed.
    expect(report.total).toBe(2);
    expect(report.mapped).toBe(1);
    expect(report.unmapped.map((u) => u.name)).toEqual(['Alert']);
  });

  it('never reports an icon sheet as a coverage gap', () => {
    const report = coverage(inventory, { componentSpecs: {} });
    expect(report.unmapped.some((u) => u.name.startsWith('Icon/'))).toBe(false);
  });

  it('names the page each gap is on, so the finding is actionable', () => {
    const report = coverage(inventory, { componentSpecs: {} });
    expect(report.unmapped.find((u) => u.name === 'Alert').page).toBe('Alert');
  });

  it('is clean when every asset is mapped', () => {
    const manifest = {
      componentSpecs: Object.fromEntries(
        inventory.pages
          .filter((page) => page.kind === 'components')
          .flatMap((page) => page.assets)
          .map((asset, i) => [
            `C${i}`,
            {
              figmaUrl: `https://www.figma.com/design/${FILE_KEY}/HDS?node-id=${asset.id.replace(':', '-')}`,
            },
          ]),
      ),
    };
    const report = coverage(inventory, manifest);
    expect(report.unmapped).toEqual([]);
    expect(report.mapped).toBe(report.total);
  });
});

describe('fetchFile', () => {
  it('names every accepted variable and the fix when no token is set', async () => {
    // Both names, because reading only FIGMA_ACCESS_TOKEN while the environment
    // supplied FIGMA_API_KEY is the bug scripts/lib/figma-token.mjs exists for.
    const call = fetchFile({ fileKey: FILE_KEY, token: '' });
    await expect(call).rejects.toThrow(/FIGMA_ACCESS_TOKEN or FIGMA_API_KEY/);
    await expect(call).rejects.toThrow(/file_content:read/);
  });

  it('sends the token as X-Figma-Token and asks for depth 2', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => FILE });
    await fetchFile({ fileKey: FILE_KEY, token: 'tok', fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`https://api.figma.com/v1/files/${FILE_KEY}?depth=2`);
    expect(init.headers['X-Figma-Token']).toBe('tok');
  });

  it('explains a 403 as a scope or expiry problem, not a bare status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(fetchFile({ fileKey: FILE_KEY, token: 'tok', fetchImpl })).rejects.toThrow(
      /expired, revoked, or lacks the `file_content:read` scope/,
    );
  });

  it('tells you not to retry a 429, because the call is already one per run', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchFile({ fileKey: FILE_KEY, token: 'tok', fetchImpl })).rejects.toThrow(
      /wait rather than retry/,
    );
  });
});
