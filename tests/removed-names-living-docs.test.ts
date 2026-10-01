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

/** Names 0.20.0 removed outright (the /patterns names that moved still exist there). */
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

// Plus every name codemods/removed-0.20.json lists (no replacement: hds#389 R1's
// docs/lab components, hds#394 wave 4a and the root *Variants helpers).
const { modules } = JSON.parse(
  readFileSync(resolve(ROOT, 'codemods/removed-0.20.json'), 'utf8'),
) as { modules: Record<string, string[]> };
REMOVED.push(...Object.values(modules).flat());
// And the names removed with a survivor (`replaced`, hds#394 wave 4b).
const { replaced = {} } = JSON.parse(
  readFileSync(resolve(ROOT, 'codemods/removed-0.20.json'), 'utf8'),
) as { replaced?: Record<string, Record<string, string>> };
REMOVED.push(...Object.values(replaced).flatMap((names) => Object.keys(names)));

// One capitalised word (`Sketch`, `Token`, `Calendar`, `Step`) is ordinary prose
// too, so only its code spans count.
const mention = (name: string) =>
  /^[A-Z][a-z]+$/.test(name)
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
