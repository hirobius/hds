/**
 * Tests for the Card compound assembly (hds#363): the parts hang off the root
 * through one pure `Object.assign`, not top-level property writes, so a
 * Button-only consumer bundle can drop the whole module.
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  CardProgress,
  CardMetric,
} from './card';

afterEach(cleanup);

describe('Card compound assembly (hds#363)', () => {
  it('keeps every static part and the display name', () => {
    expect(Card.displayName).toBe('Card');
    expect(Card.Header).toBe(CardHeader);
    expect(Card.Title).toBe(CardTitle);
    expect(Card.Description).toBe(CardDescription);
    expect(Card.Body).toBe(CardBody);
    expect(Card.Footer).toBe(CardFooter);
    expect(Card.Progress).toBe(CardProgress);
    expect(Card.Metric).toBe(CardMetric);
  });

  it('forwards the ref and renders the anatomy', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Card ref={ref} variant="accent" padding="none">
        <Card.Header>
          <Card.Title>Discovery</Card.Title>
        </Card.Header>
        <Card.Body>Body</Card.Body>
      </Card>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('data-variant')).toBe('accent');
    expect(screen.getByText('Discovery')).toBeTruthy();
  });
});
