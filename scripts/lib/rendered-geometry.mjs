/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * rendered-geometry — the layout probe and its bookkeeping.
 *
 * Every other gate in this repo is textual. check-contrast resolves the token
 * graph in JS, check-hardcoded-spacing greps source, audit-tokens reads CSS
 * text. None of them can see a pixel, which is how #245 shipped: 55 dark-mode
 * aliases were structurally broken and passed every token gate. This module
 * reads the geometry a browser actually produced.
 *
 * PROBE_SOURCE is a function serialised into the page. It reports raw
 * observations and makes no judgement about which matter — that is the
 * baseline's job, so a finding can be accepted without weakening the detector.
 *
 * #234/#240 added the rendered-contrast half of the gate: `rendered-contrast`
 * (a control's painted border vs. its painted background, WCAG 1.4.11's 3:1
 * non-text floor) and `text-contrast` (painted text vs. painted background,
 * WCAG 1.4.3's 4.5:1/3:1 AA floors) — both walk the actual composited colors
 * a browser produced, not a declared token pair, which is what let #230's
 * 1.26:1 borders and a 1.00:1 segmented-control label pass every textual
 * gate. `zero-size-decorative` extends the existing zero-size check to a
 * control's non-interactive drawn parts (a radio's ring/dot, a toggle's
 * track/thumb) — the #225 class of bug where the interactive element itself
 * renders fine but the thing a user actually sees collapses to nothing.
 */

/** Selector for anything a person can click, type into, or tab to. */
const INTERACTIVE =
  'button, a[href], input, select, textarea, [role=button], [role=link], [role=tab], [role=menuitem]';

/**
 * Sub-pixel floor. A line box rounds by a pixel or two on its own; treating
 * that as a clip reports the browser's rounding, not a defect anyone can see.
 */
const ROUNDING_SLACK = 3;

/** WCAG 2.2 AA §2.5.8 minimum target, in CSS px. */
const MIN_TARGET = 24;

/** Baseline misalignment a reader notices in a table row, in CSS px. */
const ROW_BASELINE_SLACK = 3;

/** WCAG 1.4.11 non-text contrast floor for a control's rendered boundary (border). */
const MIN_CONTRAST_NONTEXT = 3;

/** WCAG 1.4.3 AA text contrast floors. "Large" text gets the lower bar. */
const MIN_CONTRAST_TEXT_NORMAL = 4.5;
const MIN_CONTRAST_TEXT_LARGE = 3;

export const PROBE_SOURCE = function hdsRenderedGeometryProbe(cfg) {
  const {
    INTERACTIVE,
    ROUNDING_SLACK,
    MIN_TARGET,
    ROW_BASELINE_SLACK,
    MIN_CONTRAST_NONTEXT,
    MIN_CONTRAST_TEXT_NORMAL,
    MIN_CONTRAST_TEXT_LARGE,
  } = cfg;
  const out = [];
  const root = document.querySelector('#storybook-root') || document.body;
  const vw = document.documentElement.clientWidth;

  // A story that throws, fails to mount or renders null produces NO findings,
  // which is indistinguishable from a clean pass — a vacuous green. Running
  // this probe against another library surfaced it: three of eighteen cases
  // rendered nothing and all three reported "clean". It had already happened
  // here, where three StackedCardRail stories captured nothing while the gate
  // said no new findings. An empty root is now a finding of its own.
  const rendered = root.querySelectorAll('*').length;
  if (rendered === 0) {
    out.push({ kind: 'empty-render', sel: '#storybook-root', text: '' });
    return out;
  }

  const sel = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls =
      typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const text = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);

  // ── Rendered-contrast helpers (#234/#240) ──────────────────────────────────
  // The gate must read what a browser actually painted -- the effective,
  // composited color -- not a declared token pair. rgb()/rgba() is what
  // getComputedStyle always resolves to, in every engine this probe runs in.
  const parseColor = (str) => {
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(str);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const relLuminance = ({ r, g, b }) => {
    const chan = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  };
  const contrastRatio = (a, b) => {
    const la = relLuminance(a);
    const lb = relLuminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
  };
  // Walks up from `el` for the first painted (non-transparent) background,
  // alpha-composited over whatever sits behind it, so a translucent overlay's
  // *actual* rendered color is what gets measured -- not its raw channel.
  const effectiveBackground = (el) => {
    let node = el;
    while (node) {
      const bg = parseColor(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) {
        if (bg.a >= 0.999) return bg;
        const behind = effectiveBackground(node.parentElement) || { r: 255, g: 255, b: 255 };
        return {
          r: bg.r * bg.a + behind.r * (1 - bg.a),
          g: bg.g * bg.a + behind.g * (1 - bg.a),
          b: bg.b * bg.a + behind.b * (1 - bg.a),
        };
      }
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255 }; // Storybook preview canvas default.
  };
  const hasOwnText = (el) =>
    Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
  // WCAG 1.4.3/1.4.11 both explicitly exempt an inactive/disabled UI
  // component from the contrast requirement -- the state itself is the
  // signal, not a color that has to fight through a lowered bar too. A
  // control's own disabled state usually lives on a *sibling* real input
  // (radio/toggle/checkbox all draw their ring/track next to, not around,
  // the native `<input disabled>` inside a shared `<label>`), so ancestor-only
  // matching misses it -- also check within the nearest enclosing `<label>`.
  const isDisabled = (el) => {
    if (el.matches(':disabled') || el.closest('[disabled], [aria-disabled="true"]')) return true;
    return !!el.closest('label')?.querySelector('[disabled], [aria-disabled="true"]');
  };
  const hasPaint = (cs) => {
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
      (side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none',
    );
    const bg = parseColor(cs.backgroundColor);
    return hasBorder || (!!bg && bg.a > 0);
  };

  // The sr-only recipe IS "overflow a 1x1 box and clip it". Measuring that
  // reports the technique. The clip declaration is the deliberate signature; a
  // bare 1x1 box only counts as deliberate on a non-interactive node, because a
  // collapsed button is the broken icon-control defect, not an a11y technique.
  // A non-interactive tiny box that carries its own border/background is a
  // different signal again: an author-drawn indicator (a ring, a dot, a
  // track, a thumb) collapsed to nothing, not a spacer -- #234/#240's
  // zero-size-decorative check below needs to see it, not have it swallowed
  // here as "deliberately tiny".
  const isVisuallyHidden = (el, cs) => {
    if (cs.clipPath.startsWith('inset(50%') || cs.clip === 'rect(0px, 0px, 0px, 0px)') return true;
    if (el.matches(INTERACTIVE)) return false;
    const r = el.getBoundingClientRect();
    if (r.width > 1 || r.height > 1) return false;
    return !hasPaint(cs);
  };

  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (isVisuallyHidden(el, cs)) continue;
    // A transform (spin, scale, skew) decouples the layout box from what gets
    // painted, so scrollWidth stops meaning "the content does not fit".
    if (cs.transform !== 'none') continue;

    const r = el.getBoundingClientRect();

    // Content wider than its frame, with no scroller to reach it.
    const scrollableX = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
    if (!scrollableX && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + ROUNDING_SLACK) {
      out.push({
        kind: 'overflow-x',
        sel: sel(el),
        by: el.scrollWidth - el.clientWidth,
        clientWidth: el.clientWidth,
        overflow: cs.overflowX,
        text: text(el),
      });
    }

    // Content taller than a box that clips it — the "smashed layout" class.
    const scrollableY = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    if (
      !scrollableY &&
      cs.overflowY === 'hidden' &&
      el.clientHeight > 0 &&
      el.scrollHeight > el.clientHeight + ROUNDING_SLACK
    ) {
      out.push({
        kind: 'clipped-y',
        sel: sel(el),
        by: el.scrollHeight - el.clientHeight,
        clientHeight: el.clientHeight,
        text: text(el),
      });
    }

    if (r.width > 0 && r.right > vw + 1) {
      out.push({
        kind: 'past-viewport',
        sel: sel(el),
        right: Math.round(r.right),
        vw,
        text: text(el),
      });
    }

    if (el.matches(INTERACTIVE)) {
      if (r.width < 1 || r.height < 1) {
        out.push({
          kind: 'zero-size-control',
          sel: sel(el),
          w: r.width,
          h: r.height,
          text: text(el),
        });
      } else if (r.width < MIN_TARGET || r.height < MIN_TARGET) {
        // §2.5.8's inline exception covers a link sitting in a sentence: it is
        // display:inline and sized by the text it wraps, not a control anyone
        // can make bigger without reflowing the prose.
        const inlineInText = cs.display === 'inline' && el.matches('a[href]');
        if (!inlineInText) {
          out.push({
            kind: 'small-target',
            sel: sel(el),
            w: Math.round(r.width),
            h: Math.round(r.height),
            text: text(el),
          });
        }
      }
    }

    // A non-interactive element carrying its own paint (a border or a
    // background) -- a drawn indicator, not a spacer -- collapsing on BOTH
    // axes is the #225 class of bug: a ring, a dot, a track, a thumb rendered
    // present in the DOM and invisible, most often because it fell back to
    // the browser default `display: inline` and lost its declared
    // width/height entirely. Only one axis at ~0 is a deliberate hairline (a
    // divider's `<hr>`, a stepper's connector line) -- real, visible geometry
    // by design, not this bug -- so both must collapse. Interactive elements
    // are covered by zero-size-control above; this catches a control's
    // decorative parts, which carry no INTERACTIVE role of their own (radio's
    // ring/dot, toggle's track/thumb).
    if (!el.matches(INTERACTIVE) && r.width <= 1 && r.height <= 1 && hasPaint(cs)) {
      out.push({
        kind: 'zero-size-decorative',
        sel: sel(el),
        w: r.width,
        h: r.height,
        text: text(el),
      });
    }

    // WCAG 1.4.11: a control's rendered boundary (border) against what is
    // actually painted OUTSIDE it -- the surrounding page/parent, not the
    // control's own fill -- because 1.4.11 is about telling the control apart
    // from what is around it, not from itself. #230 found borders at 1.26:1
    // that passed check-contrast.mjs because that gate only resolves the
    // token graph, never a pixel.
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (isDisabled(el)) break;
      const width = parseFloat(cs[`border${side}Width`]);
      const style = cs[`border${side}Style`];
      if (!(width > 0) || style === 'none' || style === 'hidden') continue;
      const borderColor = parseColor(cs[`border${side}Color`]);
      if (!borderColor || borderColor.a <= 0.01) continue;
      const behind = effectiveBackground(el.parentElement) || { r: 255, g: 255, b: 255 };
      const ratio = contrastRatio(borderColor, behind);
      if (ratio < MIN_CONTRAST_NONTEXT) {
        out.push({
          kind: 'rendered-contrast',
          sel: sel(el),
          side: side.toLowerCase(),
          ratio: Math.round(ratio * 100) / 100,
          text: text(el),
        });
      }
      break; // One flagged side is enough to identify the control; a box's
      // four borders are near-always the same color in this system.
    }

    // WCAG 1.4.3 AA: the text color actually painted against what is actually
    // painted behind it. Segmented-control's active item measured 1.00:1 --
    // white text over a transparent backdrop over a white page -- and passed
    // every textual gate, because none of them resolve what a pixel became.
    if (hasOwnText(el) && !isDisabled(el)) {
      const textColor = parseColor(cs.color);
      if (textColor && textColor.a > 0.01) {
        const fontSize = parseFloat(cs.fontSize);
        const weight =
          cs.fontWeight === 'bold' || cs.fontWeight === 'bolder' ? 700 : +cs.fontWeight || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700);
        const floor = isLarge ? MIN_CONTRAST_TEXT_LARGE : MIN_CONTRAST_TEXT_NORMAL;
        const behind = effectiveBackground(el);
        const ratio = contrastRatio(textColor, behind);
        if (ratio < floor) {
          out.push({
            kind: 'text-contrast',
            sel: sel(el),
            ratio: Math.round(ratio * 100) / 100,
            floor,
            text: text(el),
          });
        }
      }
    }

    // A link whose only affordance is colour reads as plain text, and reads as
    // nothing at all to anyone who cannot separate the two hues.
    if (el.matches('a[href]') && text(el)) {
      const parentTag = el.parentElement?.tagName.toLowerCase() || '';
      // WCAG 1.4.1 concerns a link that cannot be told apart from the prose
      // AROUND it. `<li>` alone doesn't mean prose -- a breadcrumb trail
      // (`<nav> > <ol>/<ul> > <li> > <a>`) is a nav landmark, not a sentence a
      // link is embedded in, so it is excluded even though its parent tag is
      // `li`. A `<li>` inside a genuinely textual list (no nav/ol/ul
      // ancestor with an accessible name, or a plain `<ul>` of prose) still
      // counts.
      const isNavLandmarkItem =
        parentTag === 'li' &&
        !!el.closest('nav, [role="navigation"], ol[aria-label], ul[aria-label]');
      const inProse =
        ['p', 'span', 'td', 'dd', 'blockquote'].includes(parentTag) ||
        (parentTag === 'li' && !isNavLandmarkItem);
      const underlined = cs.textDecorationLine.includes('underline');
      const bordered = parseFloat(cs.borderBottomWidth) > 0;
      if (inProse && !underlined && !bordered) {
        out.push({ kind: 'link-no-affordance', sel: sel(el), parent: parentTag, text: text(el) });
      }
    }
  }

  // Cell baselines in a row. The eye reads the first text box, not the cell
  // box, so measure the range of the contents rather than the container.
  for (const tr of root.querySelectorAll('tr')) {
    const cells = Array.from(tr.children).filter((c) => c.getBoundingClientRect().height > 0);
    if (cells.length < 2) continue;
    const tops = cells.map((c) => {
      const range = document.createRange();
      range.selectNodeContents(c);
      const rects = range.getClientRects();
      return rects.length ? Math.round(rects[0].top) : Math.round(c.getBoundingClientRect().top);
    });
    const spread = Math.max(...tops) - Math.min(...tops);
    if (spread > ROW_BASELINE_SLACK) {
      out.push({ kind: 'row-misaligned', sel: sel(tr), spread, cells: cells.length });
    }
  }

  return out;
};

/**
 * Injected before any story mounts so CSS animations and transitions never
 * run in the first place. #282: `getBoundingClientRect()` measures whatever
 * instant the page happens to be in, and a component whose geometry is a
 * function of animation time (a spinner, an entry transition) has no single
 * correct measurement -- one sweep in three reported a transient overflow on
 * `circular-progress--indeterminate` that two more sweeps, same commit, did
 * not. `animation-play-state: paused` alone is not enough: applied AFTER
 * navigation it freezes at whatever point real elapsed time happened to
 * reach, which is exactly the non-determinism this exists to remove. Applied
 * via `page.addInitScript`/`context.addInitScript` it lands before the
 * animated element is even created, so every animation is paused from its
 * first frame -- the same pose, every run, on every machine.
 */
export const FREEZE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-play-state: paused !important;
    animation-delay: 0s !important;
    transition: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
`;

/**
 * Appends a <style> freezing animations/transitions as early as the DOM
 * allows. Runs inside the page (via addInitScript), so it has no import of
 * its own -- kept as a plain function so it can be serialised the same way
 * PROBE_SOURCE is.
 */
export function freezeAnimationsInPage(css) {
  const inject = () => {
    if (!document.head) {
      requestAnimationFrame(inject);
      return;
    }
    const style = document.createElement('style');
    style.setAttribute('data-hds-freeze-animations', '');
    style.textContent = css;
    document.head.appendChild(style);
  };
  inject();
}

export const PROBE_CONFIG = Object.freeze({
  INTERACTIVE,
  ROUNDING_SLACK,
  MIN_TARGET,
  ROW_BASELINE_SLACK,
  MIN_CONTRAST_NONTEXT,
  MIN_CONTRAST_TEXT_NORMAL,
  MIN_CONTRAST_TEXT_LARGE,
});

/**
 * A finding's identity for baseline purposes. Deliberately excludes the
 * magnitude (`by`, `w`, `h`): a card that overflows by 127px and later by 130px
 * is the same unfixed defect, not a new one. Magnitude changes show up in the
 * report, not as a gate failure.
 */
export function fingerprint(storyId, finding) {
  return `${storyId} :: ${finding.kind} :: ${finding.sel}`;
}

/** Collapse a sweep into { kind: count } plus the affected story ids. */
export function summarize(results) {
  const byKind = {};
  const stories = [];
  for (const r of results) {
    if (!r.findings?.length) continue;
    stories.push(r.id);
    for (const f of r.findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
  }
  return { byKind, stories, storiesWithFindings: stories.length };
}

/**
 * New findings fail the gate; findings the baseline already records do not.
 * Baseline entries no longer observed are reported as `fixed` so the baseline
 * can be tightened rather than quietly rotting — the failure mode #276 found in
 * 30 gates that were recorded as firing and were not.
 */
export function diffAgainstBaseline(results, baseline) {
  const known = new Set(baseline?.accepted ?? []);
  const seen = new Set();
  const added = [];
  for (const r of results) {
    for (const f of r.findings ?? []) {
      const fp = fingerprint(r.id, f);
      seen.add(fp);
      if (!known.has(fp)) added.push({ fingerprint: fp, storyId: r.id, ...f });
    }
  }
  const fixed = [...known].filter((fp) => !seen.has(fp));
  return { added, fixed, seen: [...seen].sort() };
}
