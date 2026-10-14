/**
 * Contract test: Card accessibility rules (hds#520). Only the selectable mode owns
 * operable behaviour; the rest of Card is a surface. Each `it` title carries the
 * `a11y:<id>` the Card `@a11y component` tags point at. Keyboard cases drive a real
 * keyboard (user-event).
 *
 * @primitive Card
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '@/app/components/card';

afterEach(cleanup);

describe('Card accessibility contract', () => {
  it('a11y:card.selectable-role - a selectable card is a focusable checkbox that reports aria-checked; a plain card is neither', () => {
    const { rerender } = render(
      <Card selectable selected={false} onSelectedChange={() => {}}>
        Plan A
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.getAttribute('aria-checked')).toBe('false');
    expect(card.getAttribute('tabindex')).toBe('0');
    rerender(
      <Card selectable selected onSelectedChange={() => {}}>
        Plan A
      </Card>,
    );
    expect(card.getAttribute('aria-checked')).toBe('true');
    rerender(<Card>Plan A</Card>);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('Plan A').getAttribute('tabindex')).toBeNull();
  });

  it('a11y:card.space-toggles - Space toggles a focused selectable card and Enter does not', async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <Card selectable selected={false} onSelectedChange={onSelectedChange}>
        Plan B
      </Card>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Plan B' }));
    await user.keyboard('{Enter}');
    expect(onSelectedChange).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it('a11y:card.nested-controls - a key or click inside a control in the card is left to that control', async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(
      <Card selectable selected={false} onSelectedChange={onSelectedChange}>
        Plan C
        <input aria-label="Seats" />
        <button type="button">More</button>
      </Card>,
    );
    await user.click(screen.getByLabelText('Seats'));
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('a11y:card.selection-not-colour-only - selection adds a 2px ring and aria-checked, not a colour change alone', () => {
    const { rerender } = render(
      <Card selectable selected onSelectedChange={() => {}}>
        Plan D
      </Card>,
    );
    const card = screen.getByRole('checkbox');
    expect(card.getAttribute('data-selected')).toBe('true');
    expect(card.className).toContain('data-[selected=true]:ring-2');
    expect(card.className).toContain('data-[selected=true]:ring-inset');
    rerender(
      <Card selectable selected={false} onSelectedChange={() => {}}>
        Plan D
      </Card>,
    );
    expect(card.getAttribute('data-selected')).toBe('false');
  });

  it('a11y:card.focus-ring - a selectable card carries the shared focus ring class', () => {
    render(
      <Card selectable onSelectedChange={() => {}}>
        Plan E
      </Card>,
    );
    expect(screen.getByRole('checkbox').className).toContain('hds-focus');
  });

  it('a11y:card.title-heading - Card.Title is a heading that takes its level from as', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Default</Card.Title>
          <Card.Title as="h2">Chosen</Card.Title>
        </Card.Header>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Default' })).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Chosen' })).not.toBeNull();
  });

  it('a11y:card.progress-name - Card.Progress is a progressbar with a name and its value', () => {
    render(
      <Card>
        <Card.Progress value={40} max={100} label="4 of 10 tasks" />
        <Card.Progress value={10} max={100} />
      </Card>,
    );
    const [named, fallback] = screen.getAllByRole('progressbar');
    expect(named.getAttribute('aria-label')).toBe('4 of 10 tasks');
    expect(named.getAttribute('aria-valuenow')).toBe('40');
    expect(fallback.getAttribute('aria-label')).toBe('Progress');
  });
});
