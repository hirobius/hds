/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFigmaModel, formatSummary } from '../build-figma-model.mjs';

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'figma-model',
  'tokens.json',
);

describe('pnpm figma:model', () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it('writes the validated model as stable JSON and returns its summary', () => {
    dir = mkdtempSync(join(tmpdir(), 'figma-model-'));
    const outPath = join(dir, 'figma', 'model.json');
    const { summary, violations } = writeFigmaModel({ tokensPath: FIXTURE, outPath });

    expect(violations).toEqual([]);
    const written = readFileSync(outPath, 'utf8');
    expect(written.endsWith('}\n')).toBe(true);
    expect(JSON.parse(written).collections.map((c) => c.name)).toContain('Hirobius/Role');
    expect(summary.themeDifferences).toBe(4);

    writeFigmaModel({ tokensPath: FIXTURE, outPath });
    expect(readFileSync(outPath, 'utf8')).toBe(written);
  });

  it('does not write a model that fails its invariants', () => {
    dir = mkdtempSync(join(tmpdir(), 'figma-model-'));
    const tokensPath = join(dir, 'tokens.json');
    // A semantic spacing token with no scope rule falls back to ALL_SCOPES,
    // which is outside the allow-list.
    writeFileSync(
      tokensPath,
      JSON.stringify({ semantic: { misc: { $type: 'number', weird: { $value: 3 } } } }),
    );
    const outPath = join(dir, 'figma', 'model.json');
    const { violations } = writeFigmaModel({ tokensPath, outPath });
    expect(violations.join('\n')).toMatch(/semantic\.misc\.weird.*ALL_SCOPES/);
    expect(existsSync(outPath)).toBe(false);
  });

  it('prints counts a reviewer can check at a glance', () => {
    const text = formatSummary(
      {
        collections: [
          { name: 'Hirobius/Primitives', modes: ['Default'], variables: 132 },
          { name: 'Hirobius/Semantic', modes: ['Light', 'Dark'], variables: 125 },
        ],
        variables: 257,
        themeDifferences: 39,
        textStyles: 9,
        effectStyles: 7,
        notInFigma: { motion: 12, 'z-index': 4 },
      },
      'figma/model.json',
    );
    expect(text).toContain('Hirobius/Semantic');
    expect(text).toMatch(/Light\/Dark\s+125 variables/);
    expect(text).toContain('39 variables differ between Light and Dark');
    expect(text).toContain('9 text styles, 7 effect styles');
    expect(text).toContain('motion 12, z-index 4');
    expect(text).toContain('figma/model.json');
  });
});
