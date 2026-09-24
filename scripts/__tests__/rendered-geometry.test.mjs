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
  FREEZE_ANIMATIONS_CSS,
  PROBE_CONFIG,
  PROBE_SOURCE,
  diffAgainstBaseline,
  fingerprint,
  freezeAnimationsInPage,
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
  // #225 class of bug: a decorative indicator (radio's dot, toggle's thumb)
  // whose wrapper stayed the browser default `display: inline`, which
  // ignores width/height on a non-replaced element outright -- an inline
  // element with no text content generates no box at all, so a background
  // alone (no border) still collapses all the way to 0x0.
  'zero-size-decorative': wrap(
    `<span><i style="width:8px;height:8px;background:black;border-radius:999px"></i></span>`,
  ),
  // #230 / #234: a control boundary below WCAG 1.4.11's 3:1 non-text floor —
  // a near-white border on a white backdrop.
  'rendered-contrast': wrap(
    `<div style="width:40px;height:40px;background:#ffffff;border:2px solid #fdfdfd"></div>`,
  ),
  // #240: a label's painted text below WCAG 1.4.3 AA — white text with no
  // opaque backdrop behind it, over the (white) page.
  'text-contrast': wrap(`<span style="color:#ffffff;font-size:14px">Active</span>`),
};

/**
 * #287 (breadcrumb false positive) canary. `<li>` alone is not prose -- a
 * breadcrumb's `<nav aria-label> > <ol> > <li> > <a>` is a landmark, not a
 * sentence. But a plain `<li>` in a genuinely textual list (no nav/labelled
 * list ancestor) is still prose and the rule must still catch it.
 */
const inProseListItem = wrap(
  `<ul><li>read <a href="#" style="text-decoration:none">this note</a> first</li></ul>`,
);
const breadcrumbListItem = wrap(
  `<nav aria-label="Breadcrumb"><ol><li><a href="#" style="text-decoration:none">Products</a></li></ol></nav>`,
);

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
  // A genuinely unpainted 0x0 node (no border, no background) is layout
  // glue, not a broken indicator -- `zero-size-decorative` must not fire on it.
  'unpainted zero-size glue': wrap(`<span>label<i style="width:20px;height:20px"></i></span>`),
  // A control boundary that clears WCAG 1.4.11's 3:1 non-text floor.
  'high-contrast border': wrap(
    `<div style="width:40px;height:40px;background:#ffffff;border:2px solid #333333"></div>`,
  ),
  // Text that clears WCAG 1.4.3 AA against its actually-painted background.
  'high-contrast text': wrap(
    `<div style="background:#000000"><span style="color:#ffffff;font-size:14px">Active</span></div>`,
  ),
  // WCAG 1.4.3/1.4.11 both explicitly exempt an inactive component -- a
  // disabled control's low-contrast text/border is the deliberate signal of
  // "disabled", not a defect.
  'disabled control text': wrap(
    `<button disabled style="height:40px;width:120px;padding:0 12px;color:#eeeeee">Save</button>`,
  ),
  'disabled control border': wrap(
    `<button disabled style="height:40px;width:120px;padding:0 12px;border:2px solid #fdfdfd;background:#ffffff">Save</button>`,
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

  it('still fires on a colour-only link inside a genuine prose <li>', async () => {
    const kinds = (await run(inProseListItem)).map((f) => f.kind);
    expect(kinds).toContain('link-no-affordance');
  });

  it('stays silent on a breadcrumb <li> (nav landmark, not prose)', async () => {
    expect(await run(breadcrumbListItem)).toEqual([]);
  });

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

/**
 * #282 canary. A frame whose child's intrinsic width oscillates on a CSS
 * animation reproduces the exact class of flake reported against
 * `circular-progress--indeterminate`: the frame overflows for part of the
 * cycle and does not for the rest, so an unfrozen measurement's result
 * depends on which instant it lands on. `freezeAnimationsInPage` is proven to
 * remove that dependency by measuring at two different points in the cycle
 * and asserting the two measurements now agree.
 */
describe.skipIf(!hasBrowser)('#282 — freezing animations removes measurement flake', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  // A 40px frame; the child's width animates 20px -> 140px -> 20px on a
  // 400ms loop, so it fits the frame near 0%/100% and overflows near 50%.
  const ANIMATED_HTML = `<!doctype html><html><head><style>
    @keyframes grow { 0%, 100% { width: 20px; } 50% { width: 140px; } }
    body { margin: 0; }
    .frame { width: 40px; overflow: hidden; white-space: nowrap; }
    .content { display: inline-block; height: 20px; animation: grow 2s linear infinite; }
  </style></head><body>
    <div id="storybook-root"><div class="frame"><span class="content"></span></div></div>
  </body></html>`;

  const measure = async (page) =>
    page.evaluate(
      ([source, cfg]) => new Function(`return (${source})`)()(cfg),
      [PROBE_SOURCE.toString(), PROBE_CONFIG],
    );

  it('is non-deterministic when animations are left running', async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 200 } });
    const page = await context.newPage();
    await page.goto(`data:text/html,${encodeURIComponent(ANIMATED_HTML)}`);

    // Near the 0%/100% keyframe: the child is at its 20px resting width, well
    // inside the 40px frame.
    await page.waitForTimeout(50);
    const atRest = (await measure(page)).map((f) => f.kind);

    // Near the 50% keyframe (t=1s of the 2s loop): the child is near its
    // 140px peak, well past the frame's width.
    await page.waitForTimeout(950);
    const midCycle = (await measure(page)).map((f) => f.kind);

    await context.close();
    expect(atRest.includes('overflow-x')).toBe(false);
    expect(midCycle.includes('overflow-x')).toBe(true);
  });

  it('is stable once animations are frozen before the first paint', async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 200 } });
    await context.addInitScript(freezeAnimationsInPage, FREEZE_ANIMATIONS_CSS);
    const page = await context.newPage();
    await page.goto(`data:text/html,${encodeURIComponent(ANIMATED_HTML)}`);

    await page.waitForTimeout(50);
    const first = (await measure(page)).map((f) => f.kind);

    // Same wait a real sweep would have hit the 50% keyframe at; frozen, the
    // animation never advanced past its start, so this must read identically.
    await page.waitForTimeout(950);
    const second = (await measure(page)).map((f) => f.kind);

    await context.close();
    expect(second).toEqual(first);
    expect(first.includes('overflow-x')).toBe(false);
  });
});
