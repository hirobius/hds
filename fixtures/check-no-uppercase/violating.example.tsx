// violating: each line below makes ALL CAPS text (Adrian's rule, 2026-10-12).
import * as React from 'react';

export function ViolatingCaps({ name }: { name: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide">tailwind class</p>
      <p className="md:uppercase">variant-prefixed class</p>
      <p style={{ textTransform: 'uppercase' }}>inline transform</p>
      <p className="[text-transform:uppercase]">arbitrary property</p>
      <p style={{ fontVariant: 'small-caps' }}>small caps</p>
      <span>{name.toUpperCase()}</span>
      <span>{name.toUpperCase()}</span> {/* uppercase-ok: */}
    </div>
  );
}

export const textCase = { textCase: 'UPPER' };
export const css = `.eyebrow { text-transform: uppercase; }`;
