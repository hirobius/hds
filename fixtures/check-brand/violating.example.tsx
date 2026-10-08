// violating: asserts #1e2efd is the brand accent (stale — the accent was
// repointed off blue) and declares Inter as the primary font (stale —
// superseded by Satoshi). Both must be flagged by check-brand.
import React from 'react';

// The brand accent is #1e2efd.  ← stale hex claim, must fire
export function BrandMark() {
  return <span style={{ fontFamily: 'Inter' }}>Hirobius</span>;
}
