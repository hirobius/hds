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
import { Button } from '@/app/components/button';

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
// The variant classes are read off a rendered Button rather than listed here,
// so a class a variant gains later (an `active:bg-*` group, say) has to be
// replaced by every tone from the day it lands, or this suite goes red. Every
// shape a Button renders in is covered: a text label, `iconOnly`, a toggle off
// and on (`pressed`), and `asChild`.

const VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
const STATUS_TONES = ['danger', 'success', 'warning', 'info'] as const;
const SHAPES = ['label', 'iconOnly', 'toggle off', 'toggle on', 'asChild'] as const;

type Variant = (typeof VARIANTS)[number] | null;
type Tone = (typeof STATUS_TONES)[number] | 'neutral';
type Shape = (typeof SHAPES)[number];

const classesOf = (el: Element | null) => (el?.className ?? '').split(/\s+/).filter(Boolean);

const Icon = () => <svg aria-hidden="true" />;

/** Render one Button in `shape` and return its root element. */
function renderButton(variant: Variant, tone: Tone, shape: Shape = 'label', className?: string) {
  const common = { variant, tone, className };
  const { container } = render(
    shape === 'iconOnly' ? (
      <Button {...common} iconOnly label="Close" iconLeft={<Icon />} />
    ) : shape === 'toggle off' ? (
      <Button {...common} pressed={false}>
        Label
      </Button>
    ) : shape === 'toggle on' ? (
      <Button {...common} pressed>
        Label
      </Button>
    ) : shape === 'asChild' ? (
      <Button {...common} asChild>
        <a href="#x">Label</a>
      </Button>
    ) : (
      <Button {...common}>Label</Button>
    ),
  );
  return container.firstElementChild;
}

// An explicit `null` variant switches the cva variant off without falling back
// to its default, so the difference is exactly the classes the variant adds.
const BASE_CLASSES = new Set(classesOf(renderButton(null, 'neutral')));

/** The classes `variant` itself adds on top of the base string. */
const variantClasses = (variant: (typeof VARIANTS)[number]) =>
  classesOf(renderButton(variant, 'neutral')).filter((c) => !BASE_CLASSES.has(c));

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

/** A toggle's on-state classes, keyed to data-pressed="true". */
const TOGGLE_ON = [
  'data-[pressed=true]:border-transparent',
  'data-[pressed=true]:bg-primary',
  'data-[pressed=true]:text-primary-foreground',
  'data-[pressed=true]:hover:bg-primary/90',
];

describe('Button tone over variant', () => {
  it.each(VARIANTS)('reads the classes variant=%s adds off a rendered Button', (variant) => {
    const own = variantClasses(variant);
    expect(own.length).toBeGreaterThan(0);
    expect(own.some((c) => c.startsWith('hover:'))).toBe(true);
    expect(own).not.toContain('inline-flex');
  });

  const combos = VARIANTS.flatMap((variant) =>
    STATUS_TONES.flatMap((tone) => SHAPES.map((shape) => [variant, tone, shape] as const)),
  );

  it.each(combos)(
    'variant=%s tone=%s (%s): the tone classes replace the variant colours, with no !',
    (variant, tone, shape) => {
      const el = renderButton(variant, tone, shape);
      const classes = classesOf(el);
      const mustReplace = variantClasses(variant).filter((c) => !TONE_KEEPS.includes(c));

      expect(classes).toEqual(expect.arrayContaining(toneClasses(tone)));
      expect(classes.filter((c) => mustReplace.includes(c))).toEqual([]);
      // The toggle on-state sits behind data-[pressed=true]:, which outranks a
      // plain tone class on specificity, so a toned toggle leaves it out.
      expect(classes.filter((c) => c.startsWith('data-[pressed=true]:'))).toEqual([]);
      expect(el?.className).not.toContain('!');
    },
  );

  it.each(VARIANTS.flatMap((variant) => SHAPES.map((shape) => [variant, shape] as const)))(
    'variant=%s tone=neutral (%s) keeps every variant class and no feedback colour',
    (variant, shape) => {
      const classes = classesOf(renderButton(variant, 'neutral', shape));
      expect(classes).toEqual(expect.arrayContaining(variantClasses(variant)));
      expect(classes.filter((c) => c.includes('feedback'))).toEqual([]);
    },
  );

  it.each(VARIANTS)('variant=%s tone=neutral: a toggle carries the on-state classes', (variant) => {
    for (const shape of ['toggle off', 'toggle on'] as const) {
      expect(classesOf(renderButton(variant, 'neutral', shape))).toEqual(
        expect.arrayContaining(TOGGLE_ON),
      );
    }
  });

  it('a toned toggle still reports its state to assistive tech', () => {
    const el = renderButton('secondary', 'danger', 'toggle on');
    expect(el?.getAttribute('aria-pressed')).toBe('true');
    expect(el?.getAttribute('data-pressed')).toBe('true');
  });

  it('secondary keeps its 1px border width under a tone, so the box does not shift', () => {
    expect(classesOf(renderButton('secondary', 'danger'))).toContain('border');
  });

  it('tone=neutral keeps the variant colours (bg-primary for variant=primary)', () => {
    const classes = classesOf(renderButton('primary', 'neutral'));
    expect(classes).toContain('bg-primary');
    expect(classes.filter((c) => c.includes('feedback'))).toEqual([]);
  });

  it.each(SHAPES)(
    'a consumer className overrides a tone colour the same way it overrides a variant colour (%s)',
    (shape) => {
      const classes = classesOf(renderButton('primary', 'danger', shape, 'bg-background'));
      expect(classes).toContain('bg-background');
      expect(
        classes.filter((c) => c.includes('bg-feedback-bg-danger') && !c.startsWith('hover:')),
      ).toEqual([]);
    },
  );
});
