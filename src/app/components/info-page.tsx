/**
 * @tier template
 */
import { useEffect, useState } from 'react';
import hds from '../design-system/tokens';
import { DOC_LAYOUT_STICKY_OFFSET } from '../layouts/DocLayout';
import { AssetImg } from './asset-img';
import { InlineLink } from './inline-link';
import { Stack } from './stack';
import { Text } from './text';

const infoPageStyles = {
  pageWrapper: {
    paddingTop: DOC_LAYOUT_STICKY_OFFSET,
    width: '100%',
    maxWidth: 'var(--semantic-layout-width-content)',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxSizing: 'border-box' as const,
  } satisfies React.CSSProperties,
} as const;

const PROFILE_IMAGE_SRC = '/assets/adrian.webp';

/** @public */
export interface InfoPageProps {
  /** Theme flag retained for route-wrapper parity; tokenized CSS drives the actual theme swap. */
  isDark: boolean;
}

/**
 * InfoPage - branded profile surface used for the portfolio landing page.
 * @category Branding
 */
export function InfoPage({ isDark: _isDark }: InfoPageProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // motion-ok: intentional smart-animate transition for profile-image expand interaction.
  const transition =
    'opacity 400ms ease-in-out, transform 400ms ease-in-out, max-width 400ms ease-in-out, top 400ms ease-in-out, left 400ms ease-in-out';

  const fadeAwayStyle: React.CSSProperties = {
    opacity: expanded ? 0 : 1,
    pointerEvents: expanded ? 'none' : 'auto',
    transition,
  };

  const imageButtonStyle: React.CSSProperties = expanded
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(90vw, 800px)',
        height: 'auto',
        aspectRatio: '1 / 1',
        maxWidth: 'min(90vw, 800px)',
        cursor: 'zoom-out',
        zIndex: hds.zIndex.modal,
        transition,
      }
    : {
        position: 'relative',
        width: `calc(${hds.size[96]} * 2)`,
        height: `calc(${hds.size[96]} * 2)`,
        cursor: 'zoom-in',
        transition,
      };

  return (
    <div
      style={infoPageStyles.pageWrapper}
    >
      <Stack gap="normal">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            gap: hds.semantic.space.layout.gap,
            flexWrap: 'wrap',
          }}
        >
          <figure
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: hds.semantic.space.subgrid.gap,
              margin: 0,
              minWidth: 0,
              flex: '0 0 auto',
            }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse profile image' : 'Expand profile image'}
              onClick={() => setExpanded((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpanded((v) => !v);
                }
              }}
              style={imageButtonStyle}
            >
              <AssetImg
                src={PROFILE_IMAGE_SRC}
                alt="Adrian Milsap"
                expandable={false}
                loading="eager"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
                  borderRadius: hds.borderRadius[8],
                  filter: 'grayscale(100%)',
                }}
              />
            </div>

            <Text
              variant="caption"
              as="figcaption"
              className="text-secondary"
              style={{ textAlign: 'left', ...fadeAwayStyle }}
            >
              © 2026 Adrian Milsap
            </Text>
          </figure>

          <Stack
            gap="normal"
            style={{
              alignItems: 'flex-start',
              minWidth: 0,
              flex: '1 1 320px',
              textAlign: 'left',
              ...fadeAwayStyle,
            }}
          >
            <Stack gap="xs" style={{ alignItems: 'flex-start' }}>
              <Text
                variant="heading3"
                as="h1"
                style={{ color: 'var(--semantic-color-content-primary)', textAlign: 'left' }}
              >
                Adrian Milsap
              </Text>
              <Text variant="ui" as="p" className="text-secondary" style={{ textAlign: 'left' }}>
                Digital Designer &amp; Systems Architect
              </Text>
            </Stack>

            <Text
              variant="ui"
              as="p"
              className="text-secondary"
              style={{ maxWidth: '100%', textAlign: 'left' }}
            >
              Product Designer focused on design and visual systems at scale. I build modular
              libraries, frameworks and visual languages that drive efficiency and consistency
              across complex ecosystems. Currently building{' '}
              <InlineLink href="/case-studies/hirobius">Hirobius</InlineLink>, a code-first design
              system that powers this site.
            </Text>
          </Stack>
        </div>
      </Stack>
    </div>
  );
}
