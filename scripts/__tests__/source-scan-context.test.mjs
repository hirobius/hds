/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for gateContext in scripts/lib/source-scan.mjs (hds#1010):
 * the shared ROOT / --json / fixture-mode preamble of line-scoped gates.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gateContext } from '../lib/source-scan.mjs';

const url = pathToFileURL(join('/repo', 'scripts', 'check-x.mjs')).href;

describe('gateContext', () => {
  it('resolves ROOT to the parent of the script directory', () => {
    expect(gateContext(url, [], {}).ROOT).toBe(join('/repo'));
  });
  it('reads --json and fixture mode from argv/env', () => {
    const c = gateContext(url, ['node', 'x', '--json', '--fixture-mode'], {
      FIXTURE_FILE: 'f.css',
    });
    expect(c).toMatchObject({ jsonMode: true, isFixtureMode: true, fixtureFile: 'f.css' });
  });
  it('defaults to non-JSON, non-fixture', () => {
    const c = gateContext(url, ['node', 'x'], {});
    expect(c).toMatchObject({ jsonMode: false, isFixtureMode: false, fixtureFile: undefined });
  });
  it('honours HDS_FIXTURE_MODE=1', () => {
    expect(gateContext(url, [], { HDS_FIXTURE_MODE: '1' }).isFixtureMode).toBe(true);
  });
});
