// motion-ok: sketch lab controls — sketches/CLAUDE.md grants rule bypass for the experimental zone
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: internal sketchbook control set used by private lab routes
// ref-ok: internal sketchbook controls are not consumer-facing form primitives
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import hds from '../design-system/tokens';
import { Button } from './button';
import { Grid } from './grid';
import { Stack } from './stack';
import { Surface } from './surface';

const sketchControlsStyles = {
  textareaBase: {
    width: '100%',
    minHeight: hds.size[96],
    resize: 'vertical' as const,
    padding: hds.semantic.space.component.padding,
    background: 'transparent',
    color: 'var(--semantic-color-content-primary)',
    border: 'none',
    outline: 'none', // audit-ok: hds-focus applied via textarea className
    fontFamily: hds.monoFamily,
    fontSize: hds.typeStyles.technical.fontSize,
    lineHeight: hds.typeStyles.ui.lineHeight,
  } satisfies React.CSSProperties,
} as const;

type SketchTone = {
  text: string;
  textMuted: string;
  surface: string;
  surfaceStrong: string;
  border: string;
};

const defaultTone: SketchTone = {
  text: 'var(--semantic-color-content-primary)',
  textMuted: 'var(--semantic-color-content-secondary)',
  surface: 'var(--semantic-color-surface-page)',
  surfaceStrong: 'var(--semantic-color-surface-raised)',
  border: 'var(--semantic-color-border-default)',
};

type SketchRangeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  label: ReactNode;
  tone?: Partial<SketchTone>;
  onValueChange: (value: number) => void;
};

export function SketchRange({
  label,
  tone,
  onValueChange,
  style,
  ...props
}: SketchRangeProps) {
  const resolvedTone = { ...defaultTone, ...tone };

  return (
    <Grid columns={1} gap="tight" style={{ width: '100%' }}>
      <Grid.Item>
        <Stack gap="gap" style={{ width: '100%' }}>
          <span
            style={{
              ...hds.typeStyles.ui,
              color: resolvedTone.textMuted,
            }}
          >
            {label}
          </span>
          <input
            {...props}
            type="range"
            onChange={(event) => onValueChange(Number(event.target.value))}
            style={{ width: '100%', ...style }}
          />
        </Stack>
      </Grid.Item>
    </Grid>
  );
}

type SketchCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  label: ReactNode;
  tone?: Partial<SketchTone>;
  onCheckedChange: (checked: boolean) => void;
};

export function SketchCheckbox({
  label,
  tone,
  onCheckedChange,
  style,
  ...props
}: SketchCheckboxProps) {
  const resolvedTone = { ...defaultTone, ...tone };

  return (
    <label
      style={{
        cursor: 'pointer',
        display: 'block',
      }}
    >
      <Stack
        direction="row"
        gap="gap"
        align="center"
        style={{
          ...hds.typeStyles.ui,
          color: resolvedTone.textMuted,
        }}
      >
        <input
          {...props}
          type="checkbox"
          onChange={(event) => onCheckedChange(event.target.checked)}
          style={style}
        />
        <span>{label}</span>
      </Stack>
    </label>
  );
}

type SketchButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function SketchButton({
  variant = 'secondary',
  style,
  children,
  ...props
}: SketchButtonProps) {
  return (
    <Button
      {...props}
      type={props.type ?? 'button'}
      variant={variant}
      size="sm"
      className={['hds-focus', props.className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </Button>
  );
}

type SketchTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function SketchTextarea({ style, ...props }: SketchTextareaProps) {
  return (
    <Surface
      padding="none"
      style={{
        background: 'var(--semantic-color-surface-page)',
        borderColor: 'var(--semantic-color-border-default)',
        width: '100%',
      }}
    >
      <Stack gap="xs" style={{ width: '100%' }}>
        <textarea
          {...props}
          className={['hds-focus', props.className].filter(Boolean).join(' ')}
          style={{ ...sketchControlsStyles.textareaBase, ...style }}
        />
      </Stack>
    </Surface>
  );
}

type SketchPanelToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  panelOpen: boolean;
  openIcon: ReactNode;
  closedIcon: ReactNode;
};

export function SketchPanelToggle({
  panelOpen,
  openIcon,
  closedIcon,
  style,
  ...props
}: SketchPanelToggleProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={['hds-focus', props.className].filter(Boolean).join(' ')}
      style={style}
    >
      <Stack
        as="span"
        direction="row"
        gap="xs"
        align="center"
        justify="center"
        style={{
          minWidth: hds.size[40],
          minHeight: hds.size[40],
        }}
      >
        {panelOpen ? openIcon : closedIcon}
      </Stack>
    </button>
  );
}
