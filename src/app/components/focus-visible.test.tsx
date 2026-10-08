/**
 * Keyboard focus visibility for the single-element controls (Checkbox, Radio,
 * Toggle). The focus ring is keyed on the browser's real `:focus-visible`
 * (keyboard modality), not on bare `focus`, and hover must never mask it.
 *
 * jsdom cannot decide modality itself, so `matches(':focus-visible')` is stubbed
 * to stand in for "keyboard" (true) vs "mouse click" (false).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Checkbox } from './checkbox';
import { Radio } from './radio';
import { Toggle } from './toggle';

let focusVisible = true;
let matchesSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  focusVisible = true;
  const original = Element.prototype.matches;
  matchesSpy = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    if (selector === ':focus-visible') return focusVisible;
    return original.call(this, selector);
  });
});

afterEach(() => {
  matchesSpy.mockRestore();
  cleanup();
});

const noop = () => {};

// Each case returns the element that carries the drawn ring in its focused state.
const CASES = [
  {
    name: 'Checkbox',
    ui: <Checkbox label="Agree" checked={false} onChange={noop} />,
    role: 'checkbox',
    ring: (input: HTMLElement) => input.nextElementSibling as HTMLElement,
  },
  {
    name: 'Radio',
    ui: <Radio label="Card" checked={false} onChange={noop} />,
    role: 'radio',
    ring: (input: HTMLElement) => input.nextElementSibling as HTMLElement,
  },
  {
    name: 'Toggle',
    ui: <Toggle label="Wi-Fi" checked={false} onChange={noop} />,
    role: 'switch',
    ring: (input: HTMLElement) => input.parentElement as HTMLElement,
  },
] as const;

const hasRing = (el: HTMLElement) => el.className.includes('[outline:');

describe.each(CASES)('$name focus ring', ({ ui, role, ring }) => {
  it('is hidden at rest', () => {
    render(ui);
    expect(hasRing(ring(screen.getByRole(role)))).toBe(false);
  });

  it('shows on keyboard focus and is keyed on :focus-visible', () => {
    render(ui);
    const input = screen.getByRole(role);
    fireEvent.focus(input);
    expect(matchesSpy).toHaveBeenCalledWith(':focus-visible');
    expect(hasRing(ring(input))).toBe(true);
  });

  it('does not show on mouse-click focus', () => {
    focusVisible = false;
    render(ui);
    const input = screen.getByRole(role);
    fireEvent.mouseEnter(input.parentElement as HTMLElement);
    fireEvent.focus(input);
    expect(hasRing(ring(input))).toBe(false);
  });

  it('is not masked by a mouse resting on the control', () => {
    render(ui);
    const input = screen.getByRole(role);
    fireEvent.focus(input);
    fireEvent.mouseEnter(input.parentElement as HTMLElement);
    expect(hasRing(ring(input))).toBe(true);
  });

  it('appears when a key is pressed after a mouse focus, and clears on blur', () => {
    focusVisible = false;
    render(ui);
    const input = screen.getByRole(role);
    fireEvent.focus(input);
    expect(hasRing(ring(input))).toBe(false);
    focusVisible = true;
    fireEvent.keyDown(input, { key: ' ' });
    expect(hasRing(ring(input))).toBe(true);
    fireEvent.blur(input);
    expect(hasRing(ring(input))).toBe(false);
  });

  it('still forwards consumer onFocus / onKeyDown handlers', () => {
    const onFocus = vi.fn();
    const onKeyDown = vi.fn();
    const props = { onFocus, onKeyDown };
    const el =
      role === 'checkbox' ? (
        <Checkbox label="x" checked={false} onChange={noop} {...props} />
      ) : role === 'radio' ? (
        <Radio label="x" checked={false} onChange={noop} {...props} />
      ) : (
        <Toggle label="x" checked={false} onChange={noop} {...props} />
      );
    render(el);
    const input = screen.getByRole(role);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'a' });
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
