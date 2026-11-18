/**
 * One height per size across every control (Fable eval #2). Rendered at 1440px,
 * Button was 44, Tabs 42, Input and Select 40, Pagination 36 and SegmentedControl
 * 32. Each control now takes its height from semantic.size.controlHeight.<size>
 * (32 / 40 / 48), and touch still lifts sm and md to 44 (hds-touch-row).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Combobox } from './combobox';
import { Tabs, TabsList, TabsTrigger } from './tabs';
import { SegmentedControl } from './segmented-control';
import { Pagination } from './pagination';

afterEach(cleanup);

const SIZES = ['sm', 'md', 'lg'] as const;
const token = (size: string) => `var(--semantic-size-controlHeight-${size})`;
const tokens = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as {
  semantic: { size: { controlHeight: Record<string, { $value: string }> } };
  component: {
    button: { size: Record<string, { height: { $value: string } }> };
    pagination: { compactControlSize: { $value: string } };
  };
};

describe('semantic.size.controlHeight', () => {
  it('is 32 / 40 / 48 from the primitive size ladder', () => {
    const ladder = tokens.semantic.size.controlHeight;
    expect(SIZES.map((s) => ladder[s].$value)).toEqual([
      '{primitive.size.32}',
      '{primitive.size.40}',
      '{primitive.size.48}',
    ]);
  });

  it('is the only source of the Button heights and the compact Pagination square', () => {
    for (const s of SIZES) {
      expect(tokens.component.button.size[s].height.$value).toBe(
        `{semantic.size.controlHeight.${s}}`,
      );
    }
    expect(tokens.component.pagination.compactControlSize.$value).toBe(
      '{semantic.size.controlHeight.md}',
    );
  });
});

describe('every control binds its height to the shared token', () => {
  it.each(SIZES)('Button %s', (size) => {
    const { getByRole } = render(<Button size={size} label="Save" />);
    expect(getByRole('button').className).toContain(`--component-button-size-${size}-height`);
  });

  it.each(SIZES)('Input %s', (size) => {
    const { getByRole } = render(<Input size={size} aria-label="Name" />);
    const field = getByRole('textbox');
    expect(field.className).toContain(token(size));
  });

  it('Select (md)', () => {
    const { getByRole } = render(
      <Select
        label="Pick"
        showLabel={false}
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'Alpha' }]}
      />,
    );
    expect(getByRole('combobox').className).toContain(token('md'));
  });

  it('Combobox (md)', () => {
    const { container } = render(
      <Combobox
        label="Pick"
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'Alpha' }]}
      />,
    );
    expect(container.querySelector(`[class*="${token('md')}"]`)).not.toBeNull();
  });

  it('Tabs (md)', () => {
    const { getByRole } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    // A minimum, so a wrapped label grows the tab instead of clipping.
    expect(getByRole('tab').className).toContain(`min-h-[${token('md')}]`);
  });

  it.each(['sm', 'md'] as const)('SegmentedControl %s', (size) => {
    const { getAllByRole } = render(
      <SegmentedControl
        size={size}
        label="Mode"
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />,
    );
    // The rail adds 2 x its padding and a 1px border on each side, so the segment
    // is the shared height minus that.
    for (const segment of getAllByRole('radio')) {
      expect(segment.className).toContain(`h-[calc(${token(size)}-2*var(--seg-rail-pad)-2px)]`);
    }
  });

  it('Pagination uses the sm Button height', () => {
    const { getAllByRole } = render(<Pagination page={2} count={5} onPageChange={() => {}} />);
    for (const button of getAllByRole('button')) {
      expect(button.className).toContain('--component-button-size-sm-height');
    }
  });
});
