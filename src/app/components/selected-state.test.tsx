/**
 * One selected look (Adrian 2026-11-18): every selectable component reads its fill and
 * text from semantic.color.selected and its label weight from
 * semantic.typography.weight.selected, so the selected colour can change in one place.
 * The primary Button and the focus ring do not read it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { SegmentedControl } from './segmented-control';
import { Tabs, TabsList, TabsTrigger } from './tabs';
import { NavList } from './nav-list';
import { Tag } from './tag';
import { Pagination } from './pagination';
import { Card } from './card';
import { Button } from './button';

afterEach(cleanup);

const BG = 'var(--semantic-color-selected-bg)';
const FG = 'var(--semantic-color-selected-fg)';
const WEIGHT = 'var(--semantic-typography-weight-selected)';
const html = (el: Element) => el.outerHTML;

const tokens = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as {
  semantic: {
    color: { selected: Record<'bg' | 'fg', { $value: string }> };
    typography: { weight: { selected: { $value: string } } };
  };
  component: { tag: Record<string, { $value: string }> };
};

describe('semantic.color.selected', () => {
  it('mirrors the accent fill and onAccent text as its own token, semibold', () => {
    // Semantic tokens alias primitives (check-token-structure), so the values are copied,
    // with the same light and dark modes; an accent theme sets its own selected pair.
    const t = tokens as unknown as {
      semantic: {
        accent: { rest: { $value: string } };
        color: { content: { onAccent: { $value: string } } };
      };
    };
    expect(tokens.semantic.color.selected.bg.$value).toBe(t.semantic.accent.rest.$value);
    expect(tokens.semantic.color.selected.fg.$value).toBe(t.semantic.color.content.onAccent.$value);
    expect(tokens.semantic.typography.weight.selected.$value).toBe(
      '{primitive.typography.weight.semibold}',
    );
  });

  it('feeds the Tag active tokens', () => {
    expect(tokens.component.tag.activeBackground.$value).toBe('{semantic.color.selected.bg}');
    expect(tokens.component.tag.activeBorder.$value).toBe('{semantic.color.selected.bg}');
    expect(tokens.component.tag.activeText.$value).toBe('{semantic.color.selected.fg}');
  });
});

describe('every selectable component reads the shared selected look', () => {
  it.each(['primary', 'secondary'] as const)('SegmentedControl %s', (variant) => {
    const { getAllByRole } = render(
      <SegmentedControl
        variant={variant}
        aria-label="View"
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Review' },
          { value: 'b', label: 'Apply' },
        ]}
      />,
    );
    const [on, off] = getAllByRole('radio');
    expect(html(on)).toContain(BG);
    expect(on.className).toContain(FG);
    expect(html(on)).toContain(WEIGHT);
    expect(html(off)).not.toContain(WEIGHT);
  });

  it('Tabs', () => {
    const { getByRole } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Overview</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const cls = getByRole('tab').className;
    expect(cls).toContain(`data-[state=active]:bg-[${BG}]`);
    expect(cls).toContain(`data-[state=active]:text-[${FG}]`);
    expect(cls).toContain(`data-[state=active]:[font-weight:${WEIGHT}]`);
  });

  it('NavList', () => {
    const { getByRole } = render(
      <NavList aria-label="Sections">
        <NavList.Item onSelect={() => {}} selected>
          Components
        </NavList.Item>
        <NavList.Item onSelect={() => {}}>Patterns</NavList.Item>
      </NavList>,
    );
    const current = getByRole('button', { name: 'Components' });
    for (const v of [BG, FG, WEIGHT]) expect(current.className).toContain(v);
    expect(getByRole('button', { name: 'Patterns' }).className).not.toContain(BG);
  });

  it('Tag', () => {
    const { getByRole } = render(
      <Tag active onClick={() => {}}>
        To apply
      </Tag>,
    );
    const pill = getByRole('button').firstElementChild as HTMLElement;
    expect(pill.className).toContain('var(--component-tag-activeBackground)');
    expect(pill.className).toContain(WEIGHT);
  });

  it('Pagination current page', () => {
    const { getByRole } = render(<Pagination page={2} count={5} onPageChange={() => {}} />);
    const current = getByRole('button', { name: 'Page 2' });
    expect(current.className).toContain(`bg-[${BG}]`);
    expect(current.className).toContain(`text-[${FG}]`);
    expect(getByRole('button', { name: 'Page 3' }).className).not.toContain(BG);
  });

  it('Card selectable: the selected ring, apart from the focus ring', () => {
    const { getByRole } = render(
      <Card selectable selected onSelectedChange={() => {}}>
        Plan
      </Card>,
    );
    const card = getByRole('checkbox');
    expect(card.className).toContain(`data-[selected=true]:ring-[color:${BG}]`);
    expect(card.className).not.toContain('data-[selected=true]:ring-ring');
  });

  it('leaves the primary Button on its own tokens', () => {
    const { getByRole } = render(<Button variant="primary" label="Save" />);
    expect(getByRole('button').className).not.toContain('semantic-color-selected');
  });
});
