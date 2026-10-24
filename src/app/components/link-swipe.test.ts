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
const over = (el: Element, from: Element | null, clientX = 0) =>
  el.dispatchEvent(
    new PointerEvent('pointerover', { bubbles: true, relatedTarget: from, clientX }),
  );
const out = (el: Element, to: Element | null, clientX = 0) =>
  el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: to, clientX }));
/** Give the link a box: x 100..200, so its halves split at 150. */
const box = (a: Element) =>
  (a.getBoundingClientRect = () => ({
    left: 100,
    right: 200,
    width: 100,
    top: 0,
    bottom: 20,
    height: 20,
    x: 100,
    y: 0,
    toJSON: () => ({}),
  }));

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
    expect(obs.takeRecords().map((r) => r.oldValue)).toEqual([null, 'right', null]);
    expect(a.hasAttribute('data-link-swipe')).toBe(true);
  });

  it('direction follows the pointer: entering from the left half swipes right, from the right half left', () => {
    const a = link();
    box(a);
    over(a, null, 110);
    expect(a.getAttribute('data-link-swipe')).toBe('right');
    over(a, null, 190);
    expect(a.getAttribute('data-link-swipe')).toBe('left');
  });

  it('leaving by the right half swipes right, by the left half left', () => {
    const a = link();
    box(a);
    out(a, null, 195);
    expect(a.getAttribute('data-link-swipe')).toBe('right');
    out(a, null, 105);
    expect(a.getAttribute('data-link-swipe')).toBe('left');
  });

  it('keyboard focus (no pointer) plays the moving-right swipe', () => {
    const a = link();
    a.focus(); // fires focusin; jsdom treats programmatic focus as :focus-visible
    expect(a.getAttribute('data-link-swipe')).toBe('right');
  });

  it('ignores moves between the link and its own children', () => {
    const a = link();
    const span = a.querySelector('span')!;
    over(span, a);
    out(span, a);
    expect(a.hasAttribute('data-link-swipe')).toBe(false);
  });
});
