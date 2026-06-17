/**
 * IconButton ” icon-only action trigger built on the shared Button primitive.
 * @category Actions
 * @tier pattern
 */
import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, ButtonProps } from './button';
import { Icon, IconSize } from './icon';

// Maps button size tokens to the icon sizing ramp (sm=32px→small=16px, md=40px→medium=20px)
type IconButtonSize = 'sm' | 'md' | 'lg';

const SIZE_TO_ICON: Record<IconButtonSize, IconSize> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'children' | 'size'> {
  /** Lucide icon rendered inside the button. */
  icon: LucideIcon;
  /** Size token for the button itself. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the inner icon size; defaults to the matching button ramp size. */
  iconSize?: IconSize;
  /** Override the inner icon color. */
  iconColor?: string;
  /** Accessible label for the icon button. */
  label?: string;
  /** Accessible label fallback for backward compatibility. */
  'aria-label'?: string;
}

/**
 * IconButton — compact icon-only action surface.
 */
/** @public */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    variant = 'secondary',
    size = 'md',
    iconSize,
    iconColor,
    label,
    disabled,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const resolvedIconSize: IconSize = iconSize ?? SIZE_TO_ICON[size];
  // Let Button's disabled:opacity-50 mute the icon; only apply an explicit
  // color when iconColor is provided. Using currentColor delegates to the
  // button's text color, which is already managed by component.button.* tokens.
  const resolvedIconColor = iconColor ?? 'currentColor';
  const accessibleLabel = label ?? ariaLabel ?? 'Icon button';

  return (
    <Button
      ref={ref}
      iconOnly
      size={size}
      variant={variant}
      disabled={disabled}
      aria-label={accessibleLabel}
      iconLeft={<Icon icon={icon} size={resolvedIconSize} color={resolvedIconColor} />}
      {...props}
    />
  );
});
