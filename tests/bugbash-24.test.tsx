/**
 * Bug bash 24 (main 0.24.1): component defects. jsdom cannot measure layout, so each test
 * pins the cause the bash measured (a stylesheet rule, a class, a role, an attribute) and,
 * where the behaviour is observable, the behaviour. Rendered geometry was re-measured in Chromium.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '../src/app/components/toggle';
import { Radio } from '../src/app/components/radio';
import { CodeBlock } from '../src/app/components/code-block';
import { Tabs, TabsList, TabsTrigger } from '../src/app/components/tabs';
import { Button } from '../src/app/components/button';
import { Popover } from '../src/app/components/popover';
import { SegmentedControl } from '../src/app/components/segmented-control';
import { useState } from 'react';
import { Page } from '../src/app/components/page';
import { Card } from '../src/app/components/card';
import { Badge } from '../src/app/components/badge';
import { Pagination } from '../src/app/components/pagination';
import { Field } from '../src/app/components/field';
import { Tag } from '../src/app/components/tag';
import { Alert } from '../src/app/components/alert';
import { Callout } from '../src/app/components/callout';
import { InlineCode } from '../src/app/components/inline-code';
import { Input } from '../src/app/components/input';
import { Textarea } from '../src/app/components/textarea';
import { Select } from '../src/app/components/select';
import { Combobox } from '../src/app/components/combobox';
import { FormField } from '../src/app/components/form';
import { MetadataList } from '../src/app/components/metadata-list';

const css = (p: string) => readFileSync(resolve(process.cwd(), 'src/styles', p), 'utf8');
const src = (p: string) => readFileSync(resolve(process.cwd(), 'src/app/components', p), 'utf8');

beforeAll(() => {
  // @ts-expect-error minimal jsdom polyfills for Radix / Floating-UI.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

describe('Focus never moves a control (items 1, 2)', () => {
  it('.hds-focus:focus-visible does not set position (it overrode absolute/fixed)', () => {
    const rule = css('theme.css').match(/\.hds-focus:focus-visible\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toMatch(/outline/);
    expect(rule).not.toMatch(/position\s*:/);
  });
});

describe('Toggle (item 3, 17)', () => {
  it('the off thumb differs from the page colour and the track edge has contrast', () => {
    render(<Toggle label="x" checked={false} onChange={() => {}} />);
    const thumb = screen
      .getByRole('switch')
      .parentElement!.querySelector('[aria-hidden="true"] > span') as HTMLElement;
    expect(thumb.className).not.toMatch(/surface-page/);
    expect(thumb.className).toMatch(/content-secondary/);
  });

  it('the on thumb stays page-coloured on the accent track', () => {
    render(<Toggle label="x" checked onChange={() => {}} />);
    const thumb = screen
      .getByRole('switch')
      .parentElement!.querySelector('[aria-hidden="true"] > span') as HTMLElement;
    expect(thumb.className).toMatch(/surface-page/);
  });

  it('a disabled Toggle label has no filled background (Checkbox and Radio have none)', () => {
    render(<Toggle label="x" checked={false} disabled onChange={() => {}} />);
    expect(screen.getByRole('switch').closest('label')!.className).not.toMatch(
      /bg-\[var\(--semantic-color-surface-raised\)\]/,
    );
  });
});

describe('Radio disabled (item 17)', () => {
  // Renders the ring: the earlier source-regex looked for a `disabled: {` block radio.tsx never had,
  // so it passed by construction.
  const ring = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('span')).find((s) => /border-\[color:/.test(s.className))!;
  it.each([false, true])(
    'a disabled Radio ring (checked=%s) fades to border-default',
    (checked) => {
      const { container } = render(
        <Radio label="r" name="r" value="1" checked={checked} disabled onChange={() => {}} />,
      );
      const cls = ring(container).className;
      expect(cls).toMatch(/border-\[color:var\(--semantic-color-border-default\)\]/);
      expect(cls).not.toMatch(/content-secondary|border-accent/);
    },
  );
});

describe('CodeBlock (items 5, 9)', () => {
  it('both copy buttons are type=button and do not submit a form', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(
      <form onSubmit={onSubmit}>
        <CodeBlock code="x" />
        <CodeBlock variant="inline" code="y" />
      </form>,
    );
    const buttons = screen.getAllByRole('button', { name: /copy code/i });
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
      await userEvent.click(b);
    }
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks that do not overflow are not landmarks and add no tab stop', () => {
    const { container } = render(
      <>
        <CodeBlock code="a" />
        <CodeBlock code="b" filename="x.ts" />
      </>,
    );
    expect(container.querySelectorAll('pre[role="region"]')).toHaveLength(0);
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    expect(container.querySelectorAll('pre[tabindex]')).toHaveLength(0);
  });

  it('an overflowing block is a keyboard-scrollable group named by its filename, not a landmark', () => {
    const w = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    const c = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    const { container } = render(<CodeBlock code="a very long line" filename="x.ts" />);
    const pre = container.querySelector('pre') as HTMLElement;
    w.mockRestore();
    c.mockRestore();
    expect(pre.getAttribute('tabindex')).toBe('0');
    expect(pre.getAttribute('role')).toBe('group');
    expect(pre.getAttribute('aria-label')).toBe('x.ts');
  });
});

describe('Tabs (items 4, 21)', () => {
  it('the active trigger carries a visible underline: no unlayered .border-transparent class', () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const active = screen.getByRole('tab', { name: 'One' });
    expect(active.className).not.toMatch(/(^|\s)border-transparent(\s|$)/);
    expect(active.className).toMatch(
      /data-\[state=active\]:border-b-\[color:var\(--semantic-color-content-primary\)\]/,
    );
  });
});

describe('Button label (reported by another session)', () => {
  it('label names the button even when children are present', () => {
    render(<Button label="Delete project">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete project' })).toBeTruthy();
  });
  it('icon-only still uses label', () => {
    render(<Button iconOnly label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
  it('no label leaves the content name', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-label')).toBeNull();
  });
});

describe('Popover (item 7)', () => {
  it('content is a dialog named by its trigger by default', async () => {
    render(
      <Popover>
        <Popover.Trigger>Filters</Popover.Trigger>
        <Popover.Content>body</Popover.Content>
      </Popover>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeTruthy();
  });
  it('an explicit aria-label wins', async () => {
    render(
      <Popover>
        <Popover.Trigger>Filters</Popover.Trigger>
        <Popover.Content aria-label="Refine results">body</Popover.Content>
      </Popover>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('dialog', { name: 'Refine results' })).toBeTruthy();
  });
});

describe('SegmentedControl (items 6, 8, 15)', () => {
  const opts = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
  function Harness() {
    const [v, setV] = useState('day');
    return <SegmentedControl label="Range" value={v} onChange={setV} options={opts} />;
  }
  it('arrow keys move focus and select, like a radio group', async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain('Day');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Week' }).getAttribute('aria-checked')).toBe('true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Month' }).getAttribute('aria-checked')).toBe('true');
  });
  it('Tab into the group does not change the selection', async () => {
    render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Day' }).getAttribute('aria-checked')).toBe('true');
  });
  it('segments carry the touch-row hook and a phone-sized default inline padding', () => {
    render(<Harness />);
    for (const r of screen.getAllByRole('radio')) {
      expect(r.className).toMatch(/hds-touch-row/);
      expect(r.className).toMatch(/px-\[var\(--semantic-space-scale-xs\)\]/);
      expect(r.style.paddingLeft).toBe('');
    }
  });
});

describe('Touch targets (item 6, and the highlight fill of item 21)', () => {
  const touch = /hds-touch-(row|target)/;
  it.each([
    ['disclosure.tsx', 'hds-focus hds-touch-row'],
    ['tabs.tsx', 'hds-touch-row'],
    ['breadcrumb.tsx', 'hds-touch-row'],
    ['slider.tsx', 'hds-touch-row'],
    ['combobox.tsx', 'hds-touch-row'],
    ['menu.tsx', 'hds-touch-row'],
    ['select.tsx', 'hds-touch-row'],
    ['dialog.tsx', 'hds-touch-target'],
    ['toast.tsx', 'hds-touch-target'],
    ['input.tsx', 'hds-touch-target'],
  ])('%s opts its controls into the mobile touch-target classes', (file, cls) => {
    expect(src(file)).toContain(cls);
    expect(src(file)).toMatch(touch);
  });
  it('combobox chip remove and options both use them', () => {
    expect((src('combobox.tsx').match(/hds-touch-row/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it.each(['menu.tsx', 'select.tsx', 'combobox.tsx'])(
    '%s highlight fill is a step from the popover surface, not shadcn bg-accent',
    (file) => {
      expect(src(file)).toMatch(/bg-\[var\(--semantic-color-surface-sunken\)\]/);
      expect(src(file)).not.toMatch(/data-\[(highlighted|active=true)\]:bg-accent/);
    },
  );
});

describe('Page gutter (item 10)', () => {
  it('Page pads its content with the region gutter token', () => {
    const { container } = render(<Page>x</Page>);
    const inner = container.querySelector('[data-hds-component="Page"]') as HTMLElement;
    const style = inner.getAttribute('style') ?? '';
    expect(style).toMatch(/padding-left:\s*var\(--semantic-space-region-gutter\)/);
    expect(style).toMatch(/padding-right:\s*var\(--semantic-space-region-gutter\)/);
  });
});

describe('Card inset (items 11, 18)', () => {
  const parts = (padding?: 'none') => (
    <Card padding={padding} data-testid="card">
      <Card.Header metadata={<Badge>New</Badge>}>
        <Card.Title>T</Card.Title>
      </Card.Header>
      <Card.Progress value={30} label="p" />
      <Card.Body>b</Card.Body>
      <Card.Footer>f</Card.Footer>
    </Card>
  );
  it('parts add no second inset inside a padded Card', () => {
    const { container } = render(parts());
    const html = container.innerHTML;
    for (const sel of ['p-6', 'px-6', 'pt-0', 'pb-2']) {
      expect(html.split(/\s+/).join(' ')).not.toMatch(new RegExp(`class="[^"]*\\b${sel}\\b`));
    }
  });
  it('parts keep their own inset under padding="none" (the legacy composition)', () => {
    const { container } = render(parts('none'));
    expect(container.querySelectorAll('.p-6').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.px-6')).not.toBeNull();
  });
  it('an accent Card gives the extra border pixel back from its padding', () => {
    render(
      <>
        <Card data-testid="d">x</Card>
        <Card variant="accent" data-testid="a">
          x
        </Card>
      </>,
    );
    expect((screen.getByTestId('d') as HTMLElement).style.padding).not.toMatch(/calc/);
    expect((screen.getByTestId('a') as HTMLElement).getAttribute('style')).toMatch(
      /padding:\s*calc\(.*- 1px\)/,
    );
  });
});

describe('MetadataList variants (item 12)', () => {
  const items = [{ term: 'Status', description: 'Active' }];
  it('divided pads nothing and its value uses the plain body type', () => {
    const { container } = render(<MetadataList variant="divided" items={items} />);
    const dl = container.querySelector('dl') as HTMLElement;
    expect(dl.getAttribute('style') ?? '').not.toMatch(/border/);
    expect(dl.className).not.toMatch(/rounded/);
    expect(container.innerHTML).not.toMatch(/\bp-5\b/);
    expect((container.querySelector('dd') as HTMLElement).className).not.toMatch(/hds-type-ui/);
  });
});

describe('FormField error reaches the control (items 13, 14, 19)', () => {
  const noop = () => {};
  const opts = [{ value: 'a', label: 'Alpha' }];
  it('Input and Textarea take the red border from aria-invalid set by FormField', () => {
    render(
      <>
        <FormField label="Email" error="Bad">
          <Input data-testid="i" />
        </FormField>
        <FormField label="Notes" error="Bad">
          <Textarea data-testid="t" />
        </FormField>
      </>,
    );
    for (const id of ['i', 't']) {
      const el = screen.getByTestId(id);
      expect(el.getAttribute('aria-invalid')).toBe('true');
      expect(el.className).toMatch(/border-destructive/);
      expect(el.className).not.toMatch(/border-input/);
    }
  });
  it('Select and Combobox triggers take it too', () => {
    render(
      <>
        <FormField label="Pick" error="Bad">
          <Select label="" showLabel={false} options={opts} value="a" onChange={noop} />
        </FormField>
        <FormField label="Pick2" error="Bad">
          <Combobox options={opts} multiple={false} value="a" onChange={noop} />
        </FormField>
      </>,
    );
    for (const el of [screen.getAllByRole('combobox')[0], screen.getAllByRole('combobox')[1]]) {
      expect(el.getAttribute('aria-invalid')).toBe('true');
      expect(el.className).toMatch(/border-destructive/);
    }
  });
  it('a valid control keeps the neutral border', () => {
    render(<Input data-testid="i" />);
    expect(screen.getByTestId('i').className).toMatch(/border-input/);
  });
  it('Input and Textarea labels sit the same 8px above the control as Select and FormField', () => {
    const { container } = render(
      <>
        <Input label="A" />
        <Textarea label="B" />
      </>,
    );
    for (const root of Array.from(container.children)) {
      expect((root as HTMLElement).className).toMatch(/\bgap-2\b/);
      expect((root as HTMLElement).className).not.toMatch(/gap-1\.5/);
    }
  });
  it('Select shows a placeholder when value matches nothing', () => {
    render(<Select label="Pick" options={opts} value="" onChange={noop} />);
    expect(screen.getByRole('combobox').textContent).toContain('Select…');
  });
  it('Select placeholder is configurable', () => {
    render(
      <Select label="Pick" options={opts} value="" onChange={noop} placeholder="Choose one" />,
    );
    expect(screen.getByRole('combobox').textContent).toContain('Choose one');
  });
});

describe('Overflow (item 15) and shape (item 16)', () => {
  it('Pagination hides sibling pages below sm and keeps first, current and last', () => {
    render(<Pagination count={40} page={20} onPageChange={() => {}} />);
    const li = (n: number) => screen.getByRole('button', { name: `Page ${n}` }).closest('li')!;
    expect(li(19).className).toMatch(/max-sm:hidden/);
    expect(li(21).className).toMatch(/max-sm:hidden/);
    for (const n of [1, 20, 40]) expect(li(n).className).not.toMatch(/max-sm:hidden/);
  });
  // Reviewer: hiding sibling pages below sm must never leave a silent gap. At 7 pages on page 4 the
  // phone row read "1 4 7" with no ellipsis, so pages 2-3 and 5-6 vanished without a cue.
  it.each([
    [7, 4],
    [7, 2],
    [9, 5],
    [40, 20],
    [40, 3],
    [10, 9],
    [5, 3],
  ])(
    'Pagination count=%i page=%i marks every skipped run with an ellipsis, wide and narrow',
    (count, page) => {
      const { container } = render(
        <Pagination count={count} page={page} onPageChange={() => {}} />,
      );
      const items = Array.from(container.querySelectorAll('li')).slice(1, -1);
      const row = (hiddenClass: RegExp) =>
        items
          .filter((li) => !hiddenClass.test(li.className))
          .map((li) => (li.textContent === '…' ? '…' : Number(li.textContent)));
      // narrow: drop max-sm:hidden; wide: drop the sm:hidden that only phones show
      for (const r of [row(/(^|\s)max-sm:hidden(\s|$)/), row(/(^|\s)sm:hidden(\s|$)/)]) {
        expect(r[0]).toBe(1);
        expect(r[r.length - 1]).toBe(count);
        expect(r).toContain(page);
        for (let i = 1; i < r.length; i++) {
          const [a, b] = [r[i - 1], r[i]];
          if (typeof a === 'number' && typeof b === 'number') expect(b - a).toBe(1);
          expect(a === '…' && b === '…').toBe(false);
        }
      }
    },
  );
  it('Field values wrap long unbroken text', () => {
    render(<Field label="URL" mono value="https://example.com/a/very/long/path" />);
    expect(screen.getByText(/very\/long/).className).toMatch(/break-words/);
    expect(screen.getByText(/very\/long/).className).toMatch(/min-w-0/);
  });
  it('Badge and Tag cannot be wider than their container', () => {
    render(
      <>
        <Badge>b</Badge>
        <Tag>t</Tag>
      </>,
    );
    expect(screen.getByText('b').className).toMatch(/max-w-full/);
    expect(screen.getByText('t').className).toMatch(/max-w-full/);
  });
  it('Alert and Callout share padding and the action radius (rounded-md follows role.radius)', () => {
    const a = render(<Alert tone="info">x</Alert>).container.firstElementChild as HTMLElement;
    const c = render(<Callout tone="info">x</Callout>).container.firstElementChild as HTMLElement;
    for (const el of [a, c]) {
      expect(el.className).toMatch(/p-\[var\(--semantic-space-surface-padding\)\]/);
      expect(el.className).toMatch(/\brounded-md\b/);
      expect(el.className).not.toMatch(/primitive-radius-4/);
    }
  });
  it('Badge, CodeBlock use the tenant-following radius, not a fixed value', () => {
    expect(render(<Badge>b</Badge>).container.firstElementChild!.className).toMatch(
      /\brounded-md\b/,
    );
    expect(src('code-block.tsx')).not.toMatch(/rounded-\[var\(--semantic-radius-action\)\]/);
  });
});

describe('InlineCode copyable (item 20)', () => {
  it('the copy button stays out of the line box: the wrapper is one line tall', () => {
    const { container } = render(<InlineCode copyable>abc</InlineCode>);
    expect((container.firstElementChild as HTMLElement).getAttribute('style')).toMatch(
      /block-size:\s*1lh/,
    );
  });
});

describe('No hidden dependency on the hand-written text utilities (item 21)', () => {
  it.each(['toggle', 'checkbox', 'error-pattern', 'table', 'slider', 'disclosure', 'progress'])(
    '%s.tsx does not rely on utilities.css for text-primary or text-secondary',
    (name) => {
      expect(src(`${name}.tsx`)).not.toMatch(/(^|[\s"'`])text-(primary|secondary)(?![\w-])/m);
    },
  );
});
void fireEvent;

describe('Reduced motion reaches the spinners (review of item 21)', () => {
  // utilities.css is unlayered, so its .animate-spin outranked Tailwind's layered
  // motion-reduce:animate-none: Spinner, Button loading, Input loading and the indeterminate
  // Progress ring kept spinning under prefers-reduced-motion (measured in Chromium).
  it('the hand-written .animate-spin only applies when motion is not reduced', () => {
    const util = css('utilities.css');
    const top = util.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(top).not.toMatch(/\.animate-spin\s*\{/);
    expect(util).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*\.animate-spin\s*\{/,
    );
  });
});
