/**
 * CaseStudyLayout — macro-layout skeleton for portfolio case study pages.
 * @category Layout
 *
 * Invisible structure only. No Surface, no decorative chrome.
 * Slot anatomy:
 *   heroSlot    → full-width (maxWidth="max")  — hero image + headline
 *   introSlot   → prose-width (maxWidth="content") — narrative, Brief/Problem/Solution
 *   metricsSlot → full-width (maxWidth="max")  — KPI or summary cards (optional)
 *   contentSlot → full-width (maxWidth="max")  — chapters, galleries, learnings
 */

import type { ReactNode } from 'react';
import { Container } from '../components/container';
import { ErrorBoundary } from '../components/error-boundary';
import { Stack } from '../components/stack';

interface CaseStudyLayoutProps {
  heroSlot: ReactNode;
  introSlot: ReactNode;
  metricsSlot?: ReactNode;
  contentSlot: ReactNode;
}

/** @public */
export function CaseStudyLayout({ heroSlot, introSlot, metricsSlot, contentSlot }: CaseStudyLayoutProps) {
  return (
    <main>
      <Stack gap="spacious">
        <Container maxWidth="max">
          <ErrorBoundary slotLabel="Case study hero" minHeight="320px">
            {heroSlot}
          </ErrorBoundary>
        </Container>
        <Container maxWidth="content">
          <ErrorBoundary slotLabel="Case study intro" minHeight="240px">
            {introSlot}
          </ErrorBoundary>
        </Container>
        {metricsSlot != null && (
          <Container maxWidth="max">
            <ErrorBoundary slotLabel="Case study metrics" minHeight="220px">
              {metricsSlot}
            </ErrorBoundary>
          </Container>
        )}
        <Container maxWidth="max">
          <ErrorBoundary slotLabel="Case study content" minHeight="320px">
            {contentSlot}
          </ErrorBoundary>
        </Container>
      </Stack>
    </main>
  );
}
