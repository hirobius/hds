import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Rocket } from 'lucide-react';
import { ActivityFeed, defaultActivityEvents } from './activity-feed';
import type { ActivityEvent, ActivityTone } from './activity-feed';
import { Icon } from './icon';

afterEach(cleanup);

function makeEvent(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'evt-test',
    title: 'Test Event',
    description: 'A test event description.',
    timestamp: '2026-07-08 · 00:00',
    category: 'Test',
    icon: <Icon icon={Rocket} size="medium" />,
    ...overrides,
  };
}

const TONES: ActivityTone[] = ['neutral', 'danger', 'success', 'warning', 'info'];

describe('ActivityFeed', () => {
  it('renders the default demo events', () => {
    const { container } = render(<ActivityFeed events={defaultActivityEvents} />);
    expect(container.querySelectorAll('li')).toHaveLength(defaultActivityEvents.length);
  });

  it('defaults to the neutral tone when neither tone nor status is set', () => {
    const { container } = render(<ActivityFeed events={[makeEvent({})]} />);
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
  });

  it.each(TONES)('renders the %s tone via the tone prop', (tone) => {
    const { container } = render(<ActivityFeed events={[makeEvent({ tone })]} />);
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe(tone);
  });

  it('resolves the deprecated status="error" alias to the danger tone', () => {
    const { container } = render(<ActivityFeed events={[makeEvent({ status: 'error' })]} />);
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('danger');
  });

  it('resolves other deprecated status values 1:1 onto tone', () => {
    for (const status of ['success', 'warning', 'info', 'neutral'] as const) {
      const { container } = render(
        <ActivityFeed events={[makeEvent({ id: `s-${status}`, status })]} />,
      );
      expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe(status);
      cleanup();
    }
  });

  it('produces identical output for status="error" and tone="danger" (zero-change alias proof)', () => {
    const statusRender = render(
      <ActivityFeed events={[makeEvent({ id: 'x', status: 'error' })]} />,
    );
    const statusHtml = statusRender.container.innerHTML;
    cleanup();

    const toneRender = render(<ActivityFeed events={[makeEvent({ id: 'x', tone: 'danger' })]} />);
    const toneHtml = toneRender.container.innerHTML;

    expect(statusHtml).toBe(toneHtml);
  });

  it('prefers the tone prop over a conflicting deprecated status', () => {
    const conflictingEvent = makeEvent({
      tone: 'success',
      status: 'error',
    });
    const { container } = render(<ActivityFeed events={[conflictingEvent]} />);
    expect(container.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('success');
  });
});
