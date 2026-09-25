'use client';

import * as React from 'react';
import { Button } from '@hirobius/design-system';

const variants = ['primary', 'secondary', 'tertiary'] as const;
const sizes = ['sm', 'md', 'lg'] as const;
const tones = ['neutral', 'danger', 'success', 'warning', 'info'] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--semantic-color-content-secondary)',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

export function ButtonVariants() {
  return (
    <Row label="Variant">
      {variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant[0].toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </Row>
  );
}

export function ButtonSizes() {
  return (
    <Row label="Size">
      {sizes.map((size) => (
        <Button key={size} size={size} variant="primary">
          Button {size}
        </Button>
      ))}
    </Row>
  );
}

export function ButtonTones() {
  return (
    <Row label="Tone">
      {tones.map((tone) => (
        <Button key={tone} tone={tone} variant="secondary">
          {tone[0].toUpperCase() + tone.slice(1)}
        </Button>
      ))}
    </Row>
  );
}

export function ButtonStates() {
  return (
    <Row label="State">
      <Button variant="primary">Default</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
      <Button variant="primary" loading>
        Loading
      </Button>
    </Row>
  );
}

export function ButtonShowcase() {
  return (
    <div
      style={{
        border: '1px solid var(--semantic-color-border-default)',
        borderRadius: 12,
        padding: 24,
        background: 'var(--semantic-color-surface-raised)',
      }}
    >
      <ButtonVariants />
      <ButtonSizes />
      <ButtonTones />
      <ButtonStates />
    </div>
  );
}
