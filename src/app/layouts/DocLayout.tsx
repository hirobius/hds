import { type ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Container } from '../components/container';
import { ErrorBoundary } from '../components/error-boundary';
import { Stack } from '../components/stack';
import { useEmbeddedDocLayoutBottomSlot } from './EmbeddedDocLayoutContext';

export const DOC_LAYOUT_STICKY_OFFSET = hds.space.px40;
export const DOC_LAYOUT_STICKY_VIEWPORT_HEIGHT = `calc(100dvh - ${DOC_LAYOUT_STICKY_OFFSET})`;

const DOC_LAYOUT_CONTENT_WIDTHS = {
  content: 'var(--semantic-layout-width-content)',
  max: 'var(--semantic-layout-width-max)',
} as const;

type DocLayoutMaxWidth = keyof typeof DOC_LAYOUT_CONTENT_WIDTHS;

const docLayoutStyles = {
  contentWrapperBase: {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 0,
    paddingTop: DOC_LAYOUT_STICKY_OFFSET,
    boxSizing: 'border-box' as const,
  } satisfies React.CSSProperties,
} as const;
export type DocLayoutContentMaxWidth = DocLayoutMaxWidth;

interface DocLayoutProps {
  contentSlot: ReactNode;
  bottomSlot?: ReactNode;
  contentMaxWidth?: DocLayoutContentMaxWidth;
}

export function DocLayout({
  contentSlot,
  bottomSlot,
  contentMaxWidth = 'content',
}: DocLayoutProps) {
  const embeddedBottomSlot = useEmbeddedDocLayoutBottomSlot();
  const resolvedBottomSlot = bottomSlot ?? embeddedBottomSlot;

  return (
    <main style={{ width: '100%', marginTop: 0, paddingTop: 0 }}>
      <div
        style={{ ...docLayoutStyles.contentWrapperBase, maxWidth: DOC_LAYOUT_CONTENT_WIDTHS[contentMaxWidth] }}
      >
        <section
          style={{
            minWidth: 0,
            width: '100%',
            paddingTop: hds.semantic.space.section.inset,
            paddingBottom: 0,
          }}
        >
          <Container maxWidth={contentMaxWidth} style={{ width: '100%' }}>
            <Stack gap="px128" style={{ minWidth: 0, width: '100%' }}>
              <ErrorBoundary slotLabel="Documentation content" minHeight="320px">
                {contentSlot}
              </ErrorBoundary>
              {resolvedBottomSlot ?? null}
            </Stack>
          </Container>
        </section>
      </div>
    </main>
  );
}
