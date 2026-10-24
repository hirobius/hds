/**
 * Link swipe (C2): pointer enter AND pointer leave each (re)start the underline swipe on a
 * `.hds-link`, by setting `data-link-swipe` (theme.css runs the animation off it).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { installLinkSwipeListeners } from './link-swipe';

beforeAll(() => installLinkSwipeListeners());
afterEach(() => {
  document.body.innerHTML = '';
});

function link() {
  document.body.innerHTML = '<p><a class="hds-link" href="#"><span>Back</span></a> <b>x</b></p>';
  return document.querySelector<HTMLAnchorElement>('.hds-link')!;
}
const over = (el: Element, from: Element | null) =>
  el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: from }));
const out = (el: Element, to: Element | null) =>
  el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: to }));

describe('link swipe', () => {
  it('plays on pointer enter', () => {
    const a = link();
    over(a, document.querySelector('b'));
    expect(a.hasAttribute('data-link-swipe')).toBe(true);
  });

  it('plays again on pointer leave, and clears when the animation ends', () => {
    const a = link();
    over(a, null);
    a.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(a.hasAttribute('data-link-swipe')).toBe(false);
    out(a, document.querySelector('b'));
    expect(a.hasAttribute('data-link-swipe')).toBe(true);
  });

  it('restarts when it is already running (attribute toggles off, then on)', () => {
    const a = link();
    const obs = new MutationObserver(() => {});
    obs.observe(a, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['data-link-swipe'],
    });
    over(a, null);
    out(a, null);
    // set (was absent), removed (was set), set again (was absent)
    expect(obs.takeRecords().map((r) => r.oldValue)).toEqual([null, '', null]);
    expect(a.hasAttribute('data-link-swipe')).toBe(true);
  });

  it('ignores moves between the link and its own children', () => {
    const a = link();
    const span = a.querySelector('span')!;
    over(span, a);
    out(span, a);
    expect(a.hasAttribute('data-link-swipe')).toBe(false);
  });
});
