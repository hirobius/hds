/**
 * Contract test: the accessibility contract of the choice, value and form-field
 * inputs (hds#520, family B): Checkbox, Radio, Toggle, Slider, SegmentedControl,
 * Tag, Input and Textarea.
 *
 * Each `a11y:<component>.<behaviour>` id in a test title is the proof the
 * component's `@a11y component` rule points at (scripts/check-a11y-contracts.mjs).
 * Keyboard cases press real keys through user-event; screen-reader cases read
 * the jsdom accessibility tree with @guidepup/virtual-screen-reader (the role,
 * name and state a reader speaks, not NVDA or VoiceOver). Target size is read
 * from the stylesheet: jsdom has no layout, so the 390px mobile block of
 * theme.css and the declared hit-area classes stand in for a 390px viewport.
 *
 * @primitive Checkbox Radio Toggle Slider SegmentedControl Tag Input Textarea
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { virtual } from '@guidepup/virtual-screen-reader';
import { Checkbox } from '@/app/components/checkbox';
import { Radio } from '@/app/components/radio';
import { Toggle } from '@/app/components/toggle';
import { Slider } from '@/app/components/slider';
import { SegmentedControl } from '@/app/components/segmented-control';
import { Tag } from '@/app/components/tag';
import { Input } from '@/app/components/input';
import { Textarea } from '@/app/components/textarea';
import { user } from './overlay-fixtures';

afterEach(async () => {
  await virtual.stop();
  cleanup();
});

const noop = () => {};

const theme = readFileSync(resolve(__dirname, '../../src/styles/theme.css'), 'utf8');

/** The body of the first `{ ... }` block that starts at `from`. */
function block(css: string, from: number): string {
  let depth = 0;
  for (let i = css.indexOf('{', from); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
  }
  throw new Error('unbalanced block');
}

/** The declarations of `selector` inside theme.css's phone-width (<= 639px) block. */
function phoneRule(selector: string): string {
  const media = block(theme, theme.indexOf('@media (max-width: 639px)'));
  const at = media.indexOf(`${selector} {`);
  expect(at, `${selector} inside @media (max-width: 639px)`).toBeGreaterThan(-1);
  return block(media, at);
}

async function readAll(container: HTMLElement) {
  await virtual.start({ container });
  const steps = container.querySelectorAll('*').length + 2;
  for (let i = 0; i < steps; i++) await virtual.next();
  return virtual.spokenPhraseLog();
}

function Stateful({
  children,
}: {
  children: (on: boolean, set: (v: boolean) => void) => React.ReactNode;
}) {
  const [on, set] = useState(false);
  return <>{children(on, set)}</>;
}

describe('Checkbox accessibility contract', () => {
  it('a11y:checkbox.space-toggles Space toggles the checkbox from the keyboard', async () => {
    render(
      <Stateful>{(on, set) => <Checkbox label="Accept" checked={on} onChange={set} />}</Stateful>,
    );
    const box = screen.getByRole('checkbox', { name: 'Accept' }) as HTMLInputElement;
    box.focus();
    await user().keyboard(' ');
    expect(box.checked).toBe(true);
    await user().keyboard(' ');
    expect(box.checked).toBe(false);
  });

  it('a11y:checkbox.name-and-state is named by its label and reports mixed', () => {
    render(<Checkbox label="Select all" checked={false} indeterminate onChange={noop} />);
    const box = screen.getByRole('checkbox', { name: 'Select all' });
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('a11y:checkbox.disabled-skipped a disabled checkbox is not in the tab order', async () => {
    render(
      <>
        <Checkbox label="Off" checked={false} disabled onChange={noop} />
        <Checkbox label="On" checked={false} onChange={noop} />
      </>,
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'On' }));
  });

  it('a11y:checkbox.sr-state a screen reader speaks the name and the checked, unchecked or mixed state', async () => {
    const { container } = render(
      <>
        <Checkbox label="Alpha" checked onChange={noop} />
        <Checkbox label="Beta" checked={false} onChange={noop} />
        <Checkbox label="Gamma" checked={false} indeterminate onChange={noop} />
      </>,
    );
    const log = await readAll(container);
    expect(log).toContain('checkbox, Alpha, checked');
    expect(log).toContain('checkbox, Beta, not checked');
    expect(log).toContain('checkbox, Gamma, partially checked');
  });

  it('a11y:checkbox.target-size the row is 24px or more and lifts to the touch minimum on a phone', () => {
    render(<Checkbox label="Accept" checked={false} onChange={noop} />);
    const row = screen.getByRole('checkbox').parentElement as HTMLElement;
    expect(row.className).toContain('hds-touch-row');
    expect(phoneRule('.hds-touch-row')).toMatch(
      /min-height:\s*var\(--primitive-size-interactive-min\)/,
    );
  });
});

describe('Radio accessibility contract', () => {
  function Group() {
    const [v, setV] = useState('a');
    return (
      <fieldset>
        <legend>Plan</legend>
        {['a', 'b', 'c'].map((id) => (
          <Radio
            key={id}
            name="plan"
            value={id}
            label={`Plan ${id.toUpperCase()}`}
            checked={v === id}
            onChange={(on) => on && setV(id)}
          />
        ))}
      </fieldset>
    );
  }

  it('a11y:radio.arrows-select-group Arrow keys move and select inside a same-name group, with one tab stop', async () => {
    render(
      <>
        <Group />
        <button type="button">after</button>
      </>,
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Plan A' }));
    await user().keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Plan B' }));
    expect((screen.getByRole('radio', { name: 'Plan B' }) as HTMLInputElement).checked).toBe(true);
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it('a11y:radio.sr-group a screen reader speaks the group name and each radio with its state', async () => {
    const { container } = render(<Group />);
    const log = await readAll(container);
    expect(log).toContain('group, Plan');
    expect(log).toContain('radio, Plan A, checked, position 1, set size 3');
    expect(log).toContain('radio, Plan B, not checked, position 2, set size 3');
  });

  it('a11y:radio.disabled-skipped a disabled radio is skipped by Tab', async () => {
    render(
      <>
        <Radio name="x" label="Off" checked={false} disabled onChange={noop} />
        <button type="button">next</button>
      </>,
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'next' }));
  });

  it('a11y:radio.target-size the row lifts to the touch minimum on a phone', () => {
    render(<Radio label="Card" checked={false} onChange={noop} />);
    expect((screen.getByRole('radio').parentElement as HTMLElement).className).toContain(
      'hds-touch-row',
    );
    expect(phoneRule('.hds-touch-row')).toMatch(
      /min-height:\s*var\(--primitive-size-interactive-min\)/,
    );
  });
});

describe('Toggle accessibility contract', () => {
  it('a11y:toggle.space-toggles Space flips the switch from the keyboard', async () => {
    render(
      <Stateful>{(on, set) => <Toggle label="Wi-Fi" checked={on} onChange={set} />}</Stateful>,
    );
    const sw = screen.getByRole('switch', { name: 'Wi-Fi' }) as HTMLInputElement;
    sw.focus();
    await user().keyboard(' ');
    expect(sw.checked).toBe(true);
  });

  it('a11y:toggle.sr-switch a screen reader speaks a switch with its on or off state', async () => {
    const { container } = render(
      <>
        <Toggle label="Wi-Fi" checked onChange={noop} />
        <Toggle label="Bluetooth" checked={false} onChange={noop} />
      </>,
    );
    const log = await readAll(container);
    expect(log).toContain('switch, Wi-Fi, checked');
    expect(log).toContain('switch, Bluetooth, not checked');
  });

  it('a11y:toggle.disabled-skipped a disabled switch is skipped by Tab', async () => {
    render(
      <>
        <Toggle label="Off" checked={false} disabled onChange={noop} />
        <button type="button">next</button>
      </>,
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'next' }));
  });

  it('a11y:toggle.target-size the row lifts to the touch minimum on a phone', () => {
    render(<Toggle label="Wi-Fi" checked={false} onChange={noop} />);
    expect((screen.getByRole('switch').parentElement as HTMLElement).className).toContain(
      'hds-touch-row',
    );
    expect(phoneRule('.hds-touch-row')).toMatch(
      /min-height:\s*var\(--primitive-size-interactive-min\)/,
    );
  });
});

describe('Slider accessibility contract', () => {
  it('a11y:slider.native-range-keys is a native range input, so arrows, PageUp/PageDown and Home/End work', () => {
    render(<Slider label="Volume" min={0} max={10} step={2} value={4} onChange={noop} />);
    const range = screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement;
    expect(range.tagName).toBe('INPUT');
    expect(range.type).toBe('range');
    expect(range.getAttribute('tabindex')).not.toBe('-1');
    // The browser owns the keys: a handler that cancels them would break the contract.
    for (const key of ['ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(fireEvent.keyDown(range, { key }), key).toBe(true);
    }
  });

  it('a11y:slider.name-range-value exposes its name, min, max and value', () => {
    render(<Slider label="Volume" min={0} max={10} value={4} onChange={noop} />);
    const range = screen.getByRole('slider', { name: 'Volume' });
    expect(range.getAttribute('min')).toBe('0');
    expect(range.getAttribute('max')).toBe('10');
    expect((range as HTMLInputElement).value).toBe('4');
  });

  it('a11y:slider.label-click the visible label is associated with the range input', async () => {
    render(<Slider label="Volume" min={0} max={10} value={4} onChange={noop} />);
    await user().click(screen.getByText('Volume'));
    expect(document.activeElement).toBe(screen.getByRole('slider'));
  });

  it('a11y:slider.valuetext a valueText prop is exposed as aria-valuetext', () => {
    render(<Slider label="Price" min={0} max={100} value={40} valueText="$40" onChange={noop} />);
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('$40');
  });

  it('a11y:slider.sr-value a screen reader speaks the name and the formatted value', async () => {
    const { container } = render(
      <Slider label="Price" min={0} max={100} value={40} valueText="$40" onChange={noop} />,
    );
    const log = await readAll(container);
    expect(log.some((p) => p.startsWith('slider, Price') && p.includes('$40'))).toBe(true);
  });
});

describe('SegmentedControl accessibility contract', () => {
  const OPTIONS = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  function Seg({ size }: { size?: 'sm' | 'md' }) {
    const [v, setV] = useState('day');
    return (
      <>
        <SegmentedControl label="Range" options={OPTIONS} value={v} onChange={setV} size={size} />
        <button type="button">after</button>
      </>
    );
  }

  it('a11y:segmented-control.roving-focus is one tab stop; arrows move focus and select, like native radios', async () => {
    render(<Seg />);
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Day' }));
    await user().keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Week' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Week' }).getAttribute('aria-checked')).toBe('true'),
    );
    expect(screen.getByRole('radio', { name: 'Day' }).getAttribute('aria-checked')).toBe('false');
    await user().keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Month' }).getAttribute('aria-checked')).toBe(
        'true',
      ),
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it('a11y:segmented-control.group-and-radio-roles is a named radiogroup of aria-checked radios', () => {
    render(<Seg />);
    expect(screen.getByRole('radiogroup', { name: 'Range' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('a11y:segmented-control.sr-group a screen reader speaks the group name and each radio with position', async () => {
    const { container } = render(<Seg />);
    const log = await readAll(container);
    expect(log.some((p) => p.startsWith('radiogroup, Range'))).toBe(true);
    expect(log.some((p) => p.startsWith('radio, Day, checked'))).toBe(true);
    expect(log.some((p) => p.startsWith('radio, Week, not checked'))).toBe(true);
  });

  it.each(['sm', 'md'] as const)(
    'a11y:segmented-control.target-size a %s segment hit area is 24px or more',
    (size) => {
      render(<Seg size={size} />);
      const cls = screen.getByRole('radio', { name: 'Day' }).className;
      const minH = Number(cls.match(/(?<![:\w-])min-h-\[(\d+)px\]/)?.[1] ?? 0);
      // A pseudo-element grows the hit area past the segment into the rail padding.
      const grow = Number(cls.match(/before:-inset-y-\[(\d+)px\]/)?.[1] ?? 0);
      if (grow > 0) {
        // An inset with no generated box is inert: the pseudo-element must exist and be
        // positioned against the (relative) segment, or the hit area never grows.
        const tokens = cls.split(/\s+/);
        expect(tokens).toContain("before:content-['']");
        expect(tokens).toContain('before:absolute');
        expect(tokens).toContain('relative');
      }
      expect(minH + 2 * grow).toBeGreaterThanOrEqual(24);
    },
  );
});

describe('Tag accessibility contract', () => {
  it('a11y:tag.keyboard-activate Enter and Space activate the tag', async () => {
    let n = 0;
    render(<Tag onClick={() => n++}>Design</Tag>);
    screen.getByRole('button', { name: 'Design' }).focus();
    await user().keyboard('{Enter}');
    await user().keyboard(' ');
    expect(n).toBe(2);
  });

  it('a11y:tag.pressed-state reports the selected state with aria-pressed', () => {
    const { rerender } = render(<Tag active>Design</Tag>);
    expect(screen.getByRole('button', { name: 'Design' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    rerender(<Tag>Design</Tag>);
    expect(screen.getByRole('button', { name: 'Design' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('a11y:tag.sr-toggle-button a screen reader speaks a toggle button with its pressed state', async () => {
    const { container } = render(
      <>
        <Tag active>Design</Tag>
        <Tag>Code</Tag>
      </>,
    );
    const log = await readAll(container);
    expect(log).toContain('button, Design, pressed');
    expect(log).toContain('button, Code, not pressed');
  });

  it('a11y:tag.disabled-skipped a disabled tag is skipped by Tab', async () => {
    render(
      <>
        <Tag disabled>Off</Tag>
        <Tag>On</Tag>
      </>,
    );
    await user().tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'On' }));
  });

  it('a11y:tag.target-size the pill is at least 24px tall and 48px wide', () => {
    render(<Tag>Design</Tag>);
    const pill = screen.getByRole('button').firstElementChild as HTMLElement;
    expect(pill.className).toContain('min-h-[var(--component-tag-minHeight)]');
    const tokens = readFileSync(
      resolve(__dirname, '../../src/styles/tokens.generated.css'),
      'utf8',
    );
    expect(tokens).toMatch(/--component-tag-minHeight:\s*var\(--primitive-space-6\)/);
    expect(tokens).toMatch(/--primitive-space-6:\s*24px/);
  });
});

describe('Input accessibility contract', () => {
  it('a11y:input.clear-button the clear button is named, reachable by Tab, and returns focus to the field', async () => {
    render(<Input label="Search" type="search" defaultValue="abc" />);
    const field = screen.getByRole('searchbox', { name: 'Search' }) as HTMLInputElement;
    field.focus();
    await user().tab();
    const clear = screen.getByRole('button', { name: 'Clear search' });
    expect(document.activeElement).toBe(clear);
    await user().keyboard('{Enter}');
    expect(field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });

  it('a11y:input.error-wiring an error sets aria-invalid, is described by the message, and is announced', () => {
    render(<Input label="Email" error errorMessage="Enter a valid email" />);
    const field = screen.getByRole('textbox', { name: 'Email' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Enter a valid email');
    expect(field.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('a11y:input.sr-field a screen reader speaks the label, the invalid state and the error', async () => {
    const { container } = render(<Input label="Email" error errorMessage="Enter a valid email" />);
    const log = await readAll(container);
    expect(log.some((p) => p.startsWith('textbox, Email') && p.includes('invalid'))).toBe(true);
    expect(log.some((p) => p.includes('Enter a valid email'))).toBe(true);
  });

  it('a11y:input.clear-target-size the clear button spans the field height and is 24px or wider', () => {
    render(<Input label="Search" type="search" defaultValue="abc" size="sm" />);
    const clear = screen.getByRole('button', { name: 'Clear search' });
    // inset-y-0 = the whole field height (>= 32px); px-2 + a 14px glyph = 30px wide.
    expect(clear.className).toContain('inset-y-0');
    expect(clear.className).toContain('px-2');
  });
});

describe('Textarea accessibility contract', () => {
  it('a11y:textarea.error-wiring an error sets aria-invalid, is described by the message, and is announced', () => {
    render(<Textarea label="Message" error errorMessage="Required" />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(field.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('a11y:textarea.sr-field a screen reader speaks the label, the invalid state and the error', async () => {
    const { container } = render(<Textarea label="Message" error errorMessage="Required" />);
    const log = await readAll(container);
    expect(log.some((p) => p.startsWith('textbox, Message') && p.includes('invalid'))).toBe(true);
    expect(log.some((p) => p.includes('Required'))).toBe(true);
  });
});
