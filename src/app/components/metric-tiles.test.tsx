import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MetricTile, MetricTiles } from './metric-tiles';

afterEach(cleanup);

const TONES = ['neutral', 'success', 'warning', 'danger', 'info'] as const;

function tileMinHeight(ui: React.ReactElement) {
  const { container, unmount } = render(ui);
  const tile = container.querySelector('[data-hds-component="MetricTile"]') as HTMLElement;
  const value = tile.style.minHeight;
  unmount();
  return value;
}

describe('MetricTile', () => {
  it('has one fixed min-height for every tone, with or without sub', () => {
    const heights = new Set<string>();
    for (const tone of TONES) {
      heights.add(tileMinHeight(<MetricTile label="Open" value="12" tone={tone} />));
      heights.add(
        tileMinHeight(<MetricTile label="Open" value="12" sub="this week" tone={tone} />),
      );
    }
    expect(heights.size).toBe(1);
    expect([...heights][0]).not.toBe('');
  });

  it('renders label, value and sub', () => {
    const { getByText } = render(<MetricTile label="Retainer" value="$3,500" sub="Active" />);
    expect(getByText('Retainer')).not.toBeNull();
    expect(getByText('$3,500')).not.toBeNull();
    expect(getByText('Active')).not.toBeNull();
  });

  it('reserves the sub line when sub is absent', () => {
    const { container } = render(<MetricTile label="Open" value="12" />);
    expect(container.querySelectorAll('p')).toHaveLength(3);
  });

  it('records the tone on the tile', () => {
    const { container } = render(<MetricTile label="Late" value="3" tone="danger" />);
    expect(container.querySelector('[data-tone="danger"]')).not.toBeNull();
  });
});

describe('MetricTiles', () => {
  const grid = (container: HTMLElement) =>
    container.querySelector('[data-hds-component="Grid"]') as HTMLElement;

  it('resolves 3 tiles to a 3-column grid', () => {
    const { container } = render(
      <MetricTiles>
        <MetricTile label="A" value="1" />
        <MetricTile label="B" value="2" />
        <MetricTile label="C" value="3" />
      </MetricTiles>,
    );
    expect(grid(container).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('caps the row at 4 columns', () => {
    const { container } = render(
      <MetricTiles>
        {['A', 'B', 'C', 'D', 'E', 'F'].map((l) => (
          <MetricTile key={l} label={l} value="1" />
        ))}
      </MetricTiles>,
    );
    expect(grid(container).style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('never resolves to zero columns', () => {
    const { container } = render(<MetricTiles>{null}</MetricTiles>);
    expect(grid(container).style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))');
  });

  it('counts tiles wrapped in a fragment', () => {
    const { container } = render(
      <MetricTiles>
        <>
          <MetricTile label="A" value="1" />
          <MetricTile label="B" value="2" />
        </>
        <MetricTile label="C" value="3" />
      </MetricTiles>,
    );
    expect(grid(container).style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('forwards a ref and HTML attributes to its root', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <MetricTiles ref={ref} aria-label="Key numbers" id="key-numbers" className="mt-4">
        <MetricTile label="A" value="1" />
      </MetricTiles>,
    );
    const root = container.querySelector('[data-hds-component="MetricTiles"]') as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.getAttribute('aria-label')).toBe('Key numbers');
    expect(root.id).toBe('key-numbers');
    expect(root.classList.contains('mt-4')).toBe(true);
    expect(root.contains(grid(container))).toBe(true);
  });
});
