/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The ADR index (docs/adr/README.md) is generated from the ADR files by
 * scripts/build-adr-index.mjs. Seams under test:
 *   1. parseAdr reads number, title, status word, decision date and the
 *      retroactive flag from the house header formats in use.
 *   2. The committed index matches what the generator would write, so a new
 *      or edited ADR without a regenerated index fails `pnpm test`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAdr, renderIndex, readAdrs } from '../build-adr-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('parseAdr', () => {
  it('reads a plain Accepted header', () => {
    const adr = parseAdr(
      '027-remove-gate-firing-telemetry.md',
      '# ADR-027: Remove the Gate Firing Telemetry\n\n**Status:** Accepted (2026-09-20). Extends ADR-010.\n',
    );
    expect(adr).toEqual({
      number: '027',
      file: '027-remove-gate-firing-telemetry.md',
      title: 'Remove the Gate Firing Telemetry',
      status: 'Accepted',
      date: '2026-09-20',
      retroactive: false,
    });
  });

  it('reads a list-style Superseded header', () => {
    const adr = parseAdr(
      '020-x.md',
      '# ADR-020: Date/time components\n\n- **Status:** Superseded by ADR-034 (2026-10-01): removed.\n',
    );
    expect(adr.status).toBe('Superseded');
    expect(adr.date).toBe('2026-10-01');
  });

  it('flags a retroactive record and takes the decision date', () => {
    const adr = parseAdr(
      '043-freeze.md',
      '# ADR-043: Shelve HDS\n\n**Status:** Accepted, retroactive (decided 2026-07-08; recorded 2026-10-13 from commit and PR history).\n',
    );
    expect(adr.status).toBe('Accepted');
    expect(adr.retroactive).toBe(true);
    expect(adr.date).toBe('2026-07-08');
  });

  it('leaves the date empty when the status names none', () => {
    expect(parseAdr('017-x.md', '# ADR-017: Nav\n\n- **Status:** Accepted\n').date).toBe('');
  });
});

describe('docs/adr/README.md', () => {
  it('matches the generator output (run: node scripts/build-adr-index.mjs)', () => {
    const committed = readFileSync(join(ROOT, 'docs/adr/README.md'), 'utf8');
    expect(committed).toBe(renderIndex(readAdrs(join(ROOT, 'docs/adr'))));
  });
});
