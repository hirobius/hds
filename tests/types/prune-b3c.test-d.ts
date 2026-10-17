/**
 * Type-tests for the hds#393 b3c survivor APIs: Button pressed, Badge (its dot went in hds#759),
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

// Badge `dot` (and its `size` and `label`) went in hds#759: no status dots.

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

// @ts-expect-error — Badge has no size: the dot that took one went in hds#759
const _badDotSize: BadgeProps['size'] = 'sm';

// @ts-expect-error — the shapes are linear | circular
const _badVariant: ProgressProps['variant'] = 'radial';

// @ts-expect-error — Progress tone is the fixed feedback vocabulary
const _badTone: ProgressProps['tone'] = 'inProgress';

// @ts-expect-error — onSelectedChange receives a boolean
const _badSelectedChange: CardProps['onSelectedChange'] = (selected: string) => void selected;

(void _pressed, _defaultPressed, _iconOnly);
(void _circular, _linearMax);
void _selectable;
(void _badPressedChange, _dotAsTone, _badDotSize);
(void _badVariant, _badTone, _badSelectedChange);
