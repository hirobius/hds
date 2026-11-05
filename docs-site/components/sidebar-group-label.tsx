'use client';

import type { Separator } from 'fumadocs-core/page-tree';
import { Text } from '@hirobius/design-system';

/**
 * A sidebar group label ("About HDS") in place of Fumadocs' separator, which rendered in
 * the nav-item colour and size and read as one more link (hds#860). HDS caption role, bold, in
 * the primary tone: the items are secondary at medium weight, so the label differs in colour and
 * weight, not only size (Adrian, 2026-11-05). Spacing in globals.css (.hds-docs-nav-label).
 * Desktop sidebar and mobile drawer alike.
 */
export function SidebarGroupLabel({ item }: { item: Separator }) {
  return (
    <Text as="p" variant="caption" tone="primary" weight="bold" className="hds-docs-nav-label">
      <>
        {item.icon}
        {item.name}
      </>
    </Text>
  );
}
