// passing: brand values come from tokens (CSS vars), with no hardcoded hex and
// no claim that any specific colour is the brand — so this file cannot drift
// from hirobius.tokens.json whatever semantic.accent.rest resolves to.
import React from 'react';

export function BrandMark() {
  return (
    <span
      style={{
        fontFamily: 'var(--primitive-typography-family-primary)',
        color: 'var(--semantic-accent-rest)',
      }}
    >
      Hirobius
    </span>
  );
}
