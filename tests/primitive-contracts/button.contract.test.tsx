/**
 * Contract test: Button
 * Verifies that variant, tone and size props produce the expected Tailwind
 * classes on the rendered button element.
 *
 * @primitive Button
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button, buttonVariants } from '@/app/components/button';

describe('Button contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Label</Button>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('has role="button"', () => {
    const { container } = render(<Button>Label</Button>);
    const el = container.querySelector('button');
    expect(el?.tagName.toLowerCase()).toBe('button');
  });

  it('variant=primary emits bg-primary class', () => {
    const { container } = render(<Button variant="primary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('bg-primary');
  });

  it('variant=secondary emits border class', () => {
    const { container } = render(<Button variant="secondary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('border');
  });

  it('variant=tertiary does not emit bg-primary', () => {
    const { container } = render(<Button variant="tertiary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).not.toContain('bg-primary');
  });

  it('size=sm emits h-8 class', () => {
    const { container } = render(<Button size="sm">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-8');
  });

  it('size=md emits h-10 class', () => {
    const { container } = render(<Button size="md">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-10');
  });

  it('size=lg emits h-12 class', () => {
    const { container } = render(<Button size="lg">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-12');
  });

  it('data-variant attribute reflects the variant prop', () => {
    const { container } = render(<Button variant="primary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.getAttribute('data-variant')).toBe('primary');
  });

  it('loading=true sets aria-busy', () => {
    const { container } = render(<Button loading>Label</Button>);
    const el = container.querySelector('button');
    expect(el?.getAttribute('aria-busy')).toBe('true');
  });

  it('disabled=true disables the button', () => {
    const { container } = render(<Button disabled>Label</Button>);
    const el = container.querySelector('button') as HTMLButtonElement;
    expect(el?.disabled).toBe(true);
  });
});

// ── Tone over variant (hds#372, ADR-030) ────────────────────────────────────────
//
// A status tone replaces the variant's colour classes through tailwind-merge
// (`cn`), not through the `!` important modifier: the tone string sets every
// class group the variants set (fill, border colour, text colour, and the hover
// fill and border), so the later tone class wins each group and the variant's
// hover classes cannot leak through.
//
// The variant classes are read off `buttonVariants` itself rather than listed
// here, so a class a variant gains later (an `active:bg-*` group, say) has to
// be replaced by every tone from the day it lands, or this suite goes red.

const VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
const STATUS_TONES = ['danger', 'success', 'warning', 'info'] as const;

const splitClasses = (cls: string) => cls.split(/\s+/).filter(Boolean);

// An explicit `null` switches a cva variant off without falling back to its
// default, so with every other variant off the output is the base string plus
// the one variant's own classes.
const VARIANT_ONLY = { tone: null, size: null, iconOnly: null } as const;
const BASE_CLASSES = new Set(splitClasses(buttonVariants({ variant: null, ...VARIANT_ONLY })));

/** The classes `variant` itself adds on top of the base string. */
const variantClasses = (variant: (typeof VARIANTS)[number]) =>
  splitClasses(buttonVariants({ variant, ...VARIANT_ONLY })).filter((c) => !BASE_CLASSES.has(c));

/**
 * Variant classes a status tone keeps on purpose. `border` is secondary's 1px
 * border width, not a colour, so the box does not shift under a tone. Every
 * other variant class must be replaced.
 */
const TONE_KEEPS: readonly string[] = ['border'];

const toneClasses = (tone: (typeof STATUS_TONES)[number]) => [
  'border-transparent',
  `bg-feedback-bg-${tone}`,
  `text-feedback-${tone}`,
  `hover:bg-feedback-bg-${tone}`,
  'hover:border-transparent',
  'hover:brightness-95',
  'dark:hover:brightness-110',
];

const classesOf = (el: Element | null) => (el?.className ?? '').split(/\s+/).filter(Boolean);

describe('Button tone over variant', () => {
  const combos = VARIANTS.flatMap((variant) =>
    STATUS_TONES.map((tone) => [variant, tone] as const),
  );

  it.each(VARIANTS)('reads the classes variant=%s adds off buttonVariants', (variant) => {
    const own = variantClasses(variant);
    expect(own.length).toBeGreaterThan(0);
    expect(own.some((c) => c.startsWith('hover:'))).toBe(true);
    expect(own).not.toContain('inline-flex');
  });

  it.each(combos)(
    'variant=%s tone=%s: the tone classes replace the variant colours, with no !',
    (variant, tone) => {
      const { container } = render(
        <Button variant={variant} tone={tone}>
          Label
        </Button>,
      );
      const el = container.querySelector('button');
      const classes = classesOf(el);
      const mustReplace = variantClasses(variant).filter((c) => !TONE_KEEPS.includes(c));

      expect(classes).toEqual(expect.arrayContaining(toneClasses(tone)));
      expect(classes.filter((c) => mustReplace.includes(c))).toEqual([]);
      expect(el?.className).not.toContain('!');
    },
  );

  it('secondary keeps its 1px border width under a tone, so the box does not shift', () => {
    const { container } = render(
      <Button variant="secondary" tone="danger">
        Label
      </Button>,
    );
    expect(classesOf(container.querySelector('button'))).toContain('border');
  });

  it('tone=neutral keeps the variant colours (bg-primary for variant=primary)', () => {
    const { container } = render(
      <Button variant="primary" tone="neutral">
        Label
      </Button>,
    );
    const classes = classesOf(container.querySelector('button'));
    expect(classes).toContain('bg-primary');
    expect(classes.filter((c) => c.includes('feedback'))).toEqual([]);
  });

  it('a consumer className overrides a tone colour the same way it overrides a variant colour', () => {
    const { container } = render(
      <Button variant="primary" tone="danger" className="bg-background">
        Label
      </Button>,
    );
    const classes = classesOf(container.querySelector('button'));
    expect(classes).toContain('bg-background');
    expect(
      classes.filter((c) => c.includes('bg-feedback-bg-danger') && !c.startsWith('hover:')),
    ).toEqual([]);
  });
});
