/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Container radius in the generated DESIGN.md (hds#338). Containers follow the
 * tenant knob one step above the action radius (`rounded-lg`, role + 4px), so the
 * generator must derive the value instead of pinning the old 8px literal.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRadius, buildComponents } from '../build-design-md.mjs';
import { buildAgentConstraints } from '../build-handoff.mjs';

const raw = JSON.parse(readFileSync(resolve(__dirname, '../../hirobius.tokens.json'), 'utf8'));

describe('buildRadius', () => {
  it('derives the container tier from the action radius plus 4px', () => {
    const containerRow = buildRadius(raw)
      .split('\n')
      .find((l) => l.startsWith('| Container'));
    expect(containerRow).toBeDefined();
    expect(containerRow).toContain('`12px`');
    expect(containerRow).toContain('rounded-lg');
    expect(containerRow).not.toContain('primitive.radius.8');
  });

  it('follows the action radius when the knob moves', () => {
    const square = structuredClone(raw);
    square.semantic.radius.action.$value = '{primitive.radius.4}';
    const containerRow = buildRadius(square)
      .split('\n')
      .find((l) => l.startsWith('| Container'));
    expect(containerRow).toContain('`8px`');
  });
});

describe('buildComponents', () => {
  const table = buildComponents(raw, { componentInventory: ['Card', 'SegmentedControl'] });

  it('no longer says containers are 8px or forbids 12px', () => {
    expect(table).not.toMatch(/never 12\/16\/20/);
    expect(table).not.toMatch(/`8px` \(`primitive\.radius\.8`\)/);
  });

  it('describes the card radius as the role-derived container value', () => {
    const cardRow = table.split('\n').find((l) => l.includes('**Cards**'));
    expect(cardRow).toContain('`12px`');
    expect(cardRow).toContain('rounded-lg');
  });
});

describe('buildAgentConstraints', () => {
  it('states the action radius from the token and the container step above it', () => {
    const line = buildAgentConstraints(raw)
      .split('\n')
      .find((l) => l.includes('Action radius'));
    expect(line).toContain('`8px` for interactive controls');
    expect(line).toContain('`12px` containers');
    expect(line).not.toContain('`4px`');
  });
});
