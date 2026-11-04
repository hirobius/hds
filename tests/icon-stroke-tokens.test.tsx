// Pins the icon stroke-width tokens to Icon's weight map, plus the 6px space
// and 512px width values Dialog uses (Figma token gaps).
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Star } from 'lucide-react';
import tokensJson from '../hirobius.tokens.json';
import { Icon } from '../src/app/components/icon';

type Tok = { $value: unknown };
const t = tokensJson as unknown as {
  primitive: {
    strokeWidth: Record<string, Tok>;
    space: Record<string, Tok>;
    size: { width: Record<string, Tok> };
  };
  semantic: { borderWidth: { icon: Record<string, Tok> } };
};

describe('icon stroke-width tokens', () => {
  const expected = { thin: 1, light: 1.5, regular: 2, bold: 2.5 } as const;

  it.each(Object.entries(expected))('%s resolves to %s', (weight, value) => {
    const ref = t.semantic.borderWidth.icon[weight].$value as string;
    const key = /^\{primitive\.strokeWidth\.(\w+)\}$/.exec(ref)?.[1];
    expect(key).toBeDefined();
    expect(t.primitive.strokeWidth[key!].$value).toBe(value);
  });

  it.each(Object.entries(expected))('Icon weight=%s renders stroke-width %s', (weight, value) => {
    const { container } = render(
      <Icon icon={Star} weight={weight as keyof typeof expected} aria-hidden />,
    );
    expect(container.querySelector('svg')?.getAttribute('stroke-width')).toBe(String(value));
  });
});

describe('Dialog gap values', () => {
  it('pins primitive.space.px6 at 6px and primitive.size.width.512 at 512px', () => {
    expect(t.primitive.space.px6.$value).toEqual({ value: 6, unit: 'px' });
    expect(t.primitive.size.width['512'].$value).toEqual({ value: 512, unit: 'px' });
  });
});
