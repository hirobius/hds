/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/** helpers/figma-temp-root.mjs: the shared temp repo root + library setup for figma-* tests (hds#1008). */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { hdsPlan, hdsReadState, hdsSummarize, hdsSummaryLine } from '../lib/figma-runtime.mjs';
import { LINKS, NOTHING_LINE, useTempRoots, pushedLibrary } from './helpers/figma-temp-root.mjs';
import { fixtureModel } from './helpers/figma-fixture.mjs';

const tempRoot = useTempRoots('hds-temp-root-');
const otherRoot = useTempRoots('hds-temp-root-', { libraryFileKey: 'X' });
let made;

describe('useTempRoots', () => {
  it('makes a root with the fixture tokens and figma/links.json', () => {
    made = tempRoot();
    expect(existsSync(join(made, 'hirobius.tokens.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(made, 'figma', 'links.json'), 'utf8'))).toEqual(LINKS);
  });
  it('removes the roots after each test', () => {
    expect(existsSync(made)).toBe(false);
  });
  it('writes the links it is given', () => {
    const root = otherRoot();
    expect(JSON.parse(readFileSync(join(root, 'figma', 'links.json'), 'utf8'))).toEqual({
      libraryFileKey: 'X',
    });
  });
});

describe('pushedLibrary', () => {
  it('is the library file, with the model pushed', async () => {
    const model = fixtureModel();
    const figma = await pushedLibrary(model);
    expect(figma.fileKey).toBe(LINKS.libraryFileKey);
    expect(figma.root.name).toBe(LINKS.libraryFileName);
    const plan = hdsPlan(model, await hdsReadState(figma));
    expect(hdsSummaryLine(hdsSummarize(plan))).toBe(NOTHING_LINE);
  });
});
