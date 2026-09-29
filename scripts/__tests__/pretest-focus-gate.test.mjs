import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const registry = JSON.parse(readFileSync(resolve(root, 'docs/guardrails/registry.json'), 'utf8'));

describe('check-focus-states wiring', () => {
  it('runs in the pretest chain', () => {
    expect(pkg.scripts.pretest).toContain('scripts/check-focus-states.mjs');
  });

  it('is registered on the pnpm-meta channel as a blocking gate', () => {
    const entry = registry.validators
      ? registry.validators.find((v) => v.id === 'check-focus-states')
      : (registry.gates ?? registry).find?.((v) => v.id === 'check-focus-states');
    expect(entry.firingChannel).toBe('pnpm-meta');
    expect(entry.severity).toBe('error');
  });
});
