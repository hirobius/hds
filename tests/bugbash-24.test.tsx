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
  it('a disabled Radio ring fades like Checkbox and Toggle', () => {
    const s = src('radio.tsx');
    const m = s.match(/disabled:\s*\{[\s\S]*?\}/g)?.join('\n') ?? '';
    expect(s).toMatch(/border-default/);
    expect(m).not.toMatch(/border-\[color:var\(--semantic-color-content-secondary\)\]/);
  });
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
void fireEvent;
void Radio;
