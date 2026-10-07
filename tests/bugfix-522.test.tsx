/**
 * hds#522 bug bash: component defects. jsdom cannot measure layout, so each test
 * pins the cause the bash measured (a class, a role, an attribute, a source rule);
 * the rendered sizes were re-measured in Chromium against the packed kit.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Progress } from '../src/app/components/progress';
import { SegmentedControl } from '../src/app/components/segmented-control';
import { Slider } from '../src/app/components/slider';
import { Checkbox } from '../src/app/components/checkbox';
import { Radio } from '../src/app/components/radio';
import { Toggle } from '../src/app/components/toggle';
import { Skeleton } from '../src/app/components/skeleton';
import { CodeBlock } from '../src/app/components/code-block';
import { Surface } from '../src/app/components/surface';
import { Card } from '../src/app/components/card';
import { StatusTile } from '../src/app/components/status-tile';
import { Grid } from '../src/app/components/grid';
import { Input } from '../src/app/components/input';
import { Textarea } from '../src/app/components/textarea';
import { Select } from '../src/app/components/select';
import { Combobox } from '../src/app/components/combobox';
import { FormField } from '../src/app/components/form';
import { FormActions } from '../src/app/components/form-actions';
import { Button } from '../src/app/components/button';
import { Alert } from '../src/app/components/alert';
import { Badge } from '../src/app/components/badge';
import { AssetImg } from '../src/app/components/asset-img';
import { ErrorPattern } from '../src/app/components/error-pattern';
import { Stat } from '../src/app/components/stat';
import { MetadataList } from '../src/app/components/metadata-list';
import { Table } from '../src/app/components/table';
import { Pagination } from '../src/app/components/pagination';
import { Divider } from '../src/app/components/divider';
import { Disclosure } from '../src/app/components/disclosure';
import { AlertDialog } from '../src/app/components/alert-dialog';
import { Dialog } from '../src/app/components/dialog';

const css = (p: string) => readFileSync(resolve(process.cwd(), 'src/styles', p), 'utf8');

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

/** Elements a Tab press can land on: natively focusable or tabindex >= 0. */
function tabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('input,button,select,textarea,a[href],[tabindex]'),
  ).filter((el) => {
    const attr = el.getAttribute('tabindex');
    return attr === null ? true : Number(attr) >= 0;
  });
}

describe('Broken', () => {
  it('Progress: neutral fill differs from the track and neither uses unmapped shadcn roles', () => {
    render(<Progress value={30} size="sm" />);
    const track = screen.getByRole('progressbar');
    const fill = track.firstElementChild as HTMLElement;
    expect(track.className).not.toMatch(/\bbg-muted\b/);
    expect(fill.className).not.toMatch(/\bbg-accent\b/);
    expect(fill.className).toMatch(/\bbg-primary\b/);
  });

  it('Progress: sm is thicker than 4px', () => {
    render(<Progress value={30} size="sm" />);
    expect(screen.getByRole('progressbar').className).toMatch(/\bh-1\.5\b/);
  });

  it('SegmentedControl: md segments hug (no w-full inside the w-fit rail)', () => {
    render(
      <SegmentedControl
        label="Range"
        value="day"
        onChange={() => {}}
        options={[
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ]}
      />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.className).not.toMatch(/\bw-full\b/);
      expect(radio.className).toMatch(/\bw-max\b/);
    }
  });

  it('Slider: the track is a bare bar, not a padded Surface, and the fill is rendered', () => {
    const { container } = render(
      <Slider label="Volume" min={0} max={100} value={40} onChange={() => {}} />,
    );
    expect(container.querySelector('[data-hds-surface]')).toBeNull();
    const track = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(track.className).not.toMatch(/\bp-/);
    expect(track.firstElementChild).not.toBeNull();
  });

  it.each([
    ['Checkbox', () => <Checkbox label="A" checked={false} onChange={() => {}} />],
    ['Radio', () => <Radio label="A" name="r" value="a" checked={false} onChange={() => {}} />],
    ['Toggle', () => <Toggle label="A" checked={false} onChange={() => {}} />],
  ])('%s: one tab stop (the input), not the label too', (_name, ui) => {
    const { container } = render(ui());
    const stops = tabStops(container);
    expect(stops).toHaveLength(1);
    expect(stops[0].tagName).toBe('INPUT');
  });

  it('Skeleton: rectangular has a default height and a fill unlike the raised surface', () => {
    render(<Skeleton data-testid="sk" />);
    expect((screen.getByTestId('sk') as HTMLElement).style.height).not.toBe('');
    const rule = css('theme.css').match(/\.hds-skeleton\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toMatch(/background/);
    expect(rule).not.toMatch(/surface-raised/);
  });

  it('Disclosure card / Surface / Card / StatusTile do not stretch to the parent by default', () => {
    render(
      <>
        <Surface data-testid="s">x</Surface>
        <Card data-testid="c">x</Card>
        <StatusTile data-testid="t" title="x" />
      </>,
    );
    for (const id of ['s', 'c', 't']) {
      expect(screen.getByTestId(id).className).not.toMatch(/\bh-full\b/);
    }
  });

  it('CodeBlock: the <pre> is padded 16px, not the 80px section stack', () => {
    render(<CodeBlock code={'a\nb'} />);
    const pre = screen.getByRole('region', { name: 'Code sample' });
    expect(pre.className).not.toMatch(/section-stack/);
    expect(pre.className).toMatch(/scale-sm/);
  });
});

describe('Layout', () => {
  it('form controls cap their width with an overridable 40rem default', () => {
    const noop = () => {};
    const { container } = render(
      <>
        <Input label="i" />
        <Textarea label="t" />
        <Select label="s" options={[{ value: 'a', label: 'A' }]} value="a" onChange={noop} />
        <Combobox
          aria-label="c"
          options={[{ value: 'a', label: 'A' }]}
          value={null}
          onChange={noop}
        />
        <Slider label="v" min={0} max={10} value={1} onChange={noop} />
      </>,
    );
    const roots = [
      screen.getByLabelText('i').closest('div[class*="flex-col"]'),
      screen.getByLabelText('t').closest('div[class*="flex-col"]'),
      container.querySelector('button[role="combobox"][aria-label="s: A"]')?.closest('div'),
      screen.getByRole('combobox', { name: 'c' }),
      screen.getByRole('slider').closest('div[class*="flex-col"]'),
    ];
    for (const el of roots) {
      expect(el?.className).toContain('--hds-form-control-max-width,40rem');
    }
  });

  it('Select shares the Input height, fill, label and chevron', () => {
    render(
      <Select label="Plan" options={[{ value: 'a', label: 'A' }]} value="a" onChange={() => {}} />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.className).toMatch(/\bh-10\b/);
    expect(trigger.className).not.toMatch(/\bpy-2\b/);
    expect(trigger.className).toMatch(/\bbg-background\b/);
    expect(trigger.className).not.toMatch(/\bbg-muted\b/);
    expect(trigger.querySelector('.lucide-chevrons-up-down')).not.toBeNull();
    expect(screen.getByText('Plan').className).toContain('hds-type-ui');
  });

  it('built-in labels match the FormField label', () => {
    render(
      <>
        <Input label="Bare" />
        <Textarea label="Bare text" />
        <FormField label="Wrapped">
          <Input />
        </FormField>
      </>,
    );
    const wrapped = screen.getByText('Wrapped').className;
    expect(screen.getByText('Bare').className).toBe(wrapped);
    expect(screen.getByText('Bare text').className).toBe(wrapped);
  });

  it('Grid hugs by default; align="stretch" opts in; Grid.Item has no height 100%', () => {
    const { container, rerender } = render(
      <Grid>
        <Grid.Item>x</Grid.Item>
      </Grid>,
    );
    const grid = container.querySelector('[data-hds-grid]') as HTMLElement;
    expect(grid.style.alignItems).toBe('start');
    expect((container.querySelector('[data-hds-grid-item]') as HTMLElement).style.height).toBe('');
    rerender(
      <Grid align="stretch">
        <Grid.Item>x</Grid.Item>
      </Grid>,
    );
    expect((container.querySelector('[data-hds-grid]') as HTMLElement).style.alignItems).toBe(
      'stretch',
    );
  });

  it('AssetImg fallback never exceeds its container', () => {
    const { container } = render(<AssetImg src="/missing.png" alt="x" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.maxWidth).toBe('100%');
    // height comes from aspect-ratio (jsdom drops that property), never a fixed px
    expect(frame.style.height).toBe('');
  });

  it('ErrorPattern fits its container; fullPage opts in to 100vh', () => {
    const { container, rerender } = render(<ErrorPattern />);
    expect((container.firstElementChild as HTMLElement).style.minHeight).toBe('');
    rerender(<ErrorPattern fullPage />);
    expect((container.firstElementChild as HTMLElement).style.minHeight).toBe('100vh');
  });

  it('Checkbox, Toggle and Radio rows share one inset and a touch-height hook', () => {
    const { container } = render(
      <>
        <Checkbox label="a" checked={false} onChange={() => {}} />
        <Toggle label="b" checked={false} onChange={() => {}} />
        <Radio label="c" name="r" value="c" checked={false} onChange={() => {}} />
      </>,
    );
    for (const label of Array.from(container.querySelectorAll('label'))) {
      expect(label.className).not.toMatch(/\bpx-\[/);
      expect(label.className).toMatch(/\bpy-\[/);
      expect(label.className).toContain('hds-touch-row');
    }
  });

  it('Stat aligns to the start and spaces label from value', () => {
    render(<Stat data-testid="st" label="MRR" value="$1" sub="up" />);
    expect(screen.getByTestId('st').className).toMatch(/\bself-start\b/);
    expect(screen.getByTestId('st').className).toMatch(/\bgap-1\b/);
  });

  it('MetadataList horizontal sizes the term column to its content', () => {
    render(<MetadataList orientation="horizontal" items={[{ term: 'Owner', description: 'A' }]} />);
    expect(document.querySelector('dl')?.className).toContain('max-content');
    expect(document.querySelector('dl')?.className).not.toMatch(/\bgrid-cols-2\b/);
  });

  it('Table does not double the inset: the scroll region is flush by default', () => {
    render(
      <Table
        columns={[{ key: 'a', label: 'A' }]}
        rows={[{ cells: [{ slot: 'value', content: 'x' }] }]}
      />,
    );
    expect(screen.getByRole('region').className).toMatch(/\bp-0\b/);
  });

  it('vertical Divider stretches across an auto-height row (it lost its Grid.Item height chain)', () => {
    render(<Divider orientation="vertical" />);
    const cls = document.querySelector('hr')?.className ?? '';
    expect(cls).toMatch(/\bself-stretch\b/);
    expect(cls).toMatch(/\bh-auto\b/);
  });

  it('Dialog keeps a 16px margin to the viewport edge', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>t</Dialog.Title>
          <Dialog.Description>d</Dialog.Description>
        </Dialog.Content>
      </Dialog>,
    );
    const content = screen.getByRole('dialog');
    expect(content.className).not.toMatch(/\bw-full\b/);
    expect(content.className).toContain('100%-2*var(--semantic-space-scale-sm)');
  });
});

describe('A11y / keyboard', () => {
  it('Combobox returns focus to the trigger on Escape (single and multiple)', async () => {
    const options = [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
    ];
    function Single() {
      const [v, setV] = useState<string | null>(null);
      return <Combobox aria-label="Country" options={options} value={v} onChange={setV} />;
    }
    function Multi() {
      const [v, setV] = useState<string[]>([]);
      return (
        <Combobox multiple aria-label="Countries" options={options} value={v} onChange={setV} />
      );
    }
    for (const [ui, name] of [
      [<Single key="s" />, 'Country'],
      [<Multi key="m" />, 'Countries'],
    ] as const) {
      const user = userEvent.setup();
      render(ui);
      const trigger = screen.getByRole('combobox', { name });
      await user.click(trigger);
      expect(await screen.findByPlaceholderText('Search…')).toBeTruthy();
      await user.keyboard('{Escape}');
      expect(document.activeElement).toBe(trigger);
      cleanup();
    }
  });

  it('Alert: danger and warning are role=alert, info and success are role=status', () => {
    for (const [tone, role] of [
      ['danger', 'alert'],
      ['warning', 'alert'],
      ['info', 'status'],
      ['success', 'status'],
    ] as const) {
      const { container } = render(<Alert tone={tone}>m</Alert>);
      expect(container.querySelector(`[role="${role}"]`)).not.toBeNull();
      cleanup();
    }
  });

  it('Toggle is a switch', () => {
    render(<Toggle label="Wi-Fi" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toBeTruthy();
  });

  it('a labelled dot Badge is an image, not a live region', () => {
    render(<Badge dot label="Online" />);
    expect(screen.getByRole('img', { name: 'Online' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a pressed toggle Button fills with the accent surface, not the near-white accent role', () => {
    render(<Button label="Bold" pressed onPressedChange={() => {}} />);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('data-[pressed=true]:bg-primary');
    expect(cls).not.toContain('data-[pressed=true]:bg-accent');
  });

  it('touch-target hooks exist for Pagination, the copy buttons and the 390px rule', () => {
    render(
      <>
        <Pagination page={2} count={5} onPageChange={() => {}} />
        <CodeBlock code="x" />
      </>,
    );
    expect(screen.getByLabelText('Page 3').className).toContain('hds-touch-target');
    expect(screen.getAllByLabelText('Copy code')[0].className).toContain('hds-touch-target');
    const theme = css('theme.css');
    const mobile = theme.slice(theme.indexOf('@media (max-width: 639px)'));
    expect(mobile).toMatch(/\.hds-touch-row\s*\{[^}]*min-height/);
    expect(mobile).toMatch(/\.hds-touch-target\s*\{[^}]*min-width/);
  });
});

describe('Visual polish / API traps', () => {
  it('Badge label without dot warns in dev instead of silently rendering nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<Badge label="Active" />);
    expect(container.textContent).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Badge `label`'));
    warn.mockRestore();
  });

  it('FormActions makes a bare Button in the primary slot primary', () => {
    render(
      <FormActions
        primary={<Button label="Save changes" />}
        secondary={<Button label="Cancel" />}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save changes' }).getAttribute('data-variant')).toBe(
      'primary',
    );
    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('data-variant')).not.toBe(
      'primary',
    );
  });
});

describe('Untested fixes, pinned (hds#525 review)', () => {
  it('Disclosure card hugs its content: the Surface has no h-full and the panel is not clipped by a fixed height', () => {
    const { container } = render(
      <Disclosure variant="card" label="Card" defaultOpen>
        <p>one</p>
        <p>two</p>
      </Disclosure>,
    );
    const surface = container.querySelector('[data-hds-surface]') as HTMLElement;
    expect(surface.className).not.toMatch(/\bh-full\b/);
    expect(surface.className).toMatch(/overflow-hidden/);
    expect(surface.style.height).toBe('');
  });

  it('AlertDialog keeps a 16px margin to the viewport edge', () => {
    render(
      <AlertDialog open>
        <AlertDialog.Content>
          <AlertDialog.Title>t</AlertDialog.Title>
          <AlertDialog.Description>d</AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog>,
    );
    const content = screen.getByRole('alertdialog');
    expect(content.className).not.toMatch(/\bw-full\b/);
    expect(content.className).toContain('100%-2*var(--semantic-space-scale-sm)');
  });

  it('Dialog caps its height to the viewport and scrolls', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>t</Dialog.Title>
          <Dialog.Description>d</Dialog.Description>
        </Dialog.Content>
      </Dialog>,
    );
    const cls = screen.getByRole('dialog').className;
    expect(cls).toContain('max-h-[calc(100dvh-2*var(--semantic-space-scale-sm))]');
    expect(cls).toMatch(/\boverflow-y-auto\b/);
  });

  it('Combobox returns focus to the trigger after a pick', async () => {
    const options = [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
    ];
    function Single() {
      const [v, setV] = useState<string | null>(null);
      return <Combobox aria-label="Country" options={options} value={v} onChange={setV} />;
    }
    const user = userEvent.setup();
    render(<Single />);
    const trigger = screen.getByRole('combobox', { name: 'Country' });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Canada' }));
    expect(document.activeElement).toBe(trigger);
  });
});
