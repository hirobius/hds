/**
 * Contract test: Card
 * Verifies that the card root and its compound parts emit the expected classes
 * and data attributes.
 *
 * @primitive Card
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from '@/app/components/card';

describe('Card contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).not.toBeNull();
  });

  it('root emits bg-card class', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.className).toContain('bg-card');
  });

  it('root emits rounded-lg class', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.className).toContain('rounded-lg');
  });

  it('is borderless by default and opts into a border via the bordered prop', () => {
    // CLAUDE.md (2026-05-03): cards are borderless by default — the border is
    // expressed via data-bordered + an inline border, not a utility class.
    const def = render(<Card>Content</Card>).container.firstChild as HTMLElement;
    expect(def?.getAttribute('data-bordered')).toBe('false');
    const bordered = render(<Card bordered>Content</Card>).container.firstChild as HTMLElement;
    expect(bordered?.getAttribute('data-bordered')).toBe('true');
  });

  it('data-padding defaults to "component"', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('component');
  });

  it('padding="none" sets data-padding=none', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('none');
  });

  it('noPadding=true overrides padding to none', () => {
    const { container } = render(<Card noPadding>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('none');
  });

  it('Card.Header emits flex-col class', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
      </Card>,
    );
    const header = container.querySelector('.flex-col');
    expect(header).not.toBeNull();
  });

  it('Card.Title renders an h3', () => {
    const { container } = render(
      <Card>
        <Card.Header>
          <Card.Title>Title</Card.Title>
        </Card.Header>
      </Card>,
    );
    const h3 = container.querySelector('h3');
    expect(h3).not.toBeNull();
    expect(h3?.textContent).toBe('Title');
  });

  it('tone=danger over variant=accent renders the 1px feedback border, not the accent border, with no !', () => {
    // hds#372 / ADR-030: tone wins over variant by tailwind-merge class-group
    // replacement (`border` replaces `border-2`, the feedback colour replaces the
    // accent colour), not by the `!` important modifier.
    const { container } = render(
      <Card variant="accent" tone="danger">
        Content
      </Card>,
    );
    const el = container.firstChild as HTMLElement;
    const classes = el.className.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining(['border', 'border-[var(--semantic-color-feedback-error)]']),
    );
    expect(classes).not.toContain('border-2');
    expect(classes).not.toContain('border-[var(--semantic-color-border-accent)]');
    expect(el.className).not.toContain('!');
  });

  it('as prop changes the rendered element', () => {
    const { container } = render(<Card as="section">Content</Card>);
    const el = container.querySelector('section');
    expect(el).not.toBeNull();
  });
});

// ── Tone over variant, every combination (hds#372, ADR-030) ─────────────────
//
// Each status tone sets both border groups a variant or `bordered` sets, width
// (`border`) and colour, so `cn` keeps only the tone's: a 1px feedback border
// on every variant, bordered or not, selectable or not, selected or not.
// `selectable` adds ring, focus and cursor classes only, none in a border
// group, so selection composes with tone unchanged.

const CARD_VARIANTS = ['default', 'accent'] as const;
const CARD_STATUS_TONES = [
  ['danger', 'error'],
  ['success', 'success'],
  ['warning', 'warning'],
  ['info', 'info'],
] as const;
const CARD_STATES = ['plain', 'bordered', 'selectable', 'selected'] as const;

type CardState = (typeof CARD_STATES)[number];

/** Every border class a variant or `bordered` sets. A status tone replaces all of them. */
const VARIANT_BORDERS = [
  'border-transparent',
  'border-2',
  'border-[var(--semantic-color-border-accent)]',
  'border-[var(--semantic-color-border-default)]',
];

const SELECTED_RING = [
  'data-[selected=true]:ring-2',
  'data-[selected=true]:ring-inset',
  'data-[selected=true]:ring-ring',
];

function renderCard(
  variant: (typeof CARD_VARIANTS)[number],
  tone: 'neutral' | (typeof CARD_STATUS_TONES)[number][0],
  state: CardState,
  className?: string,
) {
  const { container } = render(
    <Card
      variant={variant}
      tone={tone}
      bordered={state === 'bordered'}
      selectable={state === 'selectable' || state === 'selected'}
      selected={state === 'selected'}
      className={className}
    >
      Content
    </Card>,
  );
  const el = container.firstChild as HTMLElement;
  return { el, classes: el.className.split(/\s+/).filter(Boolean) };
}

describe('Card tone over variant', () => {
  const combos = CARD_VARIANTS.flatMap((variant) =>
    CARD_STATUS_TONES.flatMap(([tone, feedback]) =>
      CARD_STATES.map((state) => [variant, tone, state, feedback] as const),
    ),
  );

  it.each(combos)(
    'variant=%s tone=%s (%s): one 1px feedback border, no variant border, no !',
    (variant, tone, state, feedback) => {
      const { el, classes } = renderCard(variant, tone, state);
      expect(classes).toEqual(
        expect.arrayContaining(['border', `border-[var(--semantic-color-feedback-${feedback})]`]),
      );
      expect(classes.filter((c) => VARIANT_BORDERS.includes(c))).toEqual([]);
      expect(el.className).not.toContain('!');
      if (state === 'selected') {
        expect(classes).toEqual(expect.arrayContaining(SELECTED_RING));
        expect(el.getAttribute('data-selected')).toBe('true');
      }
    },
  );

  it.each(CARD_STATES)('tone=neutral keeps the variant border (%s)', (state) => {
    const accent = renderCard('accent', 'neutral', state).classes;
    expect(accent).toEqual(
      expect.arrayContaining(['border-2', 'border-[var(--semantic-color-border-accent)]']),
    );
    const plain = renderCard('default', 'neutral', state).classes;
    expect(plain).toContain('border');
    expect(plain).toContain(
      state === 'bordered' ? 'border-[var(--semantic-color-border-default)]' : 'border-transparent',
    );
    expect([...accent, ...plain].filter((c) => c.includes('feedback'))).toEqual([]);
  });

  it('a consumer className overrides a tone border the same way it overrides a variant border', () => {
    const { classes } = renderCard('accent', 'danger', 'plain', 'border-[var(--x)]');
    expect(classes).toContain('border-[var(--x)]');
    expect(classes).not.toContain('border-[var(--semantic-color-feedback-error)]');
  });
});
