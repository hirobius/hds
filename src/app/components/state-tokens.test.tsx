/**
 * hds#595 decisions 1-4: rendered classes bind the state tokens.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Button } from './button';
import { Badge } from './badge';
import { InlineCode } from './inline-code';

afterEach(cleanup);

const cls = (el: Element) => el.className.split(/\s+/);

describe('Button state tokens', () => {
  it('primary hover binds component.button.bgHover, not an opacity mix', () => {
    const { getByRole } = render(<Button variant="primary">Go</Button>);
    const c = cls(getByRole('button'));
    expect(c).toContain('hover:bg-[color:var(--component-button-bgHover)]');
    expect(c).not.toContain('hover:bg-primary/90');
  });

  it('secondary pressed binds the pressed fill and drops the inset wash', () => {
    const { getByRole } = render(<Button variant="secondary">Go</Button>);
    const c = cls(getByRole('button'));
    expect(c).toContain('active:bg-[color:var(--component-button-secondary-bg-pressed)]');
    expect(c).not.toContain('active:inset-shadow-pressed-overlay/5');
  });

  it('primary and tertiary keep the pressed wash (no pressed token)', () => {
    for (const variant of ['primary', 'tertiary'] as const) {
      const { getByRole, unmount } = render(<Button variant={variant}>Go</Button>);
      expect(cls(getByRole('button'))).toContain('active:inset-shadow-pressed-overlay/5');
      unmount();
    }
  });

  it('secondary disabled border binds component.button.secondary.border.disabled', () => {
    const { getByRole } = render(
      <Button variant="secondary" disabled>
        Go
      </Button>,
    );
    expect(cls(getByRole('button'))).toContain(
      'disabled:border-[color:var(--component-button-secondary-border-disabled)]',
    );
  });

  it('a tone still beats the secondary variant on pressed fill, wash and disabled border', () => {
    const { getByRole } = render(
      <Button variant="secondary" tone="danger">
        Go
      </Button>,
    );
    const c = cls(getByRole('button'));
    expect(c).not.toContain('active:bg-[color:var(--component-button-secondary-bg-pressed)]');
    expect(c).not.toContain(
      'disabled:border-[color:var(--component-button-secondary-border-disabled)]',
    );
    expect(c).toContain('active:bg-feedback-bg-danger');
    expect(c).toContain('active:inset-shadow-pressed-overlay/5');
    expect(c).toContain('disabled:border-transparent');
  });
});

describe('Badge per-tone tokens', () => {
  const TONES = ['neutral', 'info', 'success', 'danger', 'warning', 'inProgress'] as const;
  for (const tone of TONES) {
    it(`${tone} binds component.badge.${tone}.bg and .text`, () => {
      const { getByText } = render(<Badge tone={tone}>x</Badge>);
      const c = cls(getByText('x'));
      expect(c).toContain(`bg-[color:var(--component-badge-${tone}-bg)]`);
      expect(c).toContain(`text-[color:var(--component-badge-${tone}-text)]`);
      expect(c.some((k) => k.startsWith('dark:'))).toBe(false);
    });
  }
});

describe('InlineCode', () => {
  it('no longer borrows the badge token', () => {
    const { container } = render(<InlineCode>x</InlineCode>);
    const code = container.querySelector('code')!;
    expect(code.className).not.toContain('--component-badge-');
    expect(code.className).toContain('bg-[color:var(--semantic-color-surface-overlay)]');
  });
});
