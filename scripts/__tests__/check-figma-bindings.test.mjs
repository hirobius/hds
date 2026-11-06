/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-bindings.mjs: which component.* variables the
 * library's components bind (figma/bindings.json, a read-only use_figma snapshot),
 * compared with what the code binds (check-component-token-binding).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bindingTargets,
  buildBindingsScript,
  ingestBindings,
  compareBindings,
} from '../check-figma-bindings.mjs';
import { hdsChecksum } from '../lib/figma-runtime.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('check-figma-bindings', () => {
  it('targets each mapped token group at its Figma component sets', () => {
    const t = Object.fromEntries(bindingTargets().map((x) => [x.group, x.nodeIds]));
    // Button reads the parity sets, not the deprecated 576-variant 28:138 in its @figma tag.
    expect(t.button).toEqual(['2399:11077', '2399:26744']);
    expect(t.tag).toEqual(['32:11']);
    expect(t.disclosure).toEqual(['88:453']);
    expect(t.nav).toBeUndefined();
  });

  it('the snapshot script reads the library only and writes nothing', () => {
    const s = buildBindingsScript();
    expect(s.length).toBeLessThan(40000);
    expect(s).toContain('Refused: this is not the HDS library');
    expect(s).toContain("'2399:26744'");
    expect(s).not.toMatch(/\.(set\w+|remove|createComponent|appendChild)\(/);
  });

  it('ingest verifies the checksum', () => {
    const bindings = { '32:11': { name: 'Tag', variables: ['tag/background'] } };
    const ok = ingestBindings({ bindings, checksum: hdsChecksum(JSON.stringify(bindings)) });
    expect(ok.bindings).toEqual(bindings);
    expect(() => ingestBindings({ bindings, checksum: '00000000' })).toThrow(/Checksum/);
  });

  it('classifies each token: both, code only, Figma only, neither', () => {
    const targets = [{ group: 'tag', nodeIds: ['32:11'] }];
    const code = [
      { id: 'tag.background', group: 'tag', class: 'BOUND' },
      { id: 'tag.text', group: 'tag', class: 'BOUND' },
      { id: 'tag.border', group: 'tag', class: 'UNUSED' },
      { id: 'tag.radius', group: 'tag', class: 'UNUSED' },
    ];
    const bindings = {
      '32:11': { name: 'Tag', variables: ['tag/background', 'tag/border'] },
    };
    const rows = compareBindings(code, bindings, targets);
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      ['tag.background', 'both'],
      ['tag.border', 'figma-only'],
      ['tag.radius', 'neither'],
      ['tag.text', 'code-only'],
    ]);
  });

  it('a group whose Figma set is not in the snapshot is reported, not guessed', () => {
    const rows = compareBindings([{ id: 'tag.background', group: 'tag', class: 'BOUND' }], {}, [
      { group: 'tag', nodeIds: ['32:11'] },
    ]);
    expect(rows[0].status).toBe('not-snapshotted');
  });

  it('the committed figma/bindings.json, when present, has a valid checksum', () => {
    const p = path.join(REPO, 'figma/bindings.json');
    if (!existsSync(p)) return;
    const f = JSON.parse(readFileSync(p, 'utf8'));
    expect(ingestBindings(f).checksum).toBe(f.checksum);
  });
});
