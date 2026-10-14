/**
 * Contract test: Button accessibility rules (hds#520).
 *
 * Each `it` title carries the `a11y:<id>` the Button `@a11y component` tags point
 * at, so check-a11y-contracts can prove every rule has a test. Keyboard cases
 * drive a real keyboard (user-event), not synthetic clicks.
 *
 * @primitive Button
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { Button } from '@/app/components/button';
import { Icon } from '@/app/components/icon';

afterEach(cleanup);

/** Tailwind spacing class (`h-8`) to px, at the 4px scale. */
function px(className: string, axis: 'h' | 'w'): number | undefined {
  const match = className.split(/\s+/).find((c) => new RegExp(`^${axis}-\\d+$`).test(c));
  return match ? Number(match.slice(2)) * 4 : undefined;
}

describe('Button accessibility contract', () => {
  it('a11y:button.keyboard-activate - Enter and Space both activate it', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save' }));
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('a11y:button.focus-ring - keyboard focus draws a ring from utilities and never removes the outline bare', () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole('button').className.split(/\s+/);
    expect(cls).toContain('focus-visible:ring-2');
    expect(cls).toContain('focus-visible:ring-ring');
    // outline-none is only allowed because the ring replaces it
    expect(cls).toContain('focus-visible:outline-none');
  });

  it('a11y:button.loading-busy - loading sets aria-busy, disables the button and hides the spinner', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:button.toggle-pressed - a toggle reports its state with aria-pressed and flips it on activation', async () => {
    const user = userEvent.setup();
    render(<Button defaultPressed={false}>Bold</Button>);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await user.tab();
    await user.keyboard(' ');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Enter}');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('a11y:button.aschild-disabled - a disabled slotted link is aria-disabled and leaves the tab order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button asChild disabled>
          <a href="/x">Docs</a>
        </Button>
        <Button>After</Button>
      </>,
    );
    const link = screen.getByText('Docs');
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });

  it('a11y:button.icon-only-name - an icon-only button takes its name from label', () => {
    render(<Button iconOnly label="Search" iconLeft={<Icon icon={Search} size="small" />} />);
    expect(screen.getByRole('button', { name: 'Search' })).not.toBeNull();
  });

  it('a11y:button.target-size - every size is at least 24px tall, and an icon-only one at least 24px wide', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(
        <>
          <Button size={size}>Text</Button>
          <Button
            size={size}
            iconOnly
            label="Icon"
            iconLeft={<Icon icon={Search} size="small" />}
          />
        </>,
      );
      const [text, icon] = screen.getAllByRole('button');
      expect(px(text.className, 'h'), `${size} height`).toBeGreaterThanOrEqual(24);
      expect(px(icon.className, 'h'), `${size} icon height`).toBeGreaterThanOrEqual(24);
      expect(px(icon.className, 'w'), `${size} icon width`).toBeGreaterThanOrEqual(24);
      unmount();
    }
  });

  it('a11y:button.reduced-motion - the loading spinner stops under prefers-reduced-motion', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button').querySelector('svg')?.getAttribute('class')).toContain(
      'motion-reduce:animate-none',
    );
  });
});
