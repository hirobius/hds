// @vitest-environment node
/**
 * The SSR gate's own fixture (hds#958): a demo that renders one thing on the
 * server and another in the browser fails, and a stable one passes.
 */
import { describe, expect, it } from 'vitest';
import { hydrationProblems } from './helpers/hydration-gate';

describe('hydration gate', () => {
  it('fails a demo that renders differently on server and client', async () => {
    const problems = await hydrationProblems(async () => {
      const { useEffect, useState } = await import('react');
      return {
        Stable: function Stable() {
          // Reading the browser in an effect is the safe pattern.
          const [where, setWhere] = useState('server');
          useEffect(() => setWhere('client'), []);
          return <p>{where}</p>;
        },
        Mismatch: function Mismatch() {
          return <p>{typeof window === 'undefined' ? 'server' : 'client'}</p>;
        },
      };
    });
    expect([...problems.keys()]).toEqual(['Mismatch']);
    expect(problems.get('Mismatch')?.join('\n')).toMatch(/did not match|hydrat/i);
  });
});
