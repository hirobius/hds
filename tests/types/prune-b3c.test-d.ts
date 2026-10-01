/**
 * Type-tests for the hds#393 b3c survivor APIs: Button pressed, Badge dot,
 * Progress circular, Card selectable. The prune (hds#389) folds ToggleButton,
 * StatusDot, CircularProgress and SelectableCard into these props.
 * Uses pure tsc --noEmit — no external test library needed.
 *   tsc --noEmit -p tests/types/tsconfig.json
 * `createElement` checks props the way JSX does (a .ts file has no JSX).
 */
import { createElement, type ComponentProps } from 'react';
import { Button } from '../../src/app/components/button';
import { Badge } from '../../src/app/components/badge';
import { Progress } from '../../src/app/components/progress';
import { Card } from '../../src/app/components/card';

const onPressedChange = (pressed: boolean) => void pressed;
const onSelectedChange = (selected: boolean) => void selected;

// ── Done items (hds#393) ──────────────────────────────────────────────────────

// <Button pressed onPressedChange={f}>
const _pressed = createElement(Button, { pressed: true, onPressedChange }, 'Bold');
// <Button defaultPressed> (uncontrolled toggle)
const _defaultPressed = createElement(Button, { defaultPressed: false }, 'Mute');
// <Button iconOnly label="Close" iconLeft={x}/>
const _iconOnly = createElement(Button, {
  iconOnly: true,
  label: 'Close',
  iconLeft: createElement('svg'),
});

// <Badge dot size="sm" label="Online">
const _dot = createElement(Badge, { dot: true, size: 'sm', label: 'Online' });
// A dot keeps tone as its color axis.
const _dotTone = createElement(Badge, { dot: true, tone: 'success' });

// <Progress variant="circular" tone="danger" max={12}>
const _circular = createElement(Progress, { variant: 'circular', tone: 'danger', max: 12 });
const _linearMax = createElement(Progress, { value: 6, max: 12, tone: 'success' });

// <Card selectable selected onSelectedChange={f}>
const _selectable = createElement(Card, { selectable: true, selected: true, onSelectedChange });

// ── Negative assertions (deliberate type errors) ──────────────────────────────

type ButtonProps = ComponentProps<typeof Button>;
type BadgeProps = ComponentProps<typeof Badge>;
type ProgressProps = ComponentProps<typeof Progress>;
type CardProps = ComponentProps<typeof Card>;

// @ts-expect-error — onPressedChange receives a boolean
const _badPressedChange: ButtonProps['onPressedChange'] = (pressed: string) => void pressed;

// @ts-expect-error — a dot is not a Tone option; tone stays the color axis
const _dotAsTone: BadgeProps['tone'] = 'dot';

// @ts-expect-error — the dot sizes are sm | md | lg
const _badDotSize: BadgeProps['size'] = 'xl';

// @ts-expect-error — the shapes are linear | circular
const _badVariant: ProgressProps['variant'] = 'radial';

// @ts-expect-error — Progress tone is the fixed feedback vocabulary
const _badTone: ProgressProps['tone'] = 'inProgress';

// @ts-expect-error — onSelectedChange receives a boolean
const _badSelectedChange: CardProps['onSelectedChange'] = (selected: string) => void selected;

(void _pressed, _defaultPressed, _iconOnly);
(void _dot, _dotTone);
(void _circular, _linearMax);
void _selectable;
(void _badPressedChange, _dotAsTone, _badDotSize);
(void _badVariant, _badTone, _badSelectedChange);
