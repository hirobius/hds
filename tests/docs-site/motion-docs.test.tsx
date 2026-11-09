/**
 * hds#1397: the motion docs. Shake plays on every press (its recipe has a real start state,
 * so a keyed remount animates), both motion pages use the one cobalt MotionSample, the
 * recipe stages have a fixed height, and the token demo toggles direction.
 */
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { motionRecipe } from '../../src/app/design-system/motion-recipes';
import { MotionDemo } from '../../docs-site/components/foundation-visuals-client';
import { KEYED, Stage } from '../../docs-site/components/motion-recipes-demo';

describe('Shake demo animates (hds#1397)', () => {
  it('the shake recipe starts from x 0, not initial false, so a remount plays it', () => {
    const shake = motionRecipe('shake');
    expect(shake.initial).toEqual({ x: 0 });
    expect((shake.animate as { x: number[] }).x.length).toBeGreaterThan(2);
  });

  it('the Shake stage remounts its sample on each press', () => {
    expect(KEYED).toContain('shake');
    const { container, rerender } = render(<Stage name="shake" run={0} />);
    const first = container.querySelector('.hds-motion-sample');
    rerender(<Stage name="shake" run={1} />);
    const second = container.querySelector('.hds-motion-sample');
    expect(first).not.toBeNull();
    expect(second).not.toBe(first);
  });
});

describe('MotionSample on both motion pages (hds#1397)', () => {
  it('the recipe stage draws the cobalt sample tile', () => {
    const { container } = render(<Stage name="arrive" run={1} />);
    const tile = container.querySelector('.hds-motion-sample');
    expect(tile?.getAttribute('data-accent')).toBe('cobalt');
  });

  it('the token demo draws the same tile and toggles direction', () => {
    const { container } = render(<MotionDemo duration="150ms" easing="ease" />);
    expect(container.querySelector('.hds-motion-sample[data-accent="cobalt"]')).not.toBeNull();
    const button = screen.getByRole('button', { name: 'Play →' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '← Play' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '← Play' }));
    expect(screen.getByRole('button', { name: 'Play →' })).toBeTruthy();
  });

  it('stages have one fixed height and reduced motion stops the tile transition', () => {
    const css = readFileSync('docs-site/app/globals.css', 'utf8');
    expect(/\.hds-motion-stage \{[^}]*height: 6rem/.test(css)).toBe(true);
    expect(
      /prefers-reduced-motion: reduce\) \{\s*\.hds-motion-tile \{\s*transition: none/.test(css),
    ).toBe(true);
  });
});
