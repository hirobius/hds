/**
 * hds#622: StatusTile folds into Card. Card.Row (with Card.RowTitle and
 * Card.RowNote) is the Card slot that renders a StatusTile's content, so the
 * composition below must render the same structure and classes StatusTile
 * renders today.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Card, CardRow, CardRowTitle, CardRowNote } from './card';
import { StatusTile } from './status-tile';
import { Badge } from './badge';

afterEach(cleanup);

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

/** A StatusTile and its Card composition, rendered side by side. */
function renderBoth(content: {
  title: React.ReactNode;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}) {
  const tile = render(<StatusTile {...content} />).container.firstElementChild as HTMLElement;
  const card = render(
    <Card padding="item" className="border-0">
      <Card.Row trailing={content.trailing}>
        <Card.RowTitle>{content.title}</Card.RowTitle>
        {content.notes?.map((note, i) => (
          <Card.RowNote key={i}>{note}</Card.RowNote>
        ))}
      </Card.Row>
    </Card>,
  ).container.firstElementChild as HTMLElement;
  return { tile, card, row: card.firstElementChild as HTMLElement };
}

describe('Card.Row renders a StatusTile’s content (hds#622)', () => {
  it('hangs the row parts off Card', () => {
    expect(CardRow).toBeDefined();
    expect(CardRowTitle).toBeDefined();
    expect(CardRowNote).toBeDefined();
    expect(Card.Row).toBe(CardRow);
    expect(Card.RowTitle).toBe(CardRowTitle);
    expect(Card.RowNote).toBe(CardRowNote);
  });

  it('renders title, notes and trailing slot with the same DOM as StatusTile', () => {
    const { tile, row } = renderBoth({
      title: 'Figma sync',
      notes: ['Last run 2 hours ago', 'Owner: Adrian'],
      trailing: <Badge tone="success">Synced</Badge>,
    });
    expect(row.innerHTML).toBe(tile.innerHTML);
  });

  it('matches StatusTile with a title alone, and with a false trailing', () => {
    const alone = renderBoth({ title: 'Bundle size' });
    expect(alone.row.innerHTML).toBe(alone.tile.innerHTML);
    // `done && <Badge />` hands the slot false: no trailing zone, no stray gap.
    const off = renderBoth({ title: 'Bundle size', notes: ['34 kB'], trailing: false });
    expect(off.row.innerHTML).toBe(off.tile.innerHTML);
    expect(off.row.children).toHaveLength(1);
  });

  it('wraps it in the same surface: raised background, container radius, scale.sm inset', () => {
    const { tile, card } = renderBoth({ title: 'Figma sync' });
    // StatusTile paints its surface with these three classes.
    expect(tile.className).toContain('bg-[var(--semantic-color-surface-raised)]');
    expect(tile.className).toContain('rounded-lg');
    expect(tile.className).toContain('p-scale-sm');
    // Card paints the same three: bg-card resolves to the same raised token...
    expect(card.classList.contains('bg-card')).toBe(true);
    expect(read('tailwind.config.tokens.cjs')).toMatch(
      /card:\s*\{\s*DEFAULT:\s*'var\(--role-card\)'/,
    );
    expect(read('src/styles/tokens.generated.css').match(/--role-card:\s*([^;]+);/g)).toEqual([
      '--role-card: var(--semantic-color-surface-raised);',
      '--role-card: var(--semantic-color-surface-raised);',
    ]);
    // ...the same container radius, and padding="item" is scale.sm, as p-scale-sm is.
    expect(card.classList.contains('rounded-lg')).toBe(true);
    expect(card.style.padding).toBe('var(--semantic-space-scale-sm)');
    // ...and no border: `border-0` cancels Card's resting 1px transparent
    // border, so the box is 0px border + scale.sm padding, StatusTile's own.
    const widths = [...card.classList].filter((c) => /^border(-\d+)?$/.test(c));
    expect(widths).toEqual(['border-0']);
    expect(tile.className).not.toMatch(/\bborder\b/);
    expect(card.getAttribute('data-tone')).toBe('neutral');
    expect(card.getAttribute('data-bordered')).toBe('false');
  });

  it('pins the surface StatusTile renders today', () => {
    const { tile } = renderBoth({ title: 'Figma sync' });
    expect(tile.getAttribute('data-hds-component')).toBe('StatusTile');
    expect(tile.className).toBe(
      'flex items-start gap-3 rounded-lg bg-[var(--semantic-color-surface-raised)] p-scale-sm',
    );
  });

  it('pins the content DOM StatusTile renders today', () => {
    // A literal, not StatusTile's output: if both drift together this fails.
    const { row } = renderBoth({ title: 'Ship v2', notes: ['Owner: Ana'], trailing: 'Done' });
    expect(row.outerHTML).toBe(
      '<div class="flex items-start gap-3">' +
        '<div class="min-w-0 flex-1">' +
        '<p class="m-0 hds-type-ui text-foreground">Ship v2</p>' +
        '<p class="m-0 mt-1 hds-type-caption text-muted-foreground">Owner: Ana</p>' +
        '</div>' +
        '<div class="shrink-0">Done</div>' +
        '</div>',
    );
  });
});

describe('StatusTile deprecation (hds#622)', () => {
  it("every published recipe cancels Card's resting border, so the tile is pixel-equal", () => {
    const recipes = {
      'status-tile.tsx': read('src/app/components/status-tile.tsx').match(/@deprecated[^\n]*/)?.[0],
      'card.tsx': read('src/app/components/card.tsx').match(/<Card padding="item"[^>]*>/)?.[0],
      'MIGRATIONS.md': read('MIGRATIONS.md').match(
        /\/\/ After[\s\S]*?<Card padding="item"[^>]*>/,
      )?.[0],
      'upgrade note': JSON.parse(read('upgrade/sources/0.25.0/notes/statustile-into-card.json'))
        .steps[0].plain,
    };
    for (const [where, recipe] of Object.entries(recipes))
      expect(recipe, where).toMatch(/<Card padding=\\?"item\\?" className=\\?"border-0\\?">/);
  });

  const manifest = JSON.parse(read('public/hds-manifest.json'));

  it('is deprecated in the manifest, pointing at the Card composition', () => {
    const spec = manifest.componentSpecs.StatusTile;
    expect(spec.deprecated).toMatch(/Card\.Row/);
    expect(spec.useInstead).toBe('Card');
    expect(spec.removeIn).toBe('1.0.0');
  });

  it('lists the row parts as Card slots in the manifest', () => {
    for (const part of ['CardRow', 'CardRowTitle', 'CardRowNote'])
      expect(manifest.componentSpecs[part]?.filePath, part).toBe('src/app/components/card.tsx');
  });
});
