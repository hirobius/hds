'use client';

import type { Separator } from 'fumadocs-core/page-tree';
import { Text } from '@hirobius/design-system';

/**
 * A sidebar group label ("Explore") in place of Fumadocs' separator, which rendered in
 * the nav-item colour and size and read as one more link (hds#860). HDS caption role, secondary
 * tone; spacing in globals.css (.hds-docs-nav-label). Desktop sidebar and mobile drawer alike.
 */
export function SidebarGroupLabel({ item }: { item: Separator }) {
  return (
    <Text as="p" variant="caption" tone="secondary" className="hds-docs-nav-label">
      <>
        {item.icon}
        {item.name}
      </>
    </Text>
  );
}
