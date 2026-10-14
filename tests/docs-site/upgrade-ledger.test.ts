/**
 * Seam under test: the upgrade-ledger rows behind <ReleaseLedger />,
 * <DeprecationLedger /> and <RemovalLedger /> on the upgrade and deprecation
 * guides (hds#650). They are read from upgrade/index.json and
 * upgrade/releases/*.json, the ledger the upgrade command runs, so the guides
 * cannot list a deprecation or a release the ledger doesn't have, or miss one.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  deprecationRows,
  releaseRows,
  removalGroups,
  type LedgerIndex,
  type LedgerRelease,
} from '../../docs-site/lib/upgrade-ledger';

const ROOT = join(__dirname, '..', '..');
const index = JSON.parse(readFileSync(join(ROOT, 'upgrade/index.json'), 'utf8')) as LedgerIndex;
const releases = readdirSync(join(ROOT, 'upgrade/releases'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'upgrade/releases', f), 'utf8')) as LedgerRelease);

describe('releaseRows', () => {
  it('lists every ledger version, newest first', () => {
    const rows = releaseRows(index);
    expect(rows.map((r) => r.version).sort()).toEqual(index.versions.map((v) => v.version).sort());
    expect(rows[0]!.version).toBe(index.latest);
  });
});

describe('deprecationRows', () => {
  const rows = deprecationRows(index, releases);

  it('accounts for every deprecated name exactly once', () => {
    const names = rows.flatMap((r) => r.names).sort();
    expect(names).toEqual(index.deprecated.map((d) => d.name).sort());
  });

  it('gives every row a plain-language note, a removal version and the release that deprecated it', () => {
    for (const row of rows) {
      expect(row.plain, row.step).toMatch(/\S/);
      expect(row.removeIn, row.step).toMatch(/^\d+\.\d+\.\d+$/);
      expect(row.since, row.step).toBe(row.step.split('/')[0]);
    }
  });

  it('fails loudly when a deprecation points at a step the ledger lacks', () => {
    const broken = {
      ...index,
      deprecated: [{ name: 'X', removeIn: '1.0.0', step: '9.9.9/deprecated/X' }],
    };
    expect(() => deprecationRows(broken, releases)).toThrow(/9\.9\.9\/deprecated\/X/);
  });
});

describe('removalGroups', () => {
  it('groups every removed, moved, renamed and folded step by release, newest first', () => {
    const groups = removalGroups(releases);
    const kinds = new Set(['removed', 'moved', 'renamed', 'folded']);
    const expected = releases.flatMap((r) => r.steps.filter((s) => kinds.has(s.kind)));
    expect(groups.flatMap((g) => g.steps).length).toBe(expected.length);
    const versions = groups.map((g) => g.version);
    expect(versions).toEqual(
      [...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
    );
  });
});
