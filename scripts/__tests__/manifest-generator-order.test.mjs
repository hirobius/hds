/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#379 — the two generators that write public/hds-manifest.json must agree
 * on who owns each field, so the order they run in cannot change the result.
 *
 * `pnpm tokens` runs generate-manifest → generate-component-api →
 * enrich-manifest and then build-tokens. generate-manifest merges JSDoc `@slot`
 * tags into each spec's hand-kept `slots` (mergeSlots, hds#339). build-tokens
 * used to replace Dialog's `slots` with its own hand-kept copy afterwards, so
 * Dialog's `@slot trigger` vanished whenever the full chain ran and came back
 * whenever `pnpm manifest:generate` ran last. check-manifest-drift could not see
 * it: both outputs were "generated", and a PR that ran `pnpm tokens` carried the
 * drop as unrelated churn.
 *
 * Seam: the real chains from package.json, run by `node` against a copy of the
 * working tree. The copy lives under `<repo>/temp/` (gitignored) rather than
 * the OS temp directory so `typescript` and `prettier` still resolve through the
 * repo's node_modules. The `pnpm tokens` chain runs up to build-tokens, its last
 * step that writes the manifest; `pnpm manifest:generate` then runs on that
 * result and must change nothing but the timestamp.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = join('public', 'hds-manifest.json');

/** What the manifest steps read. generate-component-api needs tsconfig.json. */
const TREE = ['scripts', 'src', 'tenants', 'hirobius.tokens.json', 'tsconfig.json', MANIFEST];

/** Both chains parse, discover and type-check the whole component tree, twice. */
const SETUP_TIMEOUT = 300_000;

/** Same pattern writeStableArtifact treats as volatile (ISO dates and datetimes). */
const TIMESTAMP = /\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g;

const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

/**
 * The `node <file> [args]` steps of a package.json script chain.
 *
 * @param {string} name
 * @returns {string[][]}
 */
function chain(name) {
  return pkg.scripts[name].split('&&').map((step) => {
    const [bin, ...args] = step.trim().split(/\s+/);
    if (bin !== 'node') throw new Error(`${name}: expected a node step, got "${step.trim()}"`);
    return args;
  });
}

const tokensChain = chain('tokens');
const lastManifestWriter = tokensChain.findIndex(([file]) => file === 'scripts/build-tokens.mjs');
const TOKENS_STEPS = tokensChain.slice(0, lastManifestWriter + 1);
const MANIFEST_GENERATE_STEPS = chain('manifest:generate');

const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

/** @returns {string} the manifest text after running `steps` in `root` */
function run(root, steps) {
  for (const args of steps) {
    execFileSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', stdio: 'pipe' });
  }
  return readFileSync(join(root, MANIFEST), 'utf8');
}

/** Every spec's `slots`, keyed by spec name (utilities included). */
function slotsBySpec(text) {
  const manifest = JSON.parse(text);
  const specs = { ...manifest.componentSpecs, ...manifest.utilities };
  return Object.fromEntries(
    Object.entries(specs)
      .filter(([, spec]) => spec?.slots !== undefined)
      .map(([name, spec]) => [name, spec.slots]),
  );
}

let root;
let afterTokens;
let afterManifestGenerate;

beforeAll(() => {
  expect(lastManifestWriter, 'package.json "tokens" no longer runs build-tokens').toBeGreaterThan(
    0,
  );
  mkdirSync(join(REPO, 'temp'), { recursive: true });
  root = mkdtempSync(join(REPO, 'temp', 'manifest-generator-order-'));
  for (const path of TREE) cpSync(join(REPO, path), join(root, path), { recursive: true });

  afterTokens = run(root, TOKENS_STEPS);
  afterManifestGenerate = run(root, MANIFEST_GENERATE_STEPS);
}, SETUP_TIMEOUT);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('manifest generators agree regardless of run order (hds#379)', () => {
  it("keeps Dialog's JSDoc @slot trigger through the pnpm tokens chain", () => {
    const names = (slotsBySpec(afterTokens).Dialog ?? []).map((slot) => slot.name);
    expect(names).toContain('trigger');
  });

  it("leaves every spec's slots exactly as pnpm manifest:generate writes them", () => {
    expect(slotsBySpec(afterTokens)).toEqual(slotsBySpec(afterManifestGenerate));
  });

  it('pnpm manifest:generate after pnpm tokens changes nothing but timestamps', () => {
    expect(afterManifestGenerate.replace(TIMESTAMP, '<ts>')).toBe(
      afterTokens.replace(TIMESTAMP, '<ts>'),
    );
  });
});
