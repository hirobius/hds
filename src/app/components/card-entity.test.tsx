/**
 * Entity card (hds#872): Card.Source (avatar, name, time) and Card.Facts
 * (a caption list of icon + label, one per line), composed with the Header, Footer
 * and actions of a job-style card.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MapPin, Banknote, Briefcase } from 'lucide-react';
import { Card, CardSource, CardFacts } from './card';
import { Avatar } from './avatar';
import { Timestamp } from './timestamp';

afterEach(cleanup);

const NOW = new Date('2026-10-21T12:00:00Z');

function JobCard() {
  return (
    <Card data-testid="card">
      <Card.Source
        avatar={<Avatar size="sm" initials="AC" alt="" />}
        name="Acme Corp"
        time={<Timestamp date="2026-10-21T10:00:00Z" format="relative" now={NOW} />}
      />
      <Card.Header>
        <Card.Title>Senior product designer</Card.Title>
      </Card.Header>
      <Card.Facts
        items={[
          { icon: MapPin, label: 'Remote' },
          { icon: Banknote, label: '$120k to $150k' },
          { icon: Briefcase, label: 'Full time' },
        ]}
      />
      <Card.Footer>
        <button type="button">Apply</button>
      </Card.Footer>
    </Card>
  );
}

describe('Card.Source', () => {
  it('is exported and attached to Card', () => {
    expect(Card.Source).toBe(CardSource);
    expect(Card.Facts).toBe(CardFacts);
  });

  it('renders the avatar, the name and the time', () => {
    const { container } = render(<JobCard />);
    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(container.querySelector('[data-slot="card-source"] [data-size="sm"]')).toBeTruthy();
    const time = container.querySelector('[data-slot="card-source"] time');
    expect(time?.getAttribute('datetime')).toBe('2026-10-21T10:00:00.000Z');
  });

  it('renders without a time', () => {
    render(<Card.Source name="Acme Corp" />);
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });
});

describe('Card.Facts', () => {
  it('renders each fact as a list item with its label', () => {
    render(<JobCard />);
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['Remote', '$120k to $150k', 'Full time']);
  });

  it('keeps every icon decorative at 16px', () => {
    render(<JobCard />);
    const svgs = screen.getByRole('list').querySelectorAll('svg');
    expect(svgs).toHaveLength(3);
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      // tier-ok: asserts the emitted primitive
      expect(svg.style.width).toBe('var(--primitive-size-16)');
    });
  });

  const FACTS = [
    { icon: MapPin, label: 'Remote' },
    { icon: Banknote, label: '$120k to $150k' },
  ];

  it('stacks one fact per line by default, icons on the first text line', () => {
    render(<Card.Facts items={FACTS} />);
    const list = screen.getByRole('list');
    expect(list.className).toContain('flex-col');
    within(list)
      .getAllByRole('listitem')
      .forEach((li) => {
        expect(li.className).toContain('items-start');
        expect(li.className).not.toContain('items-center');
      });
  });

  it('stacks with layout="stacked" too', () => {
    render(<Card.Facts layout="stacked" items={FACTS} />);
    expect(screen.getByRole('list').className).toContain('flex-col');
  });

  it('keeps the old wrapping row with layout="inline"', () => {
    render(<Card.Facts layout="inline" items={FACTS} />);
    const list = screen.getByRole('list');
    expect(list.className).toContain('flex-wrap');
    expect(list.className).not.toContain('flex-col');
    within(list)
      .getAllByRole('listitem')
      .forEach((li) => {
        expect(li.className).toContain('items-center');
        expect(li.className).not.toContain('items-start');
      });
  });

  describe('truncateFirst', () => {
    const LONG = 'Remote within the EU, with a quarterly team week in Lisbon';
    const LONG_FACTS = [
      { icon: MapPin, label: LONG },
      { icon: Banknote, label: '$120k to $150k' },
    ];

    it.each(['stacked', 'inline'] as const)('clamps only the first fact in %s', (layout) => {
      render(<Card.Facts layout={layout} truncateFirst items={LONG_FACTS} />);
      const [first, second] = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(first.className).toContain('min-w-0');
      expect(first.className).toContain('max-w-full');
      const label = first.querySelector('[data-slot="card-fact-label"]');
      expect(label?.className).toContain('truncate');
      expect(label?.className).toContain('min-w-0');
      expect(second.querySelector('[data-slot="card-fact-label"]')).toBeNull();
      expect(second.className).not.toContain('min-w-0');
    });

    it('keeps the full text in the DOM and on title, and the icon at full size', () => {
      render(<Card.Facts truncateFirst items={LONG_FACTS} />);
      const first = within(screen.getByRole('list')).getAllByRole('listitem')[0];
      expect(first.textContent).toBe(LONG);
      expect(first.getAttribute('title')).toBe(LONG);
      expect(first.querySelector('svg')?.getAttribute('class')).toContain('shrink-0');
    });

    it('does nothing by default', () => {
      render(<Card.Facts items={LONG_FACTS} />);
      const first = within(screen.getByRole('list')).getAllByRole('listitem')[0];
      expect(first.className).not.toContain('min-w-0');
      expect(first.getAttribute('title')).toBeNull();
      expect(first.querySelector('[data-slot="card-fact-label"]')).toBeNull();
    });
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<Card.Facts items={[]} />);
    expect(container.querySelector('ul')).toBeNull();
  });
});

describe('entity card order', () => {
  it('puts the source first and the actions after the title', () => {
    render(<JobCard />);
    const source = screen.getByText('Acme Corp');
    const title = screen.getByRole('heading', { level: 3 });
    const facts = screen.getByRole('list');
    const apply = screen.getByRole('button', { name: 'Apply' });
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(source, title)).toBe(true);
    expect(follows(title, facts)).toBe(true);
    expect(follows(facts, apply)).toBe(true);
  });
});
