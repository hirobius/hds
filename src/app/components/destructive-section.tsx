/**
 * DestructiveSection - the one place a screen puts an irreversible action.
 * @category Actions
 * @tier pattern
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components-Copy?node-id=2076-3
 */
// motion-ok: composition only. The one control is a danger Button, which owns
// its hover/press transition (transition-[colors,filter]); the AlertDialog it
// opens owns open/close. The section has no hover, press or open state of its
// own, so there is nothing here to animate.

import * as React from 'react';
import { AlertDialog } from './alert-dialog';
import { Button } from './button';
import { Card } from './card';
import { Stack } from './stack';
import { Text } from './text';

/** @public */
export interface DestructiveSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** What the zone does, as a short action ("Archive client"). Also the dialog title. */
  title: React.ReactNode;
  /** What happens and what is kept. One or two plain sentences. */
  description: React.ReactNode;
  /** Label of the danger button that opens the confirmation. Defaults to `confirmLabel`. */
  actionLabel?: React.ReactNode;
  /** Label of the confirm button inside the dialog. Name the action ("Archive client"). */
  confirmLabel: string;
  /** Body of the confirmation dialog: the consequence, stated plainly. */
  confirmBody: React.ReactNode;
  /** Called once, only when the dialog's confirm button is pressed. */
  onConfirm: () => void;
  /** Label of the dialog's cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Heading element for the title. Changes the DOM element only. Defaults to 2. */
  level?: 2 | 3 | 4 | 5 | 6;
}

/**
 * Titled danger zone: a title, an explanation, and one danger `Button` that
 * opens an `AlertDialog`. Pressing the button never runs the action; only the
 * dialog's confirm does. Place it last on the screen, below the form.
 * @screenPattern
 */
export const DestructiveSection = /* @__PURE__ */ React.forwardRef<
  HTMLElement,
  DestructiveSectionProps
>(function DestructiveSection(
  {
    title,
    description,
    actionLabel,
    confirmLabel,
    confirmBody,
    onConfirm,
    cancelLabel = 'Cancel',
    level = 2,
    ...props
  },
  ref,
) {
  const headingId = React.useId();
  return (
    <section
      ref={ref}
      data-hds-component="DestructiveSection"
      aria-labelledby={headingId}
      {...props}
    >
      <Card tone="danger">
        <Stack direction="row" wrap="wrap" gap="normal" align="center" justify="space-between">
          {/* The shared heading pair takes string-only text and no heading id; this section needs a ReactNode title and an id for aria-labelledby. */}
          <div data-slot="copy" className="min-w-0 grow basis-64">
            <Text id={headingId} as={`h${level}`} variant="heading3">
              {title}
            </Text>
            <Text as="p" variant="caption" className="text-muted-foreground">
              {description}
            </Text>
          </div>
          <div data-slot="action" className="shrink-0">
            <AlertDialog>
              <AlertDialog.Trigger asChild>
                <Button variant="secondary" tone="danger">
                  {actionLabel ?? confirmLabel}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Header>
                  <AlertDialog.Title>{title}</AlertDialog.Title>
                  <AlertDialog.Description>{confirmBody}</AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <AlertDialog.Cancel asChild>
                    <Button variant="secondary">{cancelLabel}</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button variant="primary" tone="danger" onClick={onConfirm}>
                      {confirmLabel}
                    </Button>
                  </AlertDialog.Action>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog>
          </div>
        </Stack>
      </Card>
    </section>
  );
});
