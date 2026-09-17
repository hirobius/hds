/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The fixture token graph (fixtures/figma-model/tokens.json) as the Figma sync
 * tests use it: its model, the fonts its text styles need, and an in-memory
 * Figma file that has those fonts.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../../lib/figma-model.mjs';
import { createFakeFigma } from './fake-figma.mjs';

export const FIXTURE_TOKENS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'figma-model',
  'tokens.json',
);

export const fixtureModel = () =>
  buildFigmaModel(JSON.parse(readFileSync(FIXTURE_TOKENS_PATH, 'utf8')));

/** The fixture's text style fonts, plus Inter Regular: a new text style's default font. */
export const FIXTURE_FONTS = Object.freeze([
  { family: 'Inter', style: 'Regular' },
  { family: 'Satoshi', style: 'Medium' },
  { family: 'Satoshi', style: 'Bold' },
  { family: 'Geist Mono', style: 'Medium' },
]);

/** An empty in-memory Figma file whose editor has every font the fixture needs. */
export const newFixtureFile = (options = {}) =>
  createFakeFigma({ fonts: FIXTURE_FONTS, ...options });
