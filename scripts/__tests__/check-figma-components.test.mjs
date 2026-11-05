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
    expect(json(path.join(REPO, 'figma/contracts/Button.json'))).toEqual(contract);
  });

  it('contract encodes the condensed shape', () => {
    expect(Object.keys(contract.variantAxes).sort()).toEqual(['Size', 'State', 'Variant']);
    expect(contract.variantAxes.State.values).toEqual(['rest', 'hover', 'pressed', 'disabled']);
    expect(contract.variantCount).toBe(48);
    expect(Object.keys(contract.booleans)).toEqual(expect.arrayContaining(['Loading', 'Focus']));
    expect(contract.modeCollections['Button tone'].modes).toContain('quiet');
  });

  // Owner decision 2026-11-05: icon-only buttons are their own IconButton component.
  it('Button has no icon-only property; link keeps zero inline padding', () => {
    expect(Object.keys(contract.booleans)).not.toContain('Icon only');
    expect(JSON.stringify(contract)).not.toContain('iconOnly');
    expect(contract.zeroPaddingXVariants).toEqual(['link']);
  });

  describe('IconButton contract', () => {
    const icon = buildContract('IconButton');

    it('committed IconButton contract is what code generates', () => {
      expect(json(path.join(REPO, 'figma/contracts/IconButton.json'))).toEqual(icon);
    });

    it('is Variant [primary, secondary, tertiary] x Size x State, no link', () => {
      expect(icon.variantAxes.Variant.values).toEqual(['primary', 'secondary', 'tertiary']);
      expect(icon.variantAxes.Size.values).toEqual(['sm', 'md', 'lg']);
      expect(icon.variantAxes.State.values).toEqual(['rest', 'hover', 'pressed', 'disabled']);
      expect(icon.variantCount).toBe(36);
    });

    it('has Focus and Loading booleans, an Icon instance swap and the Button tone modes', () => {
      expect(Object.keys(icon.booleans).sort()).toEqual(['Focus', 'Loading']);
      expect(Object.keys(icon.instanceSwaps)).toEqual(['Icon']);
      expect(icon.texts).toEqual({});
      expect(icon.modeCollections).toEqual(contract.modeCollections);
    });

    it('binds a square root to size height, padding 0, and the Icon layer to iconSize', () => {
      for (const s of ['sm', 'md', 'lg']) {
        expect(icon.sizeBindings[s]).toEqual({
          'root.width': `button/size/${s}/height`,
          'root.height': `button/size/${s}/height`,
          'Icon.width': `button/size/${s}/iconSize`,
          'Icon.height': `button/size/${s}/iconSize`,
        });
      }
      expect(icon.rootPadding).toBe(0);
    });

    it('a Figma IconButton with padding fails the diff; no snapshot script before it is drawn', () => {
      const snap = {
        variantAxes: {
          Variant: icon.variantAxes.Variant.values,
          Size: icon.variantAxes.Size.values,
          State: icon.variantAxes.State.values,
        },
        variantCount: 36,
        booleans: { Focus: false, Loading: false },
        instanceSwaps: { Icon: true },
        texts: {},
        modeCollections: { 'Button tone': icon.modeCollections['Button tone'].modes },
        sizeBindings: Object.fromEntries(
          Object.entries(icon.sizeBindings).map(([s, f]) => [
            s,
            Object.fromEntries(Object.entries(f).map(([k, v]) => [k, [v]])),
          ]),
        ),
        rootPadding: 0,
      };
      expect(diffContract(icon, snap)).toEqual([]);
      expect(diffContract(icon, { ...snap, rootPadding: 8 })).toEqual([
        'root padding: contract 0, Figma 8',
      ]);
      expect(() => buildSnapshotScript('IconButton')).toThrow(/not drawn/);
    });
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
