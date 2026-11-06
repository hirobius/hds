/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-components.mjs: the Button contract is generated
 * from code, a snapshot of the condensed Figma shape passes, and today's committed
 * 576-variant snapshot fails listing every difference.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import os from 'node:os';
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

    it('a Figma IconButton with padding fails the diff', () => {
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
    });

    it('snapshot script reads the square root, the Icon layer and the root padding', () => {
      const s = buildSnapshotScript('IconButton');
      expect(s.length).toBeLessThan(40000);
      expect(s).toContain("'2399:26744'");
      expect(s).toContain("for (const f of ['width', 'height']) add(size, 'root.' + f");
      expect(s).toContain("n.name === 'Icon'");
      expect(s).toContain('snap.rootPadding');
      // paddingTop draws the hover/press face sink, so it is not part of the padding check.
      expect(s).toContain('[v.paddingRight, v.paddingBottom, v.paddingLeft]');
      expect(s).not.toContain('Lead Icon');
      expect(s).not.toMatch(/\.(set\w+|remove|createComponent|appendChild)\(/);
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

  it('the committed Button and IconButton snapshots match their contracts (hds#1147)', () => {
    for (const n of ['Button', 'IconButton']) {
      const snap = json(path.join(REPO, `figma/components/${n}.snapshot.json`)).snapshot;
      expect(diffContract(buildContract(n), snap), n).toEqual([]);
    }
    expect(run(['--check'], { log: () => {}, error: () => {} })).toBe(0);
  });

  it('--check fails and --report passes when Figma drifts', () => {
    // A repo-shaped root: real sources and contracts, Button's snapshot swapped for the fail fixture.
    const root = mkdtempSync(path.join(os.tmpdir(), 'figma-components-'));
    for (const f of [
      'src/app/components/button.tsx',
      'figma/spec-sheets/Button.json',
      'figma/contracts/Button.json',
      'figma/contracts/IconButton.json',
      'figma/components/IconButton.snapshot.json',
    ]) {
      mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
      cpSync(path.join(REPO, f), path.join(root, f));
    }
    writeFileSync(
      path.join(root, 'figma/components/Button.snapshot.json'),
      JSON.stringify({ checksum: 'x', snapshot: json(path.join(FIX, 'fail.snapshot.json')) }),
    );
    const lines = [];
    expect(run(['--check', '--root', root], { log: () => {}, error: (l) => lines.push(l) })).toBe(
      1,
    );
    expect(lines.join('\n')).toMatch(/Button: Figma differs from the code contract \(5\)/);
    expect(run(['--report', '--root', root], { log: () => {}, error: () => {} })).toBe(0);
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
