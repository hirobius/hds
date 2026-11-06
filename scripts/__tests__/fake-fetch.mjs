/**
 * Test support for the release:* script tests (hds#1009 dedupe): one fake
 * GitHub + Discord. Not a test file; vitest only collects *.test.*.
 */

/**
 * A fake GitHub + Discord: answers from `routes`, records every call. A route
 * key is `METHOD url` (query dropped), or `METHOD url state` for a `state=` query.
 */
export function fakeFetch(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const u = String(url);
    calls.push({ method, url: u, body: init.body ? JSON.parse(init.body) : null });
    const state = /[?&]state=(\w+)/.exec(u)?.[1];
    const key = `${method} ${u.replace(/\?.*$/, '')}${state ? ` ${state}` : ''}`;
    const hit = routes[key] ?? routes[`${method} ${u.replace(/\?.*$/, '')}`];
    const [status, body] =
      typeof hit === 'function' ? hit() : (hit ?? [404, { message: 'Not Found' }]);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}
