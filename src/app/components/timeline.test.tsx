import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check } from 'lucide-react';
import { Timeline, TimelineItem } from './timeline';

afterEach(cleanup);

// Local-time constructors keep day grouping independent of the runner's timezone.
const at = (d: number, h: number, m = 0) => new Date(2026, 6, d, h, m);

function renderFeed(order?: 'asc' | 'desc') {
  return render(
    <Timeline aria-label="History" order={order} locale="en-US">
      <TimelineItem date={at(3, 9)} title="Early on the 3rd" />
      <TimelineItem date={at(4, 8)} title="Morning of the 4th" />
      <TimelineItem date={at(3, 17)} title="Late on the 3rd" />
    </Timeline>,
  );
}

describe('Timeline', () => {
  it('is a semantic list of day groups, each with a day heading and its own list', () => {
    renderFeed();
    const feed = screen.getByRole('list', { name: 'History' });
    const days = within(feed).getAllByRole('heading', { level: 3 });
    expect(days.map((h) => h.textContent)).toEqual(['Jul 4, 2026', 'Jul 3, 2026']);
    for (const day of days) {
      const group = day.closest('li') as HTMLElement;
      expect(within(group).getByRole('list')).not.toBeNull();
    }
  });

  it('groups items by calendar day, whatever order they were passed in', () => {
    renderFeed();
    const jul3 = screen.getByRole('heading', { name: 'Jul 3, 2026' }).closest('li') as HTMLElement;
    expect(within(jul3).getAllByRole('listitem')).toHaveLength(2);
    expect(within(jul3).getByText('Early on the 3rd')).not.toBeNull();
    expect(within(jul3).getByText('Late on the 3rd')).not.toBeNull();
  });

  it('lists newest first by default, oldest first with order="asc"', () => {
    const titles = () => screen.getAllByText(/the (3rd|4th)/).map((el) => el.textContent);
    renderFeed();
    expect(titles()).toEqual(['Morning of the 4th', 'Late on the 3rd', 'Early on the 3rd']);
    cleanup();
    renderFeed('asc');
    expect(titles()).toEqual(['Early on the 3rd', 'Late on the 3rd', 'Morning of the 4th']);
  });

  it('renders each item time as a <time> element', () => {
    const { container } = renderFeed();
    const times = [...container.querySelectorAll('time[data-format="time"]')];
    expect(times).toHaveLength(3);
    expect(times[0].getAttribute('dateTime')).toBe(at(4, 8).toISOString());
  });

  it('maps tone to a feedback token on an icon marker, and neutral when absent', () => {
    const { container } = render(
      <Timeline aria-label="t">
        <TimelineItem date={at(1, 1)} title="a" tone="success" icon={Check} />
        <TimelineItem date={at(1, 2)} title="b" tone="danger" icon={Check} />
        <TimelineItem date={at(1, 3)} title="c" tone="warning" icon={Check} />
        <TimelineItem date={at(1, 4)} title="d" tone="info" icon={Check} />
        <TimelineItem date={at(1, 5)} title="e" />
      </Timeline>,
    );
    const marker = (title: string) =>
      (screen.getByText(title).closest('li') as HTMLElement).querySelector(
        '[data-timeline-marker]',
      ) as HTMLElement;
    expect(marker('a').getAttribute('data-tone')).toBe('success');
    expect(marker('a').className).toContain('--semantic-color-feedback-success');
    expect(marker('b').className).toContain('--semantic-color-feedback-error');
    expect(marker('c').className).toContain('--semantic-color-feedback-warning');
    expect(marker('d').className).toContain('--semantic-color-feedback-info');
    expect(marker('e').getAttribute('data-tone')).toBe('neutral');
    expect(marker('e').className).not.toContain('feedback');
    expect(container.querySelector('[style*="#"]')).toBeNull();
  });

  it('keeps a plain dot marker neutral whatever the tone: no status dots (hds#759)', () => {
    render(
      <Timeline aria-label="t">
        <TimelineItem date={at(1, 1)} title="a" tone="danger" />
      </Timeline>,
    );
    const marker = (screen.getByText('a').closest('li') as HTMLElement).querySelector(
      '[data-timeline-marker]',
    ) as HTMLElement;
    expect(marker.className).not.toContain('feedback');
    expect(marker.className).toContain('text-muted-foreground');
  });

  it('draws an optional icon in the marker, hidden from assistive tech', () => {
    const Dot = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="glyph" {...props} />;
    render(
      <Timeline aria-label="t">
        <TimelineItem date={at(1, 1)} title="a" icon={Dot as never} />
      </Timeline>,
    );
    const glyph = screen.getByTestId('glyph');
    expect(glyph.closest('[data-timeline-marker]')).not.toBeNull();
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
  });

  it('expands an item with details via keyboard, and plain items have no toggle', async () => {
    const user = userEvent.setup();
    render(
      <Timeline aria-label="t">
        <TimelineItem date={at(1, 1)} title="Has details">
          Deploy log text
        </TimelineItem>
        <TimelineItem date={at(1, 2)} title="Plain" />
      </Timeline>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    const toggle = screen.getByRole('button', { name: /Has details/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Deploy log text')).toBeNull();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Deploy log text')).not.toBeNull();
    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('adds no entrance animation of its own (motion lives in Disclosure, which honours reduced motion)', () => {
    const { container } = renderFeed();
    const html = container.innerHTML;
    expect(html).not.toMatch(/animate-|transition|@keyframes|animation/);
  });
});
