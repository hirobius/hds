/**
 * Contract test: text fields on a phone or a touch screen (hds#863).
 *
 * 1. iOS Safari zooms the page into any focused field whose text is under 16px,
 *    and the page stays zoomed after blur. Input sm/md, Textarea, TokenField and
 *    the Combobox / CommandPalette search fields set their text in the caption
 *    or ui role (14px in compact density, 13px for caption), so each carries the
 *    .hds-touch-text hook. Inside theme.css's touch block (phone width or a
 *    coarse pointer) it lifts the text to 16px. Those roles are 16px or less in
 *    every density and tenant, so the hook never shrinks text. Input lg is in the
 *    body role (18px) and keeps it.
 * 2. Input's clear button carries .hds-touch-target, so in the same block it
 *    grows to semantic.size.touchTarget (44px), wider than sm's pr-7 and md's
 *    pr-9. While it shows, the value's end padding is pr-11 (44px) at every
 *    size, so typed text never runs under the button. (A touch-only padding
 *    rule would not fit styles.css's 22 kB gzip budget.)
 *
 * jsdom has no layout or media queries: the rules are read from theme.css and
 * the hooks from the rendered class lists, as touch-target.test.tsx does.
 *
 * @primitive Input Textarea TokenField Combobox CommandPalette
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Input } from '@/app/components/input';
import { Textarea } from '@/app/components/textarea';
import { TokenField } from '@/app/components/token-field';
import { Combobox } from '@/app/components/combobox';
import { CreatableCombobox } from '@/app/components/combobox-creatable';
import { CommandPalette } from '@/app/components/command-palette';
import { user, FRUIT } from './overlay-fixtures';
import { theme, touchBlock, touchRule } from './touch-css-fixtures';

afterEach(cleanup);

const tokens = readFileSync(resolve(__dirname, '../../src/styles/tokens.generated.css'), 'utf8');

const hasHook = (el: Element, hook: string) => el.classList.contains(hook);

describe('touch field CSS', () => {
  it('.hds-touch-text lifts field text to the 16px type step', () => {
    expect(touchRule('.hds-touch-text')).toMatch(
      /font-size:\s*var\(--primitive-typography-size-base\)/,
    );
    expect(tokens).toMatch(/--primitive-typography-size-base:\s*16px/);
  });

  it('16px is a floor, never a shrink: the caption and ui roles are 16px or less in both densities', () => {
    const sizes = [
      ...tokens.matchAll(
        /--semantic-typography-(?:ui|caption)-font-size:\s*var\(--primitive-typography-size-(\w+)\)/g,
      ),
    ].map((m) => m[1]);
    expect(sizes.length).toBeGreaterThanOrEqual(4);
    for (const step of sizes) {
      const px = Number(
        tokens.match(new RegExp(`--primitive-typography-size-${step}:\\s*(\\d+)px`))![1],
      );
      expect(px, step).toBeLessThanOrEqual(16);
    }
  });

  it('the clear button grows to the 44px touch target in the same block', () => {
    expect(touchRule('.hds-touch-target')).toMatch(
      /min-width:\s*var\(--semantic-size-touchTarget\)/,
    );
    expect(tokens).toMatch(
      /--semantic-size-touchTarget:\s*var\(--primitive-size-interactive-min\)/,
    );
    expect(tokens).toMatch(/--primitive-size-interactive-min:\s*44px/);
  });

  it('declares the text hook nowhere else, so a fine pointer on a wide viewport is unchanged', () => {
    const outside = theme.replace(touchBlock(), '');
    expect(outside).not.toMatch(/\.hds-touch-text\s*\{/);
  });
});

describe('fields carry the 16px touch hook', () => {
  it('a11y:input.touch-text Input sm and md carry .hds-touch-text; lg (body role, 18px) does not', () => {
    render(
      <>
        <Input label="Small" size="sm" />
        <Input label="Medium" />
        <Input label="Large" size="lg" />
        <Input label="Price" size="sm" prefix="$" />
      </>,
    );
    expect(hasHook(screen.getByLabelText('Small'), 'hds-touch-text')).toBe(true);
    expect(hasHook(screen.getByLabelText('Medium'), 'hds-touch-text')).toBe(true);
    expect(hasHook(screen.getByLabelText('Large'), 'hds-touch-text')).toBe(false);
    // In a prefix/suffix shell the hook sits on the <input> itself, where the text is.
    expect(hasHook(screen.getByLabelText('Price'), 'hds-touch-text')).toBe(true);
  });

  it('a11y:textarea.touch-text Textarea carries .hds-touch-text', () => {
    render(<Textarea label="Message" />);
    expect(hasHook(screen.getByLabelText('Message'), 'hds-touch-text')).toBe(true);
  });

  it('a11y:token-field.touch-text TokenField carries .hds-touch-text', () => {
    render(<TokenField label="Message" value="" onChange={() => {}} />);
    expect(hasHook(screen.getByRole('textbox', { name: 'Message' }), 'hds-touch-text')).toBe(true);
  });

  it('a11y:combobox.touch-text the Combobox search field and the creatable input carry .hds-touch-text', async () => {
    render(
      <>
        <Combobox options={FRUIT} value={null} onChange={() => {}} aria-label="Fruit" />
        <CreatableCombobox
          options={FRUIT}
          value={[]}
          onChange={() => {}}
          onCreate={() => {}}
          placeholder="Add a tag"
          emptyMessage="No tags"
          ariaLabel="Tags"
          disabled={false}
        />
      </>,
    );
    expect(hasHook(screen.getByRole('combobox', { name: 'Tags' }), 'hds-touch-text')).toBe(true);
    screen.getByRole('combobox', { name: 'Fruit' }).focus();
    await user().keyboard('{Enter}');
    const search = document.activeElement as HTMLElement;
    expect(search.tagName).toBe('INPUT');
    expect(hasHook(search, 'hds-touch-text')).toBe(true);
  });

  it('a11y:command-palette.touch-text the CommandPalette search field carries .hds-touch-text', () => {
    render(
      <CommandPalette
        open
        items={[{ id: 'a', label: 'Open settings' }]}
        onOpenChange={() => {}}
        onSelect={() => {}}
      />,
    );
    const search = screen.getByRole('combobox');
    expect(search.tagName).toBe('INPUT');
    expect(hasHook(search, 'hds-touch-text')).toBe(true);
  });
});

describe('Input end padding follows the clear button', () => {
  const endPad = (el: Element) => [...el.classList].filter((c) => /^pr-/.test(c));

  it.each(['sm', 'md', 'lg'] as const)(
    'a11y:input.clear-pad %s: while the clear button shows, the end padding is pr-11 (its 44px touch width)',
    (size) => {
      render(
        <>
          <Input label="Filled" size={size} defaultValue="Ada" />
          <Input label="Typed" size={size} />
        </>,
      );
      expect(screen.getByRole('button', { name: 'Clear input' }).className).toContain(
        'hds-touch-target',
      );
      expect(endPad(screen.getByLabelText('Filled'))).toEqual(['pr-11']);
      // Typing into an empty field brings the clear button and the padding with it.
      const typed = screen.getByLabelText('Typed');
      expect(endPad(typed)).not.toEqual(['pr-11']);
      fireEvent.change(typed, { target: { value: 'x' } });
      expect(endPad(typed)).toEqual(['pr-11']);
    },
  );

  it('a trailing visual or the loading spinner (not touch targets) keeps the size padding', () => {
    render(
      <>
        <Input label="Unit" defaultValue="4" trailingVisual={<span>kg</span>} />
        <Input label="Busy" defaultValue="Ada" loading />
      </>,
    );
    expect(endPad(screen.getByLabelText('Unit'))).toEqual(['pr-9']);
    expect(endPad(screen.getByLabelText('Busy'))).toEqual(['pr-9']);
  });
});
