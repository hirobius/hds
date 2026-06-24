// violating: declares Inter as the primary font — superseded by Satoshi
import React from 'react';

const typography = {
  fontPrimary: 'Inter',
} as const;

export function BrandTypography() {
  return <span style={{ fontFamily: typography.fontPrimary }}>Hello</span>;
}
