/**
 * The probe is worthless if it cannot fail. #245 shipped 55 structurally broken
 * dark-mode aliases past every token gate, and #276 found 30 gates recorded as
 * firing that fired from nothing. So each detector is proven against an injected
 * defect, and a clean page is proven to produce silence.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import {
  PROBE_CONFIG,
  PROBE_SOURCE,
  diffAgainstBaseline,
  fingerprint,
  summarize,
} from '../lib/rendered-geometry.mjs';

const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const hasBrowser = existsSync(CHROMIUM);

const wrap = (inner) =>
  `<html><body style="margin:0"><div id="storybook-root">${inner}</div></body></html>`;

/** Each case: the markup, and the one kind it must produce. */
const DEFECTS = {
  'overflow-x': wrap(
    `<div style="width:80px;overflow:visible"><span style="white-space:nowrap">a very long line of text that cannot fit</span></div>`,
  ),
  'clipped-y': wrap(
    `<div style="width:200px;height:20px;overflow:hidden">line one<br>line two<br>line three</div>`,
  ),
  'past-viewport': wrap(
    `<div style="position:absolute;left:3000px;width:200px;height:20px">pushed off</div>`,
  ),
  'zero-size-control': wrap(
    `<button style="width:0;height:0;padding:0;border:0;overflow:hidden">go</button>`,
  ),
  'small-target': wrap(`<button style="width:16px;height:16px;padding:0">x</button>`),
  'link-no-affordance': wrap(
    `<p>see <a href="#" style="text-decoration:none">this link</a> here</p>`,
  ),
  'row-misaligned': wrap(
    `<table><tr><td style="vertical-align:top;height:60px">top</td><td style="vertical-align:bottom;height:60px">bottom</td></tr></table>`,
  ),
};

/** Deliberate techniques the probe must stay silent about. */
const NOT_DEFECTS = {
  'sr-only label': wrap(
    `<button style="height:40px;width:120px">Save<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">changes to draft</span></button>`,
  ),
  'inline link in a sentence': wrap(
    `<p style="width:400px">read <a href="#" style="text-decoration:underline">the guide</a> first</p>`,
  ),
  'declared scroll container': wrap(
    `<div style="width:80px;overflow-x:auto"><span style="white-space:nowrap">a very long line of text</span></div>`,
  ),
  'rotating spinner': wrap(
    `<div style="width:24px;height:24px;overflow:hidden;transform:rotate(45deg)"><span style="white-space:nowrap">loading loading</span></div>`,
  ),
};

describe.skipIf(!hasBrowser)('rendered-geometry probe', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  const run = async (html) => {
    await page.setContent(html);
    return page.evaluate(
      ([source, cfg]) => new Function(`return (${source})`)()(cfg),
      [PROBE_SOURCE.toString(), PROBE_CONFIG],
    );
  };

  for (const [kind, html] of Object.entries(DEFECTS)) {
    it(`detects ${kind}`, async () => {
      const kinds = (await run(html)).map((f) => f.kind);
      expect(kinds).toContain(kind);
    });
  }

  for (const [label, html] of Object.entries(NOT_DEFECTS)) {
    it(`stays silent on ${label}`, async () => {
      expect(await run(html)).toEqual([]);
    });
  }

  it('reports no finding for a well-formed control', async () => {
    const findings = await run(
      wrap(`<button style="height:40px;width:120px;padding:0 12px">Save</button>`),
    );
    expect(findings).toEqual([]);
  });
});

describe('baseline bookkeeping', () => {
  const results = [
    { id: 'a--one', findings: [{ kind: 'overflow-x', sel: 'div.card', by: 12, clientWidth: 100 }] },
    { id: 'b--two', findings: [{ kind: 'small-target', sel: 'button', w: 16, h: 16 }] },
  ];

  it('treats a magnitude change as the same unfixed defect', () => {
    const baseline = { accepted: [fingerprint('a--one', results[0].findings[0])] };
    const worse = [{ id: 'a--one', findings: [{ ...results[0].findings[0], by: 40 }] }, results[1]];
    const { added } = diffAgainstBaseline(worse, baseline);
    expect(added.map((f) => f.storyId)).toEqual(['b--two']);
  });

  it('fails on a finding the baseline does not record', () => {
    const { added } = diffAgainstBaseline(results, { accepted: [] });
    expect(added).toHaveLength(2);
  });

  it('reports a baseline entry that is no longer observed', () => {
    const baseline = { accepted: ['gone--story :: overflow-x :: div.old'] };
    const { fixed } = diffAgainstBaseline(results, baseline);
    expect(fixed).toEqual(['gone--story :: overflow-x :: div.old']);
  });

  it('counts findings by kind and names the affected stories', () => {
    expect(summarize(results)).toEqual({
      byKind: { 'overflow-x': 1, 'small-target': 1 },
      stories: ['a--one', 'b--two'],
      storiesWithFindings: 2,
    });
  });

  it('ignores stories that rendered clean', () => {
    expect(summarize([{ id: 'c--three', findings: [] }]).storiesWithFindings).toBe(0);
  });
});

/**
 * The detector that exists because the gate could not tell silence from
 * success. Found by running this probe against another component library:
 * three of eighteen cases failed to mount, and all three reported "clean".
 */
describe.skipIf(!hasBrowser)('empty renders are a finding, not a pass', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  const run = async (html) => {
    await page.setContent(html);
    return page.evaluate(
      ([source, cfg]) => new Function(`return (${source})`)()(cfg),
      [PROBE_SOURCE.toString(), PROBE_CONFIG],
    );
  };

  it('reports a story whose root is empty', async () => {
    const findings = await run(`<html><body><div id="storybook-root"></div></body></html>`);
    expect(findings.map((f) => f.kind)).toEqual(['empty-render']);
  });

  it('does not report a story that rendered something', async () => {
    const findings = await run(
      `<html><body><div id="storybook-root"><button style="height:40px;width:120px">Save</button></div></body></html>`,
    );
    expect(findings.map((f) => f.kind)).not.toContain('empty-render');
  });

  it('short-circuits, so an empty root yields exactly one finding', async () => {
    // Without the early return an empty root would also be measured for
    // overflow and targets, producing noise on top of the real problem.
    const findings = await run(`<html><body><div id="storybook-root"></div></body></html>`);
    expect(findings).toHaveLength(1);
  });
});
