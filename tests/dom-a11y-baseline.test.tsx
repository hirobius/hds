/**
 * DOM and accessibility baseline (hds#468): every docs demo (the DEMOS
 * registry that replaced the Storybook stories) rendered in jsdom, outlined as
 * tag, role, aria states and data-* per element, plus what the virtual screen
 * reader speaks (role, accessible name, states). Classes and ids are left out.
 *
 * The outline must equal docs/baselines/dom-a11y.json. A change to a role, a
 * name or a data-* value fails here until the baseline is rewritten with
 * `pnpm dom:baseline`; once a release snapshot records the baseline, the
 * upgrade gate (scripts/check-upgrade-ledger.mjs) then asks for a behavior
 * step with a detect regex for each demo that changed since the release.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { domLines, outline, type DomA11yOutline } from './helpers/dom-a11y';
import { formatJson, sortedObject } from '../scripts/upgrade/format.mjs';
import { DOM_BASELINE } from '../scripts/upgrade/dom.mjs';

const { DEMOS } = await import('../docs-site/components/component-demos');

const FILE = resolve(__dirname, '..', DOM_BASELINE);
const UPDATE = process.env.HDS_UPDATE_DOM_A11Y === '1';

/** Relative times ("2 hours ago") and dates read the clock: pin it. */
const NOW = new Date('2026-10-15T12:00:00Z');

async function outlineOf(Demo: () => React.ReactNode): Promise<DomA11yOutline> {
  const { container } = render(<div data-hds="">{React.createElement(Demo)}</div>);
  try {
    return await outline(container.firstElementChild as Element);
  } finally {
    cleanup();
  }
}

async function outlineAll(): Promise<Record<string, DomA11yOutline>> {
  const out: Record<string, DomA11yOutline> = {};
  for (const [name, Demo] of Object.entries(DEMOS) as [string, () => React.ReactNode][]) {
    out[name] = await outlineOf(Demo);
  }
  return sortedObject(out);
}

describe('dom-a11y outline', () => {
  const outlineOfHtml = (html: string) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    return domLines(root);
  };

  it('records tag, role, aria states and data-*, not classes, ids or id references', () => {
    expect(
      outlineOfHtml(
        '<div class="a" id="x" role="table" aria-labelledby="x" data-size="sm" aria-busy="true"><span>t</span></div>',
      ),
    ).toEqual(['div aria-busy="true" data-size="sm" role="table"', '  span']);
  });

  it('changes when a role or a data-* value changes', () => {
    const base = outlineOfHtml('<div role="row" data-slot="label"></div>');
    expect(outlineOfHtml('<div role="group" data-slot="label"></div>')).not.toEqual(base);
    expect(outlineOfHtml('<div role="row" data-slot="title"></div>')).not.toEqual(base);
    expect(outlineOfHtml('<div role="row" data-slot="label" class="new"></div>')).toEqual(base);
  });
});

describe('dom-a11y baseline', () => {
  let current: Record<string, DomA11yOutline>;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    current = await outlineAll();
  }, 120_000);

  afterAll(() => {
    vi.useRealTimers();
  });

  it('regenerates deterministically', async () => {
    expect(await outlineAll()).toEqual(current);
  }, 120_000);

  it(`matches ${DOM_BASELINE} (pnpm dom:baseline rewrites it)`, () => {
    if (UPDATE) {
      mkdirSync(dirname(FILE), { recursive: true });
      writeFileSync(FILE, formatJson(current));
    }
    const committed = JSON.parse(readFileSync(FILE, 'utf8'));
    for (const name of new Set([...Object.keys(committed), ...Object.keys(current)])) {
      expect(current[name], `${name}: run pnpm dom:baseline and add a behavior step`).toEqual(
        committed[name],
      );
    }
  });
});
