/**
 * Dock — a bottom action bar for phones that steps aside while the user types.
 * @category Layout
 * @tier pattern
 * @ai-intent Holds a screen's main actions (Apply, Save, Next) fixed to the
 * bottom edge on phones, above the home indicator, and out of the way while
 * a text field has focus so the on-screen keyboard has the room. From `sm`
 * (640px) up it renders inline, where the content puts it.
 * @ai-rules Put one row of Buttons in it (a Stack direction="row", or a
 * FormActions). One Dock per screen. Leave room under the content on phones:
 * the Dock covers the page bottom. Use Pin to keep something stuck at the top
 * of a scrolling region; Dock is for the bottom action bar only.
 * @a11y component required a11y:dock.region Dock is a named region (`aria-label`, default "Actions"), so screen-reader users can jump to it.
 * @a11y component required a11y:dock.hide-on-input While a text field (input, textarea, contenteditable) has focus or the on-screen keyboard is open, the Dock slides away; it shows again as soon as focus leaves the field, so Tab from the field reaches a visible action.
 * @a11y component required a11y:dock.reduced-motion Under prefers-reduced-motion the Dock only fades; it does not slide.
 * @a11y consumer required Give the content under the Dock bottom padding on phones, so the Dock never hides its last lines.
 */
import * as React from 'react';
import { cn } from '../../lib/utils';
import { useVisualViewport } from './useVisualViewport';

export interface DockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The actions, usually one row of Buttons. */
  children: React.ReactNode;
  /**
   * Slide the Dock away while a text field has focus or the on-screen keyboard
   * is open. Defaults to `true`.
   */
  hideOnInput?: boolean;
  /** The region's accessible name. Defaults to "Actions". */
  'aria-label'?: string;
}

/** Inputs that take typed text (and so open the on-screen keyboard). */
const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** True when `el` takes typed text: a text-like input, a textarea or a contenteditable. */
function isTextField(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return !NON_TEXT_INPUTS.has(el.type) && !el.readOnly && !el.disabled;
  }
  return false;
}

/** Tracks whether a text field in the document has focus. */
function useTextFieldFocus(enabled: boolean): boolean {
  const [focused, setFocused] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const sync = () => setFocused(isTextField(document.activeElement));
    // focusout fires before focus lands on the next element: read it on the next task.
    const onFocusOut = () => window.setTimeout(sync, 0);
    sync();
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [enabled]);
  return enabled && focused;
}

/** @public */
export const Dock = /* @__PURE__ */ React.forwardRef<HTMLDivElement, DockProps>(function Dock(
  { children, hideOnInput = true, className, 'aria-label': ariaLabel = 'Actions', ...props },
  ref,
) {
  const textFocused = useTextFieldFocus(hideOnInput);
  const { keyboardInset } = useVisualViewport();
  const hidden = hideOnInput && (textFocused || keyboardInset > 0);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      data-hds-component="Dock"
      data-hidden={hidden ? '' : undefined}
      className={cn('hds-dock', className)}
      {...props}
    >
      {children}
    </div>
  );
});
