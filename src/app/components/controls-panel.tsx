/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
﻿// @doc-exempt: sketch control shell helper used by tooling surfaces, not a consumer-facing HDS component.
/**
 * ControlsPanel - shared controls shell for system maintenance surfaces and sketch tooling.
 * @category Utilities
 */
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Stack } from './stack';
import { Surface } from './surface';

const supportingTextStyle = hds.typeStyles.caption;

interface ControlsPanelProps {
  children: ReactNode;
  title?: string;
  placement?: 'sidebar' | 'stacked';
  width?: number | string;
  outlined?: boolean;
}

interface ControlsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  showDivider?: boolean;
  tone?: 'primary' | 'secondary';
}

export function ControlsPanel({
  children,
  title,
  placement = 'sidebar',
  width = 360,
  outlined = true,
}: ControlsPanelProps) {
  const isSidebar = placement === 'sidebar';
  const panelMaxHeight = isSidebar ? 'calc(100vh - 120px)' : '100%';

  return (
    <aside
      data-placement={placement}
      style={{
        width: isSidebar ? width : '100%',
        maxHeight: panelMaxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarGutter: 'stable both-edges',
      }}
    >
      <Surface
        padding="component"
        style={{
          flexShrink: 0,
          border: outlined ? undefined : 'none',
        }}
      >
        <Stack gap="normal">
          {title && (
            <p
              className="text-secondary"
              style={hds.typeStyles.ui}
            >
              {title}
            </p>
          )}
          {children}
        </Stack>
      </Surface>
    </aside>
  );
}

export function ControlsSection({ title, description, children, tone = 'secondary' }: ControlsSectionProps) {
  const titleColor = tone === 'primary'
    ? 'var(--semantic-color-content-primary)'
    : 'var(--semantic-color-content-secondary)';

  return (
    <section>
      <Stack gap="gap">
        <Stack gap="gap">
          <p
            style={{ ...hds.typeStyles.ui, color: titleColor, margin: 0 }}
          >
            {title}
          </p>
          {description && (
            <p className="text-secondary" style={{ ...supportingTextStyle, margin: 0 }}>
              {description}
            </p>
          )}
        </Stack>
        <Stack gap="gap">
          {children}
        </Stack>
      </Stack>
    </section>
  );
}

