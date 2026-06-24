// passing: DocPageHeader present, unique DocSection titles, no violations
import React from 'react';
import { DocPageHeader } from '@/components/DocPageHeader';
import { DocSection } from '@/components/DocSection';

export default function PassingPage() {
  return (
    <>
      <DocPageHeader title="Example Foundation Page" />
      <DocSection title="Overview">
        <p>Introduction content.</p>
      </DocSection>
      <DocSection title="Usage">
        <p>Usage guidelines.</p>
      </DocSection>
    </>
  );
}
