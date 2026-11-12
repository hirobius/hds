/**
 * Badge `dot` (hds#393), the survivor for the standalone status dot. A dot is a solid
 * feedback-colored circle with no text; a `label` makes it a named status,
 * otherwise it is decorative and a sibling carries the meaning.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bell, CalendarDays } from 'lucide-react';
import { cleanup, render, screen } from '@testing-library/react';
import tokens from '../../../hirobius.tokens.json';
import { Badge } from './badge';

afterEach(cleanup);

describe('Badge dot (hds#393)', () => {
  it('<Badge dot label="Online"/> is an image named "Online" (not a live region, hds#522)', () => {
    render(<Badge dot label="Online" />);
    const dot = screen.getByRole('img', { name: 'Online' });
    expect(dot.getAttribute('aria-label')).toBe('Online');
    expect(dot.hasAttribute('aria-hidden')).toBe(false);
  });

  it('<Badge dot/> without a label is aria-hidden and not a status', () => {
    const { container } = render(<Badge dot />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.hasAttribute('role')).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders no text, even when children are passed', () => {
    const { container } = render(
      <Badge dot tone="success" label="Online">
        Online
      </Badge>,
    );
    expect(container.textContent).toBe('');
  });

  it('keeps tone as the color axis and exposes the dot size', () => {
    const { container } = render(<Badge dot tone="danger" size="lg" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('data-tone')).toBe('danger');
    expect(dot.getAttribute('data-size')).toBe('lg');
  });

  it('leaves a text badge as it was: no role, no aria-hidden', () => {
    render(<Badge tone="info">Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.hasAttribute('role')).toBe(false);
    expect(badge.hasAttribute('aria-hidden')).toBe(false);
    expect(badge.hasAttribute('data-size')).toBe(false);
  });
});

describe('Badge count (hds#865)', () => {
  it('renders the number', () => {
    render(<Badge count={12} />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('caps at max and shows "<max>+"', () => {
    render(<Badge count={120} max={99} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows the exact number at or below max', () => {
    render(<Badge count={99} max={99} />);
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('has no cap without max', () => {
    render(<Badge count={1204} />);
    expect(screen.getByText('1204')).toBeTruthy();
  });

  it('renders 0', () => {
    render(<Badge count={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('is neutral by default and uses tabular numbers', () => {
    const { container } = render(<Badge count={3} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.getAttribute('data-tone')).toBe('neutral');
    expect(badge.className).toContain('tabular-nums');
  });

  it('label names the badge, even when the number is capped', () => {
    render(<Badge count={120} max={99} label="120 roles" />);
    const badge = screen.getByRole('img', { name: '120 roles' });
    expect(badge.textContent).toBe('99+');
  });

  it('without a label the number is plain text, not an image', () => {
    render(<Badge count={12} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('ignores children when count is set', () => {
    const { container } = render(<Badge count={5}>Ignored</Badge>);
    expect(container.textContent).toBe('5');
  });

  it('a text badge keeps children and no tabular-nums', () => {
    const { container } = render(<Badge>Draft</Badge>);
    expect(container.textContent).toBe('Draft');
    expect((container.firstElementChild as HTMLElement).className).not.toContain('tabular-nums');
  });
});

describe('Badge shape tokens (hds#757)', () => {
  const textBadge = () => {
    const { container } = render(<Badge tone="info">Beta</Badge>);
    return (container.firstElementChild as HTMLElement).className;
  };

  it('sits its corner a step under the action radius, still following role.radius', () => {
    const cls = textBadge();
    expect(cls).toMatch(/\brounded-sm\b/);
    expect(cls).not.toMatch(/\brounded-md\b/);
  });

  it('moves component.badge.paddingShift from top to bottom padding (optical centring)', () => {
    const cls = textBadge();
    expect(cls).toContain(
      'pt-[calc(var(--component-badge-paddingY)-var(--component-badge-paddingShift))]',
    );
    expect(cls).toContain(
      'pb-[calc(var(--component-badge-paddingY)+var(--component-badge-paddingShift))]',
    );
  });

  it('keeps height and min width on their tokens', () => {
    const cls = textBadge();
    expect(cls).toContain('h-[var(--component-badge-height)]');
    expect(cls).toContain('min-w-[var(--component-badge-minWidth)]');
  });
});

describe('Badge shape token values (hds#757)', () => {
  const badge = tokens.component.badge;

  it('is one step taller (22px, was 20px)', () => {
    expect(badge.height.$value).toBe('{primitive.size.22}');
    expect(badge.minWidth.$value).toBe('{primitive.size.22}');
  });

  it('sits its corner one step under the 8px action radius (6px)', () => {
    expect(badge.radius.$value).toBe('{primitive.radius.6}');
  });

  it('lifts the label 1px', () => {
    expect(badge.paddingShift.$value).toBe('{primitive.space.px1}');
  });
});

describe('Badge icon (hds#1437)', () => {
  const svgOf = (el: Element) => el.querySelector('svg[data-hds-icon]') as SVGElement | null;

  it('renders a leading aria-hidden icon before the label', () => {
    render(<Badge icon={CalendarDays}>Due Friday</Badge>);
    const badge = screen.getByText('Due Friday');
    const svg = svgOf(badge);
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(badge.firstElementChild).toBe(svg);
    expect(badge.textContent).toBe('Due Friday');
  });

  it('sizes the icon from the small icon token and spaces it with a scale token', () => {
    render(<Badge icon={Bell}>Alerts</Badge>);
    const badge = screen.getByText('Alerts');
    expect(svgOf(badge)!.style.width).toBe('var(--primitive-size-16)'); // tier-ok: asserts the Icon's own small-size output, which is primitive
    expect(badge.className).toContain('gap-scale-2xs');
  });

  it.each(['neutral', 'warning'] as const)(
    'works with the %s tone and inherits its text color',
    (tone) => {
      render(
        <Badge icon={Bell} tone={tone}>
          Tone
        </Badge>,
      );
      const badge = screen.getByText('Tone');
      expect(badge.getAttribute('data-tone')).toBe(tone);
      expect(badge.className).toContain(`text-[color:var(--component-badge-${tone}-text)]`);
      expect(svgOf(badge)!.getAttribute('stroke')).toBe('currentColor');
    },
  );

  it('leads a count badge too, and a badge without icon renders no svg', () => {
    const { container, rerender } = render(<Badge icon={Bell} count={3} />);
    expect(svgOf(container)).not.toBeNull();
    expect(container.textContent).toBe('3');
    rerender(<Badge>Plain</Badge>);
    expect(svgOf(container)).toBeNull();
  });

  it('dot wins over icon: renders the dot with no svg, and warns once in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Badge dot icon={Bell} />);
    expect(svgOf(container)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('`icon`');
    warn.mockRestore();
  });
});
