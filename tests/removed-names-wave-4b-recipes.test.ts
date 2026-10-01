// @vitest-environment node
/**
 * hds#394 wave 4b folded 13 components into survivors in 0.20.0 (the names in
 * codemods/removed-0.20.json `replaced`). The recipes an agent or a consumer
 * copies from must not reach for one any more: the layout recipe, the icon
 * recipe, the component rules, the consumer guides and what is generated from
 * them. Dated history (CHANGELOG.md, ADRs, dated reports, MIGRATIONS.md) is not
 * checked; a line may still name one to say 0.20.0 removed it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { layoutRecipeSteps, layoutNegativeRules } from '../scripts/lib/layout-recipe.mjs';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const { replaced = {} } = JSON.parse(read('codemods/removed-0.20.json')) as {
  replaced?: Record<string, Record<string, string>>;
};
const FOLDED = Object.values(replaced).flatMap((names) => Object.keys(names));

/** The recipe surfaces hds#394 lists, plus what is generated from them. */
const RECIPES = [
  'scripts/lib/layout-recipe.mjs',
  'src/app/components/container.tsx',
  'docs/rules/REACT_COMPONENTS.md',
  'README.md',
  'scripts/generate-llms-txt.mjs',
  'scripts/build-design-md.mjs',
  'CONSUMING.md',
  'docs/CONSUMING.md',
  'src/icons.ts',
  'src/app/components/hds-tooltip.tsx',
  'scripts/smoke-consumer.mjs',
  'llms.txt',
  'public/llms.txt',
  'DESIGN.md',
  'skills/hds-consumer/SKILL.md',
];

// In prose a capitalised word (`Center`, `Cover`, `Frame`) is ordinary English,
// so in Markdown and text only its code spans count; in source every mention does.
const mention = (file: string, name: string) =>
  /^[A-Z][a-z]+$/.test(name) && /\.(md|txt)$/.test(file)
    ? new RegExp('`' + name + '`')
    : new RegExp(`(?<![\\w$])${name}(?![\\w$])`);

describe('recipes after the hds#394 wave 4b removals', () => {
  it('lists the 13 folded components', () => {
    for (const name of ['IconButton', 'Cluster', 'Center', 'Cover', 'Frame', 'Bleed'])
      expect(FOLDED).toContain(name);
    expect(FOLDED).not.toContain('StatusDot');
  });

  for (const file of RECIPES) {
    it(`${file} names a folded component only to say 0.20.0 removed it`, () => {
      const stale = read(file)
        .split('\n')
        .flatMap((line, i) =>
          FOLDED.filter((name) => mention(file, name).test(line) && !line.includes('0.20.0')).map(
            (name) => `${file}:${i + 1}: ${name}`,
          ),
        );
      expect(stale).toEqual([]);
    });
  }

  it('the layout recipe still names Sidebar and Switcher', () => {
    const text = [...layoutRecipeSteps, ...layoutNegativeRules].join('\n');
    expect(text).toContain('`Sidebar`');
    expect(text).toContain('`Switcher`');
  });

  it('the icon recipe uses Button iconOnly with an Icon', () => {
    for (const file of [
      'scripts/generate-llms-txt.mjs',
      'CONSUMING.md',
      'docs/CONSUMING.md',
      'public/llms.txt',
    ]) {
      expect(read(file), file).toContain('iconOnly');
    }
  });
});
