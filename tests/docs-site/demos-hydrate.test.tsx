// @vitest-environment node
/**
 * Demo SSR gate (hds#958): every docs demo (the DEMOS registry in
 * docs-site/components/component-demos.tsx) server-renders in plain Node and
 * then hydrates in jsdom with no hydration mismatch: no onRecoverableError,
 * no console.error about hydration. How, and why the server and client are
 * separate module graphs: tests/helpers/hydration-gate.ts; its fixture:
 * tests/hydration-gate.test.tsx.
 */
import { describe, expect, it } from 'vitest';
import { hydrationProblems, type Demos } from '../helpers/hydration-gate';

const load = async () =>
  (await import('../../docs-site/components/component-demos')).DEMOS as unknown as Demos;

describe('docs demos hydrate', () => {
  it('every demo hydrates its server HTML with no mismatch', async () => {
    const problems = await hydrationProblems(load);
    expect(Object.fromEntries(problems)).toEqual({});
  }, 60_000);
});
