import { describe, expect, it } from 'vitest';
import { buildMetadata, buildReadme, buildTokens } from '../scaffold-tenant.mjs';
import { directionProblems } from '../lib/figma-brand-modes.mjs';

describe('scaffold-tenant scaffolds a direction, never a client (ADR-035)', () => {
  const metadata = buildMetadata('warm-stone', 'Warm Stone', '#8A5A2B');

  it('metadata passes the Figma Brand gate as scaffolded: tier 1, deployment and legal empty', () => {
    expect(directionProblems(metadata)).toEqual([]);
    expect(metadata.tier).toBe(1);
  });

  it('the README, notes and token description ask for no hosting, legal entity or tier', () => {
    const readme = buildReadme('warm-stone', 'Warm Stone', '#8A5A2B');
    const text = [
      readme,
      ...metadata._notes,
      buildTokens('warm-stone', '#8A5A2B').$description,
    ].join('\n');
    expect(text).not.toMatch(/vercel|stripe|legal\.|runbook|--tier/i);
    expect(readme).toMatch(/data-brand="warm-stone"/);
  });

  it('the same gate still refuses a client filled in under directions/ by mistake', () => {
    const client = { ...metadata, legal: { ...metadata.legal, entity: 'Acme LLC' } };
    expect(directionProblems(client)).toEqual(['legal.entity is set']);
  });
});
