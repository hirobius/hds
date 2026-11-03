/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/lib/fixture-input.mjs — the fixture-input read shared by the
 * correlation validators (hds#1011).
 */

const DEFAULT_ID = '11111111-1111-4111-8111-111111111111';

/**
 * @param {unknown} input
 * @returns {{ result: { ok: false, code: 'MALFORMED', message: string } } | { scenario: unknown, id: string, type: string }}
 */
export function readFixtureInput(input) {
  if (!input || typeof input !== 'object') {
    return { result: { ok: false, code: 'MALFORMED', message: 'fixture input is not an object' } };
  }
  return {
    scenario: input.scenario,
    id: typeof input.id === 'string' ? input.id : DEFAULT_ID,
    type: typeof input.type === 'string' ? input.type : 'fixture.test',
  };
}
