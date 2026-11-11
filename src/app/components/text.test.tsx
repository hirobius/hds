/**
 * Tests for Text — the `tone` prop (hds#655).
 * Each tone resolves to one semantic content colour variable; with no tone the
 * colour stays inherited, so existing call sites render exactly as before.
 * Expected variables are spelled out literally (the issue's mapping), not
 * derived from the component's own table.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { __resetDeprecationWarnings } from '../../lib/deprecation';
import { Text, type TextProps, type TextTone } from './text';

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

// hds#825: `weight` steps a role's weight to one of the shipped weight tokens.
const weightClasses = (el: HTMLElement) =>
  [...el.classList].filter((c) => c.startsWith('[font-weight:'));

describe('Text weight', () => {
  const cases: Array<[NonNullable<TextProps['weight']>, string]> = [
    // tier-ok: asserts the emitted primitive
    ['regular', '[font-weight:var(--primitive-typography-weight-regular)]'],
    // tier-ok: asserts the emitted primitive
    ['medium', '[font-weight:var(--primitive-typography-weight-regular)]'],
    // tier-ok: asserts the emitted primitive
    ['bold', '[font-weight:var(--primitive-typography-weight-bold)]'],
  ];

  it.each(cases)('maps weight="%s" to its weight token', (weight, expected) => {
    render(
      <Text variant="body" weight={weight}>
        name
      </Text>,
    );
    expect(weightClasses(screen.getByText('name'))).toEqual([expected]);
  });

  it('keeps the role weight when no weight is set', () => {
    render(<Text variant="body">name</Text>);
    expect(weightClasses(screen.getByText('name'))).toEqual([]);
  });
});

// hds#916: `truncate` cuts to one line with an ellipsis and shrinks in a flex
// row; `lineClamp` cuts to 2, 3 or 4 lines, wrapping on word boundaries.
const OVERFLOW_CLASSES = [
  'block',
  'truncate',
  'line-clamp-2',
  'line-clamp-3',
  'line-clamp-4',
  'wrap-break-word',
  'wrap-anywhere',
  'break-all',
];
const overflowClasses = (el: HTMLElement) =>
  [...el.classList].filter((c) => OVERFLOW_CLASSES.includes(c));

describe('Text truncate', () => {
  it('cuts to one line with an ellipsis and can shrink in a flex row', () => {
    render(
      <Text variant="ui" truncate>
        long
      </Text>,
    );
    const el = screen.getByText('long');
    expect(overflowClasses(el)).toEqual(['block', 'truncate']);
    expect(el.classList.contains('min-w-0')).toBe(true);
  });

  it('truncates a mono span too (a span is made a block so the ellipsis applies)', () => {
    render(
      <Text variant="mono" truncate>
        id
      </Text>,
    );
    const el = screen.getByText('id');
    expect(el.tagName).toBe('SPAN');
    expect(overflowClasses(el)).toEqual(['block', 'truncate']);
  });
});

describe('Text lineClamp', () => {
  it.each([2, 3, 4] as const)('lineClamp={%i} clamps to that many lines', (lines) => {
    render(
      <Text variant="body" lineClamp={lines}>
        para
      </Text>,
    );
    expect(overflowClasses(screen.getByText('para'))).toEqual([
      `line-clamp-${lines}`,
      'wrap-anywhere',
    ]);
  });

  // overflow-wrap: anywhere breaks between words first and inside a word only
  // when that word alone is wider than the line; unlike break-word it also
  // lets the min-content width shrink, so a long query never widens its
  // flex or grid track. word-break: break-all would cut every word.
  it('wraps a mono run on word boundaries, never cutting every word', () => {
    render(
      <Text variant="mono" lineClamp={4}>
        query
      </Text>,
    );
    const classes = overflowClasses(screen.getByText('query'));
    expect(classes).toEqual(['line-clamp-4', 'wrap-anywhere']);
    expect(classes).not.toContain('break-all');
  });
});

describe('Text overflow props absent', () => {
  it('adds no overflow class and no style when neither prop is set', () => {
    render(<Text variant="body">plain</Text>);
    const el = screen.getByText('plain');
    expect(overflowClasses(el)).toEqual([]);
    expect(el.className).toBe(
      'm-0 min-w-0 hds-type-body max-w-[var(--semantic-typography-body-max-width)]',
    );
    expect(el.getAttribute('style')).toBeNull();
  });

  it('treats truncate={false} as absent', () => {
    render(
      <Text variant="ui" truncate={false}>
        off
      </Text>,
    );
    expect(overflowClasses(screen.getByText('off'))).toEqual([]);
  });

  it('rejects truncate and lineClamp together at the type level', () => {
    // @ts-expect-error -- truncate and lineClamp are mutually exclusive (hds#916)
    const both = (
      <Text variant="ui" truncate lineClamp={2}>
        both
      </Text>
    );
    render(both);
    // At runtime a caller that bypasses the types gets the one line.
    expect(overflowClasses(screen.getByText('both'))).toEqual(['block', 'truncate']);
  });
});

describe('Text deprecated variant aliases (hds#469)', () => {
  beforeEach(() => __resetDeprecationWarnings());
  afterEach(() => vi.restoreAllMocks());

  it('warns once when a deprecated variant value is used, naming its role', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Text variant="heading1">one</Text>);
    render(<Text variant="heading1">two</Text>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("Text variant 'heading1' is deprecated");
    expect(warn.mock.calls[0][0]).toContain("Use 'title'");
    expect(warn.mock.calls[0][0]).toContain('removed in 1.0.0');
  });

  it('does not warn for a current variant value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Text variant="title">fine</Text>);
    expect(warn).not.toHaveBeenCalled();
  });
});
