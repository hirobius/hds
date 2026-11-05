/**
 * Seam under test: the one-page-per-release view behind /upgrade/<version>
 * (hds#445). One release's ledger steps sorted into the four lists UPGRADING.md
 * prints (Fixed for you, Looks different, Coming next, Do by hand), so the page
 * a consumer opens from a release notice says what UPGRADING.md says.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
// @ts-expect-error -- plain ESM script; no type declarations.
import { listOf } from '../../scripts/upgrade/compile.mjs';
import { RELEASE_LISTS, previousVersion, releaseLists } from '../../docs-site/lib/upgrade-release';
import type { LedgerRelease } from '../../docs-site/lib/upgrade-ledger';
import { UpgradeReleaseView } from '../../docs-site/components/upgrade-release';

const ROOT = join(__dirname, '..', '..');
const releases = readdirSync(join(ROOT, 'upgrade/releases'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'upgrade/releases', f), 'utf8')) as LedgerRelease);

const step = (id: string, kind: string, impact: string, extra = {}) => ({
  id,
  kind,
  impact,
  plain: `do ${id}`,
  ...extra,
});
const FIX: LedgerRelease = {
  version: '0.3.0',
  date: '2026-01-02',
  bump: 'minor',
  summary: '2 changes to make by hand.',
  steps: [
    step('0.3.0/behavior/A', 'behavior', 'behavior'),
    step('0.3.0/moved/B', 'moved', 'breaking', {
      auto: { codemod: 'hds-move', args: ['--root', '.'] },
    }),
    step('0.3.0/look/C', 'look', 'look'),
    step('0.3.0/removed/D', 'removed', 'breaking'),
    step('0.3.0/deprecated/E', 'deprecated', 'none', { removeIn: '1.0.0' }),
  ],
};

describe('releaseLists', () => {
  it('puts every step of every ledger in the list UPGRADING.md puts it in', () => {
    for (const r of releases) {
      const lists = releaseLists(r);
      for (const s of r.steps) {
        expect(lists[listOf(s) as keyof typeof lists], s.id).toContainEqual(s);
      }
      const total = RELEASE_LISTS.reduce((n, l) => n + lists[l.key].length, 0);
      expect(total, r.version).toBe(r.steps.length);
    }
  });

  it('orders Do by hand most severe first, keeping ledger order within an impact', () => {
    expect(releaseLists(FIX).doByHand.map((s) => s.id)).toEqual([
      '0.3.0/removed/D',
      '0.3.0/behavior/A',
    ]);
  });
});

describe('previousVersion', () => {
  it('is the release just below, in numeric order, or null for the oldest', () => {
    const all = ['0.9.0', '0.10.0', '0.2.0'];
    expect(previousVersion(all, '0.10.0')).toBe('0.9.0');
    expect(previousVersion(all, '0.2.0')).toBeNull();
  });
});

describe('<UpgradeReleaseView />', () => {
  const html = renderToStaticMarkup(
    <UpgradeReleaseView release={FIX} previous="0.2.0" latest="0.5.0" />,
  );

  it('names the release, its date and bump, and its summary', () => {
    expect(html).toContain('<h1>Upgrade to 0.3.0</h1>');
    expect(html).toContain('2026-01-02');
    expect(html).toContain('minor');
    expect(html).toContain('2 changes to make by hand.');
  });

  it('leads with the one command, pinned to the release', () => {
    expect(html).toContain('npx @hirobius/design-system@0.3.0 upgrade');
  });

  it('prints the four lists in UPGRADING.md order, with counts', () => {
    const at = (h: string) => html.indexOf(`<h2>${h}`);
    expect(at('Fixed for you (1)')).toBeGreaterThan(-1);
    expect(at('Fixed for you')).toBeLessThan(at('Looks different (1)'));
    expect(at('Looks different')).toBeLessThan(at('Coming next (1)'));
    expect(at('Coming next')).toBeLessThan(at('Do by hand (2)'));
    expect(html).toContain('<code>hds-move --root .</code>');
    expect(html).toContain('removed in 1.0.0');
  });

  it('prints the subject before a line that does not name it, and not twice', () => {
    const named = renderToStaticMarkup(
      <UpgradeReleaseView
        release={{
          ...FIX,
          steps: [
            step('0.3.0/look/--a-var', 'look', 'look', {
              plain: 'This variable now follows the dial.',
            }),
            step('0.3.0/look/--b-var', 'look', 'look', { plain: '--b-var is warmer.' }),
          ],
        }}
        previous={null}
        latest="0.3.0"
      />,
    );
    expect(named).toContain('<code>--a-var</code> This variable now follows the dial.');
    expect(named).not.toContain('<code>--b-var</code>');
  });

  it('links the range page from the release before and to the newest', () => {
    expect(html).toContain('href="/upgrade?from=0.2.0&amp;to=0.3.0"');
    expect(html).toContain('href="/upgrade?from=0.3.0&amp;to=0.5.0"');
  });

  it('says so when a release asks nothing, and drops the newer link on the newest', () => {
    const quiet = renderToStaticMarkup(
      <UpgradeReleaseView
        release={{ ...FIX, version: '0.5.0', steps: [] }}
        previous={null}
        latest="0.5.0"
      />,
    );
    expect(quiet).toContain('Nothing to do');
    expect(quiet).not.toContain('<h2>');
    expect(quiet).not.toContain('to=0.5.0&amp;');
    expect(quiet).not.toContain('from=0.5.0');
  });
});
