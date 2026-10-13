/**
 * Tests for Text — the `tone` prop (hds#655).
 * Each tone resolves to one semantic content colour variable; with no tone the
 * colour stays inherited, so existing call sites render exactly as before.
 * Expected variables are spelled out literally (the issue's mapping), not
 * derived from the component's own table.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Text, type TextTone } from './text';

afterEach(cleanup);

const EXPECTED: Array<[TextTone, string]> = [
  ['primary', '--semantic-color-content-primary'],
  ['secondary', '--semantic-color-content-secondary'],
  ['disabled', '--semantic-color-content-disabled'],
  ['accent', '--semantic-accent-content'],
  ['success', '--semantic-color-feedback-success'],
  ['warning', '--semantic-color-feedback-warning'],
  ['danger', '--semantic-color-feedback-error'],
  ['info', '--semantic-color-feedback-info'],
];

function colourClasses(el: HTMLElement): string[] {
  return Array.from(el.classList).filter((c) => c.startsWith('text-['));
}

describe('Text tone', () => {
  it.each(EXPECTED)('tone="%s" colours the text with var(%s)', (tone, cssVar) => {
    render(
      <Text variant="caption" tone={tone}>
        meta
      </Text>,
    );
    expect(colourClasses(screen.getByText('meta'))).toEqual([`text-[var(${cssVar})]`]);
  });

  it('leaves the colour inherited when no tone is set (default output unchanged)', () => {
    render(<Text variant="caption">meta</Text>);
    const el = screen.getByText('meta');
    expect(colourClasses(el)).toEqual([]);
    expect(el.className).toBe('m-0 min-w-0 hds-type-caption');
    expect(el.getAttribute('style')).toBeNull();
  });

  it('lets a consumer className still win over the tone colour', () => {
    render(
      <Text
        variant="body"
        tone="secondary"
        // eslint-disable-next-line tailwindcss/no-arbitrary-value -- a consumer override expressed as a token var(), the exact class the tone would emit
        className="text-[var(--semantic-color-content-primary)]"
      >
        body
      </Text>,
    );
    expect(colourClasses(screen.getByText('body'))).toEqual([
      'text-[var(--semantic-color-content-primary)]',
    ]);
  });
});
