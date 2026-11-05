/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-components.mjs: the Button contract is generated
 * from code, a snapshot of the condensed Figma shape passes, and today's committed
 * 576-variant snapshot fails listing every difference.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContract,
  diffContract,
  buildSnapshotScript,
  ingestResult,
  run,
} from '../check-figma-components.mjs';
import { hdsChecksum } from '../lib/figma-runtime.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIX = path.join(REPO, 'fixtures/check-figma-components');
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const contract = buildContract('Button');

describe('check-figma-components', () => {
  it('committed contract is what code generates', () => {
    expect(readFileSync(path.join(REPO, 'figma/contracts/Button.json'), 'utf8')).toBe(
      JSON.stringify(contract, null, 2) + '\n',
    );
  });

  it('contract encodes the condensed shape', () => {
    expect(Object.keys(contract.variantAxes).sort()).toEqual(['Size', 'State', 'Variant']);
    expect(contract.variantAxes.State.values).toEqual(['rest', 'hover', 'pressed', 'disabled']);
    expect(contract.variantCount).toBe(48);
    expect(Object.keys(contract.booleans)).toEqual(
      expect.arrayContaining(['Icon only', 'Loading', 'Focus']),
    );
    expect(contract.modeCollections['Button tone'].modes).toContain('quiet');
  });

  it('pass fixture has no differences', () => {
    expect(diffContract(contract, json(path.join(FIX, 'pass.snapshot.json')))).toEqual([]);
  });

  it('fail fixture lists each difference', () => {
    const d = diffContract(contract, json(path.join(FIX, 'fail.snapshot.json')));
    expect(d).toEqual([
      'variant axis "State" values differ: contract [rest, hover, pressed, disabled], Figma [rest, hover, pressed, disabled, loading]',
      'variant count: contract 48, Figma 60',
      'boolean property "Loading" (code: loading) is missing',
      'collection "Button tone" modes: contract [neutral, quiet, danger, success, warning, info], Figma [neutral, danger]',
      'Size=md root.height binding: contract button/size/md/height, Figma (unbound)',
    ]);
  });

  it('the real committed Button snapshot fails today', () => {
    const snap = json(path.join(REPO, 'figma/components/Button.snapshot.json')).snapshot;
    const d = diffContract(contract, snap);
    expect(d).toContain('variant count: contract 48, Figma 576');
    expect(d).toContain('variable-mode collection "Button tone" (code: tone) is missing');
    const lines = [];
    expect(run(['--check'], { log: () => {}, error: (l) => lines.push(l) })).toBe(1);
    expect(run(['--report'], { log: () => {}, error: () => {} })).toBe(0);
  });

  it('snapshot script stays under 40k chars and reads the library only', () => {
    const s = buildSnapshotScript('Button');
    expect(s.length).toBeLessThan(40000);
    expect(s).toContain('Refused: this is not the HDS library');
    expect(s).not.toMatch(/\.(set\w+|remove|createComponent|appendChild)\(/);
  });

  it('ingest verifies the checksum and passes unchanged through', () => {
    const snapshot = json(path.join(FIX, 'pass.snapshot.json'));
    const ok = ingestResult({ snapshot, checksum: hdsChecksum(JSON.stringify(snapshot)) });
    expect(ok.snapshot).toEqual(snapshot);
    expect(() => ingestResult({ snapshot, checksum: '00000000' })).toThrow(/Checksum/);
    expect(ingestResult({ unchanged: true, checksum: 'x' })).toBeNull();
  });
});
