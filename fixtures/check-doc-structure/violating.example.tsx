// violating: duplicate DocSection title "Overview" — generates conflicting anchor ids
import React from 'react';
import { DocPageHeader } from '@/components/DocPageHeader';
import { DocSection } from '@/components/DocSection';

export default function ViolatingPage() {
  return (
    <>
      <DocPageHeader title="Example Foundation Page" />
      <DocSection title="Overview">
        <p>First overview section.</p>
      </DocSection>
      <DocSection title="Overview">
        <p>Second overview section — duplicate title breaks ToC anchor ids.</p>
      </DocSection>
    </>
  );
}
