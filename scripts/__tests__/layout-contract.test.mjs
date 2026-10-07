import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContract,
  evaluateMeasurement,
  summarize,
  validateContract,
} from '../lib/layout-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));
const contractFile = JSON.parse(
  readFileSync(path.join(ROOT, 'docs/guardrails/layout-contract.json'), 'utf8'),
);

const clean = {
  probeWidth: 480,
  probeHeight: 800,
  width: 480,
  height: 100,
  contentExtent: 100,
  wideWidth: 480,
  margins: [],
  nested: [],
  gaps: [],
  siblingControlWidths: [],
  overflow390: 0,
};

describe('layout contract: data file', () => {
  it('is valid against the schema', () => {
    expect(validateContract(contractFile)).toEqual([]);
  });

  it('declares every manifest component', () => {
    const missing = manifest.componentInventory.filter((n) => !contractFile.components[n]);
    expect(missing).toEqual([]);
  });

  it('is what the generator produces (no hand edits to generated fields)', () => {
    expect(buildContract(manifest.componentInventory).components).toEqual(contractFile.components);
  });

  it('encodes the approved fill list and height=hug everywhere', () => {
    for (const n of ['Input', 'Textarea', 'Select', 'Combobox', 'Table', 'Progress', 'Divider']) {
      expect(contractFile.components[n].width).toBe('fill');
    }
    for (const n of ['Button', 'Badge', 'Tag', 'Kbd', 'Avatar', 'Checkbox']) {
      expect(contractFile.components[n].width).toBe('hug');
    }
    for (const e of Object.values(contractFile.components)) expect(e.height).toBe('hug');
    for (const n of ['Card', 'Surface', 'Alert', 'Dialog', 'Page']) {
      expect(contractFile.components[n].pads).toBe(true);
    }
    expect(contractFile.components.Input.maxWidth).toBe('40rem');
  });
});

describe('layout contract: validateContract', () => {
  it('rejects bad entries', () => {
    const bad = {
      version: 1,
      components: {
        A: { width: 'wide', height: 'hug', pads: true, kind: 'leaf', probe: true },
        B: { width: 'fill', height: 'fill', pads: 'yes', kind: 'leaf', probe: true },
      },
    };
    expect(validateContract(bad).length).toBeGreaterThanOrEqual(3);
  });
});

describe('layout contract: evaluateMeasurement', () => {
  const hug = { width: 'hug', height: 'hug', pads: false, kind: 'leaf', probe: true };
  const fill = { ...hug, width: 'fill' };

  it('passes a conforming measurement', () => {
    expect(evaluateMeasurement(fill, clean)).toEqual([]);
    expect(evaluateMeasurement(hug, { ...clean, width: 90, wideWidth: 90 })).toEqual([]);
  });

  it('flags width that disagrees with the contract in both directions', () => {
    expect(evaluateMeasurement(hug, clean).map((v) => v.rule)).toEqual(['width']);
    expect(evaluateMeasurement(fill, { ...clean, width: 90 }).map((v) => v.rule)).toEqual([
      'width',
    ]);
  });

  it('flags height stretch only while content is shorter', () => {
    const stretched = { ...clean, height: 800, contentExtent: 120 };
    expect(evaluateMeasurement(fill, stretched).map((v) => v.rule)).toContain('height-stretch');
    const tall = { ...clean, height: 800, contentExtent: 800 };
    expect(evaluateMeasurement(fill, tall).map((v) => v.rule)).not.toContain('height-stretch');
  });

  it('flags margins, nested padding, off-scale gaps, sibling widths and overflow', () => {
    const m = {
      ...clean,
      margins: [{ el: 'div.a', margin: '0 0 24px 0' }],
      nested: [{ outer: 'div.card', inner: 'div.header' }],
      gaps: [{ el: 'div.row', gap: '12px' }],
      siblingControlWidths: [
        { el: 'input#a', width: 300 },
        { el: 'input#b', width: 480 },
      ],
      overflow390: 41,
    };
    expect(
      evaluateMeasurement(fill, m)
        .map((v) => v.rule)
        .sort(),
    ).toEqual([
      'form-sibling-width',
      'gap-off-scale',
      'nested-padding',
      'outer-margin',
      'overflow-390',
    ]);
  });

  it('flags a form control wider than its max width', () => {
    const e = { ...fill, maxWidth: '40rem' };
    expect(
      evaluateMeasurement(e, { ...clean, wideWidth: 1100 }, { remPx: 16 }).map((v) => v.rule),
    ).toEqual(['form-max-width']);
    expect(evaluateMeasurement(e, { ...clean, wideWidth: 640 }, { remPx: 16 })).toEqual([]);
  });

  it('summarize counts per rule', () => {
    const s = summarize([
      { component: 'A', rule: 'width' },
      { component: 'B', rule: 'width' },
      { component: 'B', rule: 'outer-margin' },
    ]);
    expect(s).toEqual({ width: 2, 'outer-margin': 1 });
  });
});

describe('check-layout-contract: canary', () => {
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [
        'scripts/check-layout-contract.mjs',
        '--measurements',
        'fixtures/check-layout-contract/canary-measurements.json',
        ...args,
      ],
      { cwd: ROOT, encoding: 'utf8' },
    );

  it('exits 0 in warn mode and reports the violations', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('outer-margin');
  });

  it('exits 1 with --strict', () => {
    expect(run('--strict').status).toBe(1);
  });
});

describe('check-layout-contract: browser canary', () => {
  const hasChromium =
    existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers') ||
    existsSync(`${process.env.HOME}/.cache/ms-playwright`);
  it.skipIf(!hasChromium)(
    '--strict exits 1 on the canary HTML, exit 0 in warn mode',
    () => {
      const run = (...a) =>
        spawnSync(
          process.execPath,
          [
            'scripts/check-layout-contract.mjs',
            '--html',
            'fixtures/check-layout-contract/canary.html',
            ...a,
          ],
          { cwd: ROOT, encoding: 'utf8' },
        );
      expect(run().status).toBe(0);
      expect(run('--strict').status).toBe(1);
    },
    60000,
  );
});
