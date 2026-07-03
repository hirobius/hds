/**
 * Tests for Text — variant→default-tag mapping, `as` override, prop/class
 * passthrough, and ref forwarding. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { Text } from './text';

afterEach(cleanup);

describe('Text', () => {
  it('renders each variant in its default semantic tag', () => {
    const { unmount } = render(<Text variant="heading2">Title</Text>);
    expect(screen.getByText('Title').tagName).toBe('H2');
    unmount();

    render(<Text variant="body">Copy</Text>);
    expect(screen.getByText('Copy').tagName).toBe('P');
  });

  it('renders docCode as a span by default', () => {
    render(<Text variant="docCode">code</Text>);
    expect(screen.getByText('code').tagName).toBe('SPAN');
  });

  it('honors the `as` tag override', () => {
    render(
      <Text variant="heading1" as="h3">
        Heading
      </Text>,
    );
    expect(screen.getByText('Heading').tagName).toBe('H3');
  });

  it('passes through className and arbitrary props', () => {
    render(
      <Text variant="body" className="custom" data-testid="t">
        Copy
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.className).toContain('custom');
  });

  it('forwards its ref to the rendered element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text variant="heading1" ref={ref}>
        Heading
      </Text>,
    );
    expect(ref.current?.tagName).toBe('H1');
  });
});
