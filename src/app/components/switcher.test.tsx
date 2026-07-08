import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Switcher } from './switcher';

afterEach(cleanup);

describe('Switcher', () => {
  it('renders all children', () => {
    render(
      <Switcher>
        <div>a</div>
        <div>b</div>
      </Switcher>,
    );
    expect(screen.getByText('a')).not.toBeNull();
    expect(screen.getByText('b')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(
      <Switcher as="section">
        <div>a</div>
      </Switcher>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Switcher ref={ref}>
        <div>a</div>
      </Switcher>,
    );
    expect(ref.current).not.toBeNull();
  });

  it('applies the tokenized gap and a calc() flex-basis keyed to threshold on each item', () => {
    const { container } = render(
      <Switcher threshold="24rem" gap="inset">
        <div>a</div>
        <div>b</div>
      </Switcher>,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.gap).toBe('var(--semantic-space-layout-inset)');
    const [itemA] = Array.from(outer.childNodes) as HTMLElement[];
    // jsdom's CSSOM normalizes calc() operand order (999 * (...)) — assert on
    // the normalized form rather than the literal source string.
    expect(itemA.style.flexBasis).toBe('calc(999 * (24rem - 100%))');
    expect(itemA.style.flexGrow).toBe('1');
  });

  it('forces column direction once children exceed `limit`, regardless of threshold', () => {
    const { container } = render(
      <Switcher limit={2}>
        <div>a</div>
        <div>b</div>
        <div>c</div>
      </Switcher>,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.flexDirection).toBe('column');
  });

  it('does not force column direction when children are within `limit`', () => {
    const { container } = render(
      <Switcher limit={3}>
        <div>a</div>
        <div>b</div>
      </Switcher>,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.flexDirection).toBe('');
  });
});
