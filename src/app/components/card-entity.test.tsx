/**
 * Entity card (hds#872): Card.Source (avatar, name, time) and Card.Facts
 * (a wrapping caption row of icon + label), composed with the Header, Footer
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

  it('wraps on narrow widths', () => {
    render(<JobCard />);
    expect(screen.getByRole('list').className).toContain('flex-wrap');
  });

  it('stacks one fact per line, icons on the first text line, with layout="stacked"', () => {
    render(
      <Card.Facts
        layout="stacked"
        items={[
          { icon: MapPin, label: 'Remote' },
          { icon: Banknote, label: '$120k to $150k' },
        ]}
      />,
    );
    const list = screen.getByRole('list');
    expect(list.className).toContain('flex-col');
    const items = within(list).getAllByRole('listitem');
    items.forEach((li) => {
      expect(li.className).toContain('items-start');
      expect(li.className).not.toContain('items-center');
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
