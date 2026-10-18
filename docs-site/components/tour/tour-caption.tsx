'use client';

import type { ComponentProps } from 'react';
import { Divider, InlineLink, Stack, Text } from '@hirobius/design-system';
import type { TourSection } from '../../lib/tour-sections';

/**
 * Wraps one tour section: a heading, the section's live content and the
 * "anatomy" caption naming every component in it, each linking to its docs page.
 * The caption is generated from TOUR_SECTIONS, so it cannot drift from the
 * placement the coverage test checks.
 */
export function TourBlock({
  section,
  links,
  children,
}: {
  section: TourSection;
  links: Record<string, string>;
  /** Typed off Stack's own children so the package's React types and the site's agree. */
  children: ComponentProps<typeof Stack>['children'];
}) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`}>
      <Stack gap="normal">
        <Stack gap="tight">
          <Text variant="title" as="h2" id={`${section.id}-title`}>
            {section.title}
          </Text>
          <Text variant="ui" tone="secondary">
            {section.lead}
          </Text>
        </Stack>
        {children}
        <div data-tour-caption={section.id}>
          <Stack gap="tight">
            <Text variant="caption" tone="secondary">
              Components in this section
            </Text>
            <Stack direction="row" gap="normal" wrap="wrap">
              {section.components.map((name) => (
                <Text key={name} variant="caption" as="span">
                  <InlineLink href={links[name]}>{name}</InlineLink>
                </Text>
              ))}
            </Stack>
          </Stack>
        </div>
        <Divider />
      </Stack>
    </section>
  );
}
