// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * A token added in code with no Figma variable must fail the parity gate until it is
 * synced (hds#1565). The test copies the real inputs to a temporary root, adds one token
 * to hirobius.tokens.json, and runs the gate end to end: the token drift check against
 * figma/snapshot.json finds the variable missing, and the gate fails on a difference
 * that figma/parity/baseline.json does not list. The untouched copy passes, so the
 * failure is the new token and nothing else.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runParityCheck } from '../check-figma-parity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const INPUTS = [
  'hirobius.tokens.json',
  'public/hds-manifest.json',
  'package.json',
  'figma',
  'src/app/components',
  'directions',
  'accents',
];
const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function copyRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-parity-token-'));
  temps.push(root);
  for (const f of INPUTS) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(ROOT, f), join(root, f), {
      recursive: true,
      // The parity run reads ToastOptions from toast.tsx (figma/mapping-overrides.json).
      filter: (src) => !/src\/app\/components\/.+/.test(src) || src.endsWith('/toast.tsx'),
    });
  }
  return root;
}

function addToken(root) {
  const file = join(root, 'hirobius.tokens.json');
  const tokens = JSON.parse(readFileSync(file, 'utf8'));
  tokens.semantic.space.parityProbe = {
    $value: '{primitive.space.4}',
    $description: 'Fixture token with no Figma variable (hds#1565).',
  };
  writeFileSync(file, JSON.stringify(tokens, null, 2) + '\n');
}

describe('check-figma-parity: a new token with no Figma variable', () => {
  it('passes on the untouched copy', async () => {
    const { exitCode, result } = await runParityCheck({ root: copyRoot() });
    expect(result.fresh.map((f) => f.id)).toEqual([]);
    expect(exitCode).toBe(0);
  });

  it('fails until the variable is synced, naming the token', async () => {
    const root = copyRoot();
    addToken(root);
    const { exitCode, result } = await runParityCheck({ root });
    expect(exitCode).toBe(1);
    const fresh = result.fresh.find((f) => f.kind === 'token-missing-in-figma');
    expect(fresh).toMatchObject({
      id: 'token-missing-in-figma:Hirobius/Semantic: space/parityProbe',
      fix: 'figma',
      severity: 'high',
    });
  });
});
