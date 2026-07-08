import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Sidebar } from './sidebar';

afterEach(cleanup);

describe('Sidebar', () => {
  it('renders both children and forwards content', () => {
    render(
      <Sidebar>
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    expect(screen.getByText('rail')).not.toBeNull();
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(
      <Sidebar as="section">
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Sidebar ref={ref}>
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    expect(ref.current).not.toBeNull();
  });

  it('applies flex-wrap and the tokenized gap', () => {
    const { container } = render(
      <Sidebar gap="inset">
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.display).toBe('flex');
    expect(el.style.flexWrap).toBe('wrap');
    expect(el.style.gap).toBe('var(--semantic-space-layout-inset)');
  });

  it('gives the rail sideWidth flex-basis and the content flex-grow:999 with contentMin', () => {
    const { container } = render(
      <Sidebar sideWidth="18rem" contentMin="24rem">
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    const [railWrap, contentWrap] = Array.from(container.firstChild!.childNodes) as HTMLElement[];
    expect(railWrap.style.flexBasis).toBe('18rem');
    expect(contentWrap.style.flexGrow).toBe('999');
    expect(contentWrap.style.minWidth).toBe('24rem');
  });

  it('visually reorders the rail to the end when side="end" without changing DOM order', () => {
    const { container } = render(
      <Sidebar side="end">
        <div>rail</div>
        <div>content</div>
      </Sidebar>,
    );
    const [railWrap, contentWrap] = Array.from(container.firstChild!.childNodes) as HTMLElement[];
    expect(railWrap.textContent).toBe('rail');
    expect(railWrap.style.order).toBe('2');
    expect(contentWrap.style.order).toBe('1');
  });
});
