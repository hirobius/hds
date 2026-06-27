/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 *
 * Full-bleed image viewer built on Radix Dialog (raw primitives, not the card
 * `Dialog` wrapper — a lightbox is a transparent full-screen surface, not a
 * centered card). Radix owns the modal a11y contract the hand-rolled version
 * was missing: focus trap, focus restore on close, Escape, and scroll-lock.
 *
 * Motion is retained via `forceMount` + AnimatePresence + `asChild`: the
 * backdrop fades and the image panel scales/translates in, exactly as before.
 */
// @doc-exempt: portfolio lightbox utility used by case-study media, not a consumer-facing HDS component
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import hds from '../design-system/tokens';
import { AssetImg } from './asset-img';
import { Button } from './button';
import { Grid } from './grid';
import { Icon } from './icon';
import { InlineLink } from './inline-link';
import { Stack } from './stack';
import { Surface } from './surface';

interface ImageLightboxProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  caption?: string;
  captionHref?: string;
  captionLabel?: string;
}

export function ImageLightbox({
  open,
  onClose,
  src,
  alt,
  naturalWidth,
  naturalHeight,
  caption,
  captionHref,
  captionLabel,
}: ImageLightboxProps) {
  const overlayInset = hds.semantic.space.layout.gap;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: hds.motion.productive.duration,
                  ease: hds.motion.productive.easing,
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: hds.zIndex.modal,
                  background:
                    'color-mix(in srgb, var(--semantic-color-surface-page) 74%, transparent)',
                  backdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
                  WebkitBackdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
                }}
              />
            </Dialog.Overlay>

            {/* Radix injects role="dialog", focus trap, focus restore, Escape, and
                scroll-lock onto this element (modality via focus-scope + sibling
                aria-hidden, not an aria-modal attr). aria-describedby is explicitly
                cleared (no description surface). */}
            <Dialog.Content
              asChild
              forceMount
              aria-label={alt ?? 'Expanded image'}
              aria-describedby={undefined}
              onClick={onClose}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: hds.motion.productive.duration,
                  ease: hds.motion.productive.easing,
                }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: hds.zIndex.modal,
                  // audit-ok: Radix Dialog.Content container (tabIndex=-1, auto-focused on open). The dialog surface intentionally shows no focus ring; the visible focus affordance is the Close button (Button → hds-focus).
                  outline: 'none',
                }}
              >
                <Dialog.Title className="sr-only">{alt ?? 'Expanded image'}</Dialog.Title>

                <Stack
                  gap="xs"
                  style={{
                    position: 'fixed',
                    top: overlayInset,
                    right: overlayInset,
                    zIndex: hds.zIndex.modal,
                  }}
                >
                  <Button
                    iconOnly
                    size="lg"
                    variant="secondary"
                    aria-label="Close image"
                    onClick={onClose}
                    iconLeft={<Icon icon={X} size="medium" />}
                  />
                </Stack>

                <Grid
                  columns={1}
                  gap="normal"
                  style={{
                    minHeight: '100%',
                    padding: `calc(${overlayInset} * 2) ${overlayInset}`,
                    justifyItems: 'center',
                    alignItems: 'center',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.985 }}
                    transition={{
                      duration: hds.motion.spatial.duration,
                      ease: hds.motion.spatial.easing,
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <Stack
                      gap="gap"
                      align="center"
                      style={{
                        width: 'fit-content',
                        maxWidth: '100%',
                        cursor: 'zoom-out',
                      }}
                    >
                      <Surface padding="component">
                        <AssetImg
                          src={src}
                          alt={alt}
                          naturalWidth={naturalWidth}
                          naturalHeight={naturalHeight}
                          context="lightbox"
                          loading="lazy"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '82vh',
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </Surface>

                      {caption ? (
                        <Surface
                          padding="item"
                          style={{
                            width: 'fit-content',
                            background: 'var(--semantic-color-surface-page)',
                          }}
                        >
                          <Stack
                            as="p"
                            direction="row"
                            gap="xs"
                            align="center"
                            wrap="wrap"
                            className="text-secondary"
                            style={{
                              ...hds.typeStyles.caption,
                              margin: 0,
                            }}
                          >
                            <span>{caption}</span>
                            {captionHref ? (
                              <InlineLink href={captionHref}>
                                {captionLabel ?? captionHref}
                              </InlineLink>
                            ) : null}
                          </Stack>
                        </Surface>
                      ) : null}
                    </Stack>
                  </motion.div>
                </Grid>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
