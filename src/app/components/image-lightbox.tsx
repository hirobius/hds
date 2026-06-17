/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: portfolio lightbox utility used by case-study media, not a consumer-facing HDS component
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayInset = hds.semantic.space.layout.gap;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          data-lightbox-container=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: hds.zIndex.modal,
            background: 'color-mix(in srgb, var(--semantic-color-surface-page) 74%, transparent)',
            backdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
            WebkitBackdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
          }}
        >
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
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={alt ?? 'Expanded image'}
              tabIndex={-1}
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.985 }}
              transition={{ duration: hds.motion.spatial.duration, ease: hds.motion.spatial.easing }}
              onClick={onClose}
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
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
