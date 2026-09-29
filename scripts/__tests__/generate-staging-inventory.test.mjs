/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-staging-inventory renders figma/STAGING-INVENTORY.md from
 * figma/staging-inventory.json. Seam: the exported renderStagingInventory(data,
 * fileKey) — the CLI only reads the two files and writes/compares its result.
 *
 * hds#317: agent edits to a set that already exists in the library (Button,
 * IconButton gaining Focus/Pressed) are not "components drawn in staging", so
 * they get their own optional `statesAdded` block and their own section.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderStagingInventory } from '../generate-staging-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KEY = '2VgBbVpKiDnu0aftJEVyBQ';

const base = {
  fileKey: KEY,
  drawnOn: '2026-09-23',
  components: { Kbd: { kind: 'set', variants: 3, node: '2026-9' } },
  drawnEarlier: { StatusDot: { kind: 'set', variants: 1, node: '2003-2' } },
};

describe('renderStagingInventory', () => {
  it('renders a drawn component as a linked table row', () => {
    const md = renderStagingInventory(base, KEY);
    expect(md).toContain(
      `| [Kbd](https://www.figma.com/design/${KEY}/?node-id=2026-9) | set | 3 | \`2026-9\` |`,
    );
  });

  it('omits the states-added section when the data has no statesAdded block', () => {
    expect(renderStagingInventory(base, KEY)).not.toContain('States added to library sets');
  });

  it('lists states added to an existing library set with its staging link and new variant count', () => {
    const md = renderStagingInventory(
      {
        ...base,
        statesAdded: {
          drawnOn: '2026-09-29',
          components: {
            Button: {
              kind: 'set',
              variants: 126,
              node: '28-138',
              states: ['Focus', 'Pressed'],
              newNodes: ['2053-23', '2053-27'],
            },
          },
        },
      },
      KEY,
    );
    expect(md).toContain('## States added to library sets (2026-09-29)');
    expect(md).toContain(
      `| [Button](https://www.figma.com/design/${KEY}/?node-id=28-138) | Focus, Pressed | 2 | 126 | \`28-138\` |`,
    );
  });

  it('matches the committed markdown for the committed data', () => {
    const data = JSON.parse(readFileSync(path.join(ROOT, 'figma/staging-inventory.json'), 'utf8'));
    const committed = readFileSync(path.join(ROOT, 'figma/STAGING-INVENTORY.md'), 'utf8');
    expect(renderStagingInventory(data, data.fileKey)).toBe(committed);
  });
});
