/**
 * hds#394 wave 4b folds 14 components into survivors that hds#393 (B3)
 * shipped. A name may be removed only once its survivor can express what the
 * folded component was documented to do: its stories, its own tests and its
 * JSDoc. Each block below renders the survivor recipe that MIGRATIONS.md
 * ("0.20.0 removals") gives for one folded component and asserts what that
 * component's own tests asserted, so the recipe stays true after the folded
 * component is deleted.
 *
 * The layout recipes use `Box` with `style`, not `sx`: `sx` injects its rule
 * on the client only (box-sx.ts), so a server render would ship the element
 * without its layout. `renderToStaticMarkup` below proves the style is in the
 * server HTML.
 *
 * StatusDot was removed later, in 0.21.0 (hds#465); the last block keeps the
 * Badge `dot` recipe it was replaced by true.
 */
import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Settings, Trash2 } from 'lucide-react';
import hds from '../src/app/design-system/tokens';
import { Badge } from '../src/app/components/badge';
import { Box } from '../src/app/components/box';
import { Button } from '../src/app/components/button';
import { Card } from '../src/app/components/card';
import { Combobox } from '../src/app/components/combobox';
import { Container } from '../src/app/components/container';
import { Icon } from '../src/app/components/icon';
import { Input } from '../src/app/components/input';
import { Progress } from '../src/app/components/progress';
import { Stack } from '../src/app/components/stack';

afterEach(cleanup);

const md = 'var(--semantic-space-scale-md)';

describe('IconButton -> Button iconOnly', () => {
  it('names an icon-only button from label and renders the icon', () => {
    render(<Button iconOnly label="Settings" iconLeft={<Icon icon={Settings} size="medium" />} />);
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button.getAttribute('aria-label')).toBe('Settings');
    expect(button.querySelector('svg')).not.toBeNull();
    // No visible label text: the label is the accessible name only.
    expect(button.textContent).toBe('');
  });

  it('keeps the square size ramp and the variants', () => {
    const sizes = { sm: 'w-8', md: 'w-10', lg: 'w-12' } as const;
    for (const [size, width] of Object.entries(sizes)) {
      render(
        <Button
          iconOnly
          size={size as keyof typeof sizes}
          variant="tertiary"
          label={`Copy ${size}`}
          iconLeft={<Icon icon={Settings} />}
        />,
      );
      const button = screen.getByRole('button', { name: `Copy ${size}` });
      expect(button.className).toContain(width);
      expect(button.getAttribute('data-variant')).toBe('tertiary');
    }
  });

  it('disables like any button', () => {
    render(<Button iconOnly disabled label="Delete" iconLeft={<Icon icon={Trash2} />} />);
    expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('ToggleButton -> Button pressed', () => {
  it('is an unpressed toggle by default and toggles on click when uncontrolled', () => {
    render(<Button defaultPressed={false}>Bold</Button>);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('reflects a controlled pressed state and reports the next one', () => {
    let next: boolean | undefined;
    render(
      <Button pressed onPressedChange={(p) => (next = p)}>
        Bold
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(next).toBe(false);
  });

  it('maps variant="ghost" to variant="tertiary"', () => {
    render(
      <Button variant="tertiary" defaultPressed>
        B
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('data-variant')).toBe('tertiary');
  });
});

describe('InputGroup -> Input prefix / suffix', () => {
  it('renders the adornments around one input and forwards native props', () => {
    render(
      <Input prefix="$" suffix="USD" placeholder="0.00" defaultValue="12" aria-label="Amount" />,
    );
    const input = screen.getByLabelText('Amount') as HTMLInputElement;
    expect(input.value).toBe('12');
    expect(input.placeholder).toBe('0.00');
    expect(screen.getByText('$')).not.toBeNull();
    expect(screen.getByText('USD')).not.toBeNull();
  });

  it('keeps the size ramp and disables the input', () => {
    render(<Input prefix="@" size="lg" disabled aria-label="Handle" />);
    const input = screen.getByLabelText('Handle') as HTMLInputElement;
    expect(input.getAttribute('data-size')).toBe('lg');
    expect(input.disabled).toBe(true);
  });
});

describe('TimeInput -> Input type="time"', () => {
  it('renders a native time input with a controlled HH:mm value', () => {
    render(<Input type="time" aria-label="Start time" value="09:30" onChange={() => {}} />);
    const input = screen.getByLabelText('Start time') as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('time');
    expect(input.value).toBe('09:30');
    // The native picker owns the value UI: no clear button next to it.
    expect(screen.queryByRole('button', { name: 'Clear input' })).toBeNull();
  });

  it('keeps the size ramp and can be disabled', () => {
    render(<Input type="time" size="sm" disabled aria-label="t" defaultValue="08:00" />);
    const input = screen.getByLabelText('t') as HTMLInputElement;
    expect(input.getAttribute('data-size')).toBe('sm');
    expect(input.disabled).toBe(true);
  });
});

describe('CircularProgress -> Progress variant="circular"', () => {
  it('exposes a determinate progressbar with value, min, max and label', () => {
    const { container } = render(<Progress variant="circular" value={40} label="Uploading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBe('Uploading');
    // Track and indicator.
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('clamps into 0..max', () => {
    render(<Progress variant="circular" value={200} max={100} label="p" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('is indeterminate without a value (CircularProgress indeterminate)', () => {
    const { container } = render(<Progress variant="circular" label="Loading" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('animate-spin');
  });

  it('keeps the size ramp and the tones', () => {
    const { container } = render(
      <Progress variant="circular" value={65} size="lg" tone="danger" label="p" />,
    );
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('32');
    expect(screen.getByRole('progressbar').className).toContain('text-feedback-danger');
  });
});

describe('SelectableCard -> Card selectable', () => {
  it('renders a checkbox card that reflects selected', () => {
    render(
      <Card selectable selected>
        Plan A
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.getAttribute('aria-checked')).toBe('true');
    expect(card.getAttribute('data-selected')).toBe('true');
  });

  it('reports the toggled value on click', () => {
    let received: boolean | undefined;
    render(
      <Card selectable selected={false} onSelectedChange={(v) => (received = v)}>
        Plan A
      </Card>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Plan A' }));
    expect(received).toBe(true);
  });

  it('expresses disabled as aria-disabled with no onSelectedChange', () => {
    // SelectableCard's `disabled` was a native button attribute. A Card is a
    // div, so a disabled option is aria-disabled and is not handed the callback.
    let received: boolean | undefined;
    const disabled = true;
    render(
      <Card
        selectable
        selected={false}
        aria-disabled={disabled}
        onSelectedChange={disabled ? undefined : (v) => (received = v)}
      >
        Plan A
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: ' ' });
    expect(received).toBe(undefined);
  });
});

describe('MultiSelector -> Combobox multiple', () => {
  const FRUIT = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'date', label: 'Date' },
  ];

  it('shows the placeholder, then a count of the selected values', () => {
    const { rerender } = render(
      <Combobox multiple options={FRUIT} value={[]} onChange={() => {}} placeholder="Select…" />,
    );
    expect(screen.getByRole('combobox').textContent).toContain('Select…');
    rerender(<Combobox multiple options={FRUIT} value={['banana', 'date']} onChange={() => {}} />);
    expect(screen.getByRole('combobox').textContent).toContain('2 selected');
  });

  it('can be disabled as a whole', () => {
    render(<Combobox multiple options={FRUIT} value={[]} onChange={() => {}} disabled />);
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Cluster -> Stack direction="row" wrap="wrap"', () => {
  it('wraps a row with the tokenized gap, centred on the cross axis', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Stack
        ref={ref}
        as="section"
        direction="row"
        wrap="wrap"
        gap="spacious"
        align="center"
        justify="start"
      >
        content
      </Stack>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('SECTION');
    expect(ref.current).toBe(el);
    expect(el.style.display).toBe('flex');
    expect(el.style.flexWrap).toBe('wrap');
    expect(el.style.gap).toBe('var(--semantic-space-scale-xl)');
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('flex-start');
  });

  it("reads Cluster's gap names as the same steps", () => {
    const steps = { tight: 'sm', normal: 'md', inset: 'lg', spacious: 'xl' } as const;
    for (const [gap, step] of Object.entries(steps)) {
      const html = renderToStaticMarkup(
        <Stack direction="row" wrap="wrap" gap={gap as keyof typeof steps}>
          x
        </Stack>,
      );
      expect(html).toContain(`gap:var(--semantic-space-scale-${step})`);
    }
  });
});

describe('Center -> Container + Box', () => {
  it('centres a semantic max-width column; a Box inside carries the gutter', () => {
    const html = renderToStaticMarkup(
      <Container maxWidth="content">
        <Box style={{ paddingInline: md }}>content</Box>
      </Container>,
    );
    expect(html).toContain(
      'margin-left:auto;margin-right:auto;max-width:var(--semantic-layout-width-content)',
    );
    expect(html).toContain(`padding-inline:${md}`);
  });

  it('takes the max width too', () => {
    const html = renderToStaticMarkup(<Container maxWidth="max">content</Container>);
    expect(html).toContain('max-width:var(--semantic-layout-width-max)');
  });

  it('a Box gives the element and the ref Container does not take', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Box
        as="main"
        ref={ref}
        style={{ marginInline: 'auto', maxWidth: 'var(--semantic-layout-width-content)' }}
      >
        content
      </Box>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('MAIN');
    expect(ref.current).toBe(container.firstChild);
  });
});

describe('Cover -> Box with style', () => {
  it('renders a full-height column whose main region centres by auto margins', () => {
    const html = renderToStaticMarkup(
      <Box
        as="section"
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', gap: md }}
      >
        <Box style={{ flexShrink: 0 }}>header</Box>
        <Box style={{ marginBlock: 'auto', width: '100%' }}>main</Box>
        <Box style={{ flexShrink: 0 }}>footer</Box>
      </Box>,
    );
    expect(html).toMatch(/^<section/);
    expect(html).toContain(`display:flex;flex-direction:column;min-height:100svh;gap:${md}`);
    expect(html).toContain('margin-block:auto;width:100%');
    expect(html.indexOf('header')).toBeLessThan(html.indexOf('main'));
    expect(html.indexOf('main')).toBeLessThan(html.indexOf('footer'));
  });
});

describe('Frame -> Box with style', () => {
  it('locks the ratio, clips the overflow and takes a radius token', () => {
    const html = renderToStaticMarkup(
      <Box
        as="figure"
        style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md }}
      >
        <img alt="" src="/x.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>,
    );
    expect(html).toMatch(/^<figure/);
    expect(html).toContain('aspect-ratio:16 / 9;overflow:hidden');
    expect(html).toContain(`border-radius:${hds.borderRadius.md}`);
  });
});

describe('Bleed -> Box with style', () => {
  it('negates a known padding step on the inline axis, the block axis or both', () => {
    const negative = `calc(-1 * ${md})`;
    expect(renderToStaticMarkup(<Box style={{ marginInline: negative }}>x</Box>)).toContain(
      `margin-inline:${negative}`,
    );
    expect(renderToStaticMarkup(<Box style={{ marginBlock: negative }}>x</Box>)).toContain(
      `margin-block:${negative}`,
    );
    expect(renderToStaticMarkup(<Box style={{ margin: negative }}>x</Box>)).toContain(
      `margin:${negative}`,
    );
  });
});

describe('AspectRatio -> Box with style', () => {
  it('reserves the ratio box for the child up front', () => {
    const html = renderToStaticMarkup(
      <Box style={{ aspectRatio: '2' }}>
        <div className="h-full w-full">content</div>
      </Box>,
    );
    expect(html).toContain('aspect-ratio:2');
  });
});

describe('Badge dot, the replacement for the removed StatusDot (tone, size, label)', () => {
  it('renders the same dot for each tone and size, decorative without a label', () => {
    const sizes = { sm: 'size-1.5', md: 'size-2', lg: 'size-2.5' } as const;
    for (const [size, cls] of Object.entries(sizes)) {
      const { container } = render(<Badge dot tone="success" size={size as keyof typeof sizes} />);
      const dot = container.firstElementChild as HTMLElement;
      expect(dot.getAttribute('data-tone')).toBe('success');
      expect(dot.getAttribute('aria-hidden')).toBe('true');
      expect(dot.className).toContain('bg-feedback-success');
      expect(dot.className).toContain(cls);
      cleanup();
    }
  });

  it('exposes a labelled image role when label is set', () => {
    render(<Badge dot tone="danger" label="Offline" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Offline');
  });
});
