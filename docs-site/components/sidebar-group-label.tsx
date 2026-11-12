'use client';

import type { Separator } from 'fumadocs-core/page-tree';
import { Text } from '@hirobius/design-system';

/**
 * A sidebar group label ("About HDS") in place of Fumadocs' separator, which rendered in
 * the nav-item colour and size and read as one more link (hds#860). HDS bodyStrong role (body,
 * weight bold: a bold caption is not on the ramp, hds#1496) in the primary tone: the items are
 * secondary at regular weight, so the label differs in colour and weight, not only size (Adrian,
 * 2026-11-05). Spacing in globals.css (.hds-docs-nav-label).
 * Desktop sidebar and mobile drawer alike.
 */
export function SidebarGroupLabel({ item }: { item: Separator }) {
  return (
    <Text as="p" variant="body" tone="primary" weight="bold" className="hds-docs-nav-label">
      <>
        {item.icon}
        {item.name}
      </>
    </Text>
  );
}
