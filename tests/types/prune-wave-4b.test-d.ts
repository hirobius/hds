/**
 * Type-tests for the hds#394 wave 4b folds: each folded component's documented
 * props, written against the survivor that replaces it (MIGRATIONS.md,
 * "0.20.0 removals"). If a survivor cannot take one of these props, the
 * folded component is not removed.
 * Uses pure tsc --noEmit — no external test library needed.
 *   tsc --noEmit -p tests/types/tsconfig.json
 * `createElement` checks props the way JSX does (a .ts file has no JSX).
 */
import { createElement, createRef, type ComponentProps } from 'react';
import { Settings } from 'lucide-react';
import hds from '../../src/app/design-system/tokens';
import { Badge } from '../../src/app/components/badge';
import { Box } from '../../src/app/components/box';
import { Button } from '../../src/app/components/button';
import { Card } from '../../src/app/components/card';
import { Combobox, type ComboboxOption } from '../../src/app/components/combobox';
import { Container } from '../../src/app/components/container';
import { Icon } from '../../src/app/components/icon';
import { Input } from '../../src/app/components/input';
import { Progress } from '../../src/app/components/progress';
import { Stack } from '../../src/app/components/stack';

const md = 'var(--semantic-space-scale-md)';
const options: ComboboxOption[] = [{ value: 'a', label: 'Apple' }];
const onChange = (next: string[]) => void next;
const onPressedChange = (pressed: boolean) => void pressed;
const onSelectedChange = (selected: boolean) => void selected;

// IconButton icon size label variant disabled -> Button iconOnly + Icon
const _iconButton = createElement(Button, {
  iconOnly: true,
  label: 'Settings',
  size: 'sm',
  variant: 'tertiary',
  disabled: false,
  iconLeft: createElement(Icon, { icon: Settings, size: 'small', color: 'currentColor' }),
});

// ToggleButton pressed defaultPressed onPressedChange variant size -> Button
const _toggle = createElement(
  Button,
  { pressed: true, onPressedChange, variant: 'tertiary', size: 'sm', 'aria-label': 'Bold' },
  'B',
);
const _toggleUncontrolled = createElement(Button, { defaultPressed: true }, 'Mute');

// InputGroup leading trailing size disabled -> Input prefix suffix
const _inputGroup = createElement(Input, {
  prefix: '$',
  suffix: 'USD',
  size: 'lg',
  disabled: true,
  placeholder: '0.00',
  'aria-label': 'Amount',
});

// TimeInput size value onChange min max step -> Input type="time"
const _time = createElement(Input, {
  type: 'time',
  size: 'sm',
  value: '09:30',
  onChange: () => {},
  min: '08:00',
  max: '18:00',
  step: 900,
  'aria-label': 'Start',
});

// CircularProgress value max size tone label (indeterminate = no value) -> Progress
const _ring = createElement(Progress, {
  variant: 'circular',
  value: 40,
  max: 100,
  size: 'lg',
  tone: 'danger',
  label: 'Uploading',
});
const _ringIndeterminate = createElement(Progress, { variant: 'circular', label: 'Loading' });

// SelectableCard selected onSelectedChange (disabled = aria-disabled) -> Card selectable
const _card = createElement(Card, { selectable: true, selected: true, onSelectedChange }, 'Plan A');
const _cardDisabled = createElement(
  Card,
  { selectable: true, selected: false, 'aria-disabled': true },
  'Plan B',
);

// MultiSelector options value onChange placeholder disabled className -> Combobox multiple
const _multi = createElement(Combobox, {
  multiple: true,
  options,
  value: [],
  onChange,
  placeholder: 'Select…',
  disabled: false,
  className: 'w-64',
});

// Cluster gap align justify as ref -> Stack direction="row" wrap="wrap"
const _cluster = createElement(Stack, {
  direction: 'row',
  wrap: 'wrap',
  gap: 'tight',
  align: 'center',
  justify: 'space-between',
  as: 'ul',
  ref: createRef<HTMLDivElement>(),
  children: 'x',
});

// Center maxWidth gutter -> Container maxWidth + Box (gutter, as, ref)
const _center = createElement(Container, {
  maxWidth: 'content',
  children: createElement(Box, { style: { paddingInline: md } }, 'x'),
});
const _centerAs = createElement(
  Box,
  { as: 'main', ref: createRef<HTMLDivElement>(), style: { marginInline: 'auto' } },
  'x',
);

// Cover minHeight gap header footer, Frame ratio radius, Bleed amount axis,
// AspectRatio ratio -> Box with style
const _cover = createElement(Box, {
  style: { display: 'flex', flexDirection: 'column', minHeight: '100svh', gap: md },
});
const _frame = createElement(Box, {
  style: { aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md },
});
const _bleed = createElement(Box, { style: { marginInline: `calc(-1 * ${md})` } });
const _aspect = createElement(Box, { style: { aspectRatio: '1' } });

// StatusDot tone size label -> Badge dot
const _dot = createElement(Badge, { dot: true, tone: 'success', size: 'sm', label: 'Online' });

// ── Negative assertions (deliberate type errors) ──────────────────────────────

type BadgeProps = ComponentProps<typeof Badge>;

// Badge is className-only (check-no-style-prop), so the `style` ops passes to
// StatusDot (src/app/pages/ops/audit/FleetAuditPage.tsx) has no Badge mapping.
// @ts-expect-error — BadgeProps has no style
const _dotStyle: BadgeProps['style'] = { marginTop: 8 };

const _multiBadChange = createElement(Combobox, {
  multiple: true,
  options,
  value: [],
  // @ts-expect-error — Combobox multiple reports an array, not one value
  onChange: (next: string) => void next,
});

(void _iconButton, _toggle, _toggleUncontrolled, _inputGroup, _time);
(void _ring, _ringIndeterminate, _card, _cardDisabled, _multi);
(void _cluster, _center, _centerAs, _cover, _frame, _bleed, _aspect, _dot);
(void _dotStyle, _multiBadChange);
