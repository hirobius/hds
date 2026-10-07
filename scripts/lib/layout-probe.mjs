/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * layout-probe.mjs — the in-browser half of scripts/check-layout-contract.mjs.
 *
 * Both functions are serialised by Playwright's page.evaluate, so each must be
 * fully self-contained (no imports, no closures over module scope).
 */

/**
 * Measures the component a story rendered. The target is found by walking down
 * from #storybook-root through wrappers that have exactly one element child and
 * no text of their own (providers, decorators), so it is the first element that
 * branches or holds content. The target's parent becomes the probe container:
 * a block, `probeW` wide and `probeH` tall, taller than any child.
 */
export function probeLayout({ probeW, probeH, wideW }) {
  const root = document.querySelector('#storybook-root');
  if (!root) return { error: 'no #storybook-root' };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'TEMPLATE']);
  const kidsOf = (el) =>
    [...el.children].filter((c) => !SKIP.has(c.tagName) && getComputedStyle(c).display !== 'none');
  const hasText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
  // Prefer the story's own component: find its React fiber (identity survives
  // minification) and take the first host element it renders. Fall back to
  // walking down through single-child wrappers.
  let target = null;
  const story = window.__STORYBOOK_PREVIEW__?.currentRender?.story;
  const Comp = story?.component;
  const fiberOf = (el) => {
    const k = Object.keys(el).find((x) => x.startsWith('__reactFiber$'));
    return k ? el[k] : null;
  };
  const isComp = (f) =>
    Comp &&
    (f.type === Comp ||
      f.elementType === Comp ||
      (Comp.render && f.type?.render === Comp.render) ||
      (Comp.type && f.type === Comp.type));
  if (Comp) {
    for (const el of root.querySelectorAll('*')) {
      for (let f = fiberOf(el); f; f = f.return) {
        if (!isComp(f)) continue;
        let h = f.child;
        while (h && h.tag !== 5) h = h.child;
        if (h?.stateNode instanceof Element && root.contains(h.stateNode)) target = h.stateNode;
        break;
      }
      if (target) break;
    }
  }
  if (!target) {
    target = root;
    for (;;) {
      const kids = kidsOf(target);
      if (kids.length === 1 && !hasText(target)) target = kids[0];
      else break;
    }
  }
  if (target === root) return { error: 'story rendered no element' };
  const parent = target.parentElement;
  const describe = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join('.');
    const label = el.getAttribute('aria-label') || el.getAttribute('data-testid') || '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}${label ? `[${label.slice(0, 20)}]` : ''}`.slice(
      0,
      90,
    );
  };
  const all = [target, ...target.querySelectorAll('*')].filter(
    (el) => !el.closest('svg') || el.tagName.toLowerCase() === 'svg',
  );
  const rendered = (el) => {
    const r = el.getBoundingClientRect();
    return !(r.width <= 1 && r.height <= 1) && getComputedStyle(el).display !== 'none';
  };

  // Allowed gap values: 0 and the live xs..xl steps (density-aware).
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:0';
  parent.appendChild(probe);
  const scale = ['xs', 'sm', 'md', 'lg', 'xl'].map((s) => {
    probe.style.width = `var(--semantic-space-scale-${s})`;
    return parseFloat(getComputedStyle(probe).width);
  });
  probe.remove();
  const allowedGap = [0, ...scale.filter((n) => Number.isFinite(n))];

  const saved = parent.style.cssText;
  parent.style.cssText += `;display:block;box-sizing:border-box;width:${probeW}px;height:${probeH}px;padding:0;margin:0;border:0;position:relative;overflow:visible;min-height:0;max-height:none;min-width:0;max-width:none`;
  // Stories pin presentation sizes inline (`style={{ maxWidth: 360 }}`); the contract
  // judges the component's own sizing, so lift those for the measurement.
  const savedTarget = target.style.cssText;
  for (const p of ['width', 'maxWidth', 'minWidth', 'height', 'maxHeight', 'minHeight'])
    target.style[p] = '';
  const rect = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  let contentExtent;
  const kids = kidsOf(target);
  if (kids.length) {
    contentExtent =
      Math.max(...kids.map((k) => k.getBoundingClientRect().bottom)) -
      rect.top +
      parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderBottomWidth);
  } else {
    const range = document.createRange();
    range.selectNodeContents(target);
    contentExtent =
      range.getBoundingClientRect().height +
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom);
  }

  const margins = [];
  const gaps = [];
  const nested = [];
  const PAD_SKIP = new Set([
    'BUTTON',
    'INPUT',
    'SELECT',
    'TEXTAREA',
    'A',
    'TD',
    'TH',
    'TR',
    'SUMMARY',
    'OPTION',
    'LABEL',
    'LI',
  ]);
  const padded = (el) => {
    if (PAD_SKIP.has(el.tagName)) return false;
    const s = getComputedStyle(el);
    if (/^(inline|table|contents|none)/.test(s.display)) return false;
    if (!kidsOf(el).length) return false;
    return ['Top', 'Right', 'Bottom', 'Left'].some((d) => parseFloat(s[`padding${d}`]) > 0.5);
  };
  for (const el of all) {
    if (!rendered(el)) continue;
    const s = getComputedStyle(el);
    const m = ['Top', 'Right', 'Bottom', 'Left'].map((d) => parseFloat(s[`margin${d}`]));
    const autoMargin = /(^|\s)-?m[trblxy]?-auto(\s|$)/.test(
      typeof el.className === 'string' ? el.className : '',
    );
    if (
      !autoMargin &&
      m.some((n) => Math.abs(n) > 0.5) &&
      !(m[1] === m[3] && m[0] === 0 && m[2] === 0 && s.maxWidth !== 'none')
    ) {
      margins.push({
        el: describe(el),
        margin: m.map((n) => `${Math.round(n * 10) / 10}px`).join(' '),
      });
    }
    if (/flex|grid/.test(s.display) && kidsOf(el).length > 1) {
      for (const [axis, v] of [
        ['row-gap', s.rowGap],
        ['column-gap', s.columnGap],
      ]) {
        const px = v === 'normal' ? 0 : parseFloat(v);
        if (!allowedGap.some((a) => Math.abs(a - px) < 0.5)) {
          gaps.push({ el: describe(el), gap: `${axis} ${px}px` });
        }
      }
    }
    if (
      el !== target &&
      padded(el) &&
      el.parentElement &&
      el.parentElement !== parent &&
      padded(el.parentElement)
    ) {
      nested.push({ outer: describe(el.parentElement), inner: describe(el) });
    }
  }

  const ctl = new Set(
    [
      ...(target.matches('input,textarea,select,[role=combobox]') ? [target] : []),
      ...target.querySelectorAll(
        'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]),textarea,select,[role=combobox]',
      ),
    ].filter(rendered),
  );
  const siblingControlWidths = [...ctl].map((el) => ({
    el: describe(el),
    width: el.getBoundingClientRect().width,
  }));

  parent.style.width = `${wideW}px`;
  const wideWidth = target.getBoundingClientRect().width;
  parent.style.cssText = saved;
  target.style.cssText = savedTarget;

  return {
    target: describe(target),
    probeWidth: probeW,
    probeHeight: probeH,
    width: rect.width,
    height: rect.height,
    contentExtent,
    wideWidth,
    margins: margins.slice(0, 25),
    nested: nested.slice(0, 25),
    gaps: gaps.slice(0, 25),
    siblingControlWidths,
    remPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  };
}

/** Run at a 390px viewport, with no probe styles applied. Returns the worst overshoot in px. */
export function probeOverflow() {
  const doc = document.documentElement;
  let worst = Math.max(0, doc.scrollWidth - doc.clientWidth);
  const root = document.querySelector('#storybook-root');
  for (const el of root ? root.querySelectorAll('*') : []) {
    if (el.closest('svg') || el.closest('[aria-hidden="true"]')) continue;
    let clipped = false;
    for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(a).overflowX)) clipped = true;
    }
    if (clipped) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right - window.innerWidth > worst) worst = r.right - window.innerWidth;
  }
  return Math.round(worst);
}
