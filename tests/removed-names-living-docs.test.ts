// @vitest-environment node
/**
 * The living backlogs (docs/ROADMAP.md, docs/CONSUMER_READINESS_BACKLOG.md)
 * describe the package as it is now. After the 0.20.0 removals (hds#389 R1) they
 * may name a removed export only to record that it went in 0.20.0, on the same
 * line (hds#389 R1a review: they still listed FoundationSwatch,
 * ComponentInstanceMatrix and the Hds* aliases as current exports).
 * Dated history (CHANGELOG.md, ADRs, dated reports, MIGRATIONS.md) is not checked.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const LIVING = ['docs/ROADMAP.md', 'docs/CONSUMER_READINESS_BACKLOG.md'];

/** Names 0.20.0 removed outright (the 79 /patterns names still exist there). */
const REMOVED = [
  'HdsCheckbox',
  'HdsRadio',
  'HdsSelect',
  'HdsSlider',
  'HdsToggle',
  'HdsTooltip',
  'CinematicLink',
  'CinematicLinkProps',
  'ComponentInstanceMatrix',
  'FoundationSwatch',
  'FoundationSwatchProps',
  'Sketch',
  'SketchProps',
  'Token',
  'TokenProps',
  'tokenLabelVariants',
  'tokenNodeInlineVariants',
  'tokenShellVariants',
];

// `Sketch` and `Token` are ordinary words too, so only their code spans count.
const mention = (name: string) =>
  name === 'Sketch' || name === 'Token'
    ? new RegExp('`' + name + '`')
    : new RegExp(`(?<![\\w$])${name}(?![\\w$])`);

describe('living docs after the 0.20.0 removals', () => {
  for (const file of LIVING) {
    it(`${file} names a removed export only to say 0.20.0 removed it`, () => {
      const stale = readFileSync(resolve(ROOT, file), 'utf8')
        .split('\n')
        .flatMap((line, i) =>
          REMOVED.filter((name) => mention(name).test(line) && !line.includes('0.20.0')).map(
            (name) => `${file}:${i + 1}: ${name}`,
          ),
        );
      expect(stale).toEqual([]);
    });
  }
});
