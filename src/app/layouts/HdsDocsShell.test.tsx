import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsDocsShell } from './HdsDocsShell';

afterEach(cleanup);

describe('HdsDocsShell', () => {
  it('always renders content, even with no rails', () => {
    render(
      <HdsDocsShell>
        <div>content</div>
      </HdsDocsShell>,
    );
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('renders leftRail and rightRail when provided', () => {
    render(
      <HdsDocsShell leftRail={<div>left</div>} rightRail={<div>right</div>}>
        <div>content</div>
      </HdsDocsShell>,
    );
    expect(screen.getByText('left')).not.toBeNull();
    expect(screen.getByText('right')).not.toBeNull();
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('omits a rail from the DOM entirely when not provided', () => {
    const { container } = render(
      <HdsDocsShell leftRail={<div>left</div>}>
        <div>content</div>
      </HdsDocsShell>,
    );
    expect(container.querySelectorAll('[data-hds-component="HdsDocsShell"] > div').length).toBe(2);
  });

  it('defaults topOffset to 0px on each rail', () => {
    render(
      <HdsDocsShell leftRail={<div data-testid="left-rail">left</div>}>
        <div>content</div>
      </HdsDocsShell>,
    );
    const rail = screen.getByTestId('left-rail').parentElement as HTMLElement;
    expect(rail.style.top).toBe('0px');
    expect(rail.style.height).toBe('calc(100dvh - 0px)');
  });

  it('composes a caller-supplied topOffset into the sticky/height calc', () => {
    render(
      <HdsDocsShell leftRail={<div data-testid="left-rail">left</div>} topOffset="56px">
        <div>content</div>
      </HdsDocsShell>,
    );
    const rail = screen.getByTestId('left-rail').parentElement as HTMLElement;
    expect(rail.style.top).toBe('56px');
    expect(rail.style.height).toBe('calc(100dvh - 56px)');
  });

  it('forwards the ref to the outer grid element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HdsDocsShell ref={ref}>
        <div>content</div>
      </HdsDocsShell>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.dataset.hdsComponent).toBe('HdsDocsShell');
  });
});
