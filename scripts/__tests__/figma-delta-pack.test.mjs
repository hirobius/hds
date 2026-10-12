/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Fix A (2026-10-11): a delta part re-sent its whole 41,000-character runtime
 * to carry 2,000 to 4,000 characters of change, so the Plus Jakarta Sans sync
 * took 17 use_figma calls. The runtime every use_figma carrier ships is now
 * minified (whitespace and local names), so a part holds several times more
 * change and the same sync takes 2.
 */
import { describe, it, expect } from 'vitest';
import { parse } from 'acorn';
import {
  agentRuntimeSource,
  deltaRuntimeSource,
  emitVerifiedRuntime,
  reachableRuntime,
  runtimeSource,
  syncRuntimeSource,
} from '../lib/figma-scripts.mjs';

const source = () =>
  [runtimeSource(), deltaRuntimeSource(), syncRuntimeSource(), agentRuntimeSource()].join('\n\n');

describe('the runtime a delta part carries', () => {
  const functions = reachableRuntime(['hdsAgentPartRun'], source());
  const text = emitVerifiedRuntime(functions);

  it('is at most 32,000 characters (was 41,000), leaving a part room for 12,000+ of change', () => {
    expect(text.length).toBeLessThanOrEqual(32000);
  });

  it('keeps every top-level function name, one function per line, and still parses', () => {
    const ast = parse(text, { ecmaVersion: 2020, sourceType: 'script' });
    const names = ast.body.filter((n) => n.type === 'FunctionDeclaration').map((n) => n.id.name);
    expect(names).toEqual(functions.map((fn) => fn.name));
    expect(text.split('\n')).toHaveLength(functions.length + 1);
  });
});
