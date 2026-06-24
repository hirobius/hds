// passing: uses current brand font (Satoshi) and current primary color (#1e2efd) — no stale values
import React from 'react';

const typography = {
  fontPrimary: 'Satoshi',
} as const;

const brand = {
  primaryColor: '#1e2efd',
} as const;

export function BrandTypography() {
  return (
    <span style={{ fontFamily: typography.fontPrimary, color: brand.primaryColor }}>Hello</span>
  );
}
