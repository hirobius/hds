/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared setup for the figma-* tests in scripts/__tests__ (hds#1008): the
 * fixture links.json, a temporary repo root holding it and the fixture
 * tokens (removed after each test), and a library file with a model pushed.
 */
import { afterEach } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { hdsRunPush } from '../../lib/figma-runtime.mjs';
import { buildPushPayload } from '../../lib/figma-scripts.mjs';
import { FIXTURE_TOKENS_PATH } from './figma-fixture.mjs';
import { createFakeFigma, textStyleFonts } from './fake-figma.mjs';

/** The figma/links.json fields the Sync plugin bakes in (test keys, the real names and host). */
export const LIBRARY_LINKS = Object.freeze({
  docsUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: 'RETIREDKEY000000000000', fileName: 'HDS Tokens & Components (old)' }],
});
/** HDS Staging, the draft workbench (ADR-026, A4): optional in links.json, and never a target. */
export const STAGING_LINKS = Object.freeze({
  stagingFileKey: 'STAGINGKEY000000000000',
  stagingFileName: 'HDS Staging',
});
export const LINKS = Object.freeze({ ...LIBRARY_LINKS, ...STAGING_LINKS });
export const RETIRED_KEY = LINKS.retiredFiles[0].fileKey;
export const STAGING_KEY = LINKS.stagingFileKey;
export const COMMIT = '0123456789abcdef0123456789abcdef01234567';
export const NOTHING_LINE = 'updated 0 · created 0 · deleted 0';

/** Writes `links` as the root's figma/links.json. */
export function writeLinks(root, links) {
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(links, null, 2));
}

/**
 * Call at module level: returns `tempRoot()`, which makes a temporary repo
 * root with the fixture tokens and `figma/links.json` (= `links`). Every root
 * it made is removed after each test.
 */
export function useTempRoots(prefix, links = LINKS) {
  let dirs = [];
  afterEach(() => {
    dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
    dirs = [];
  });
  return () => {
    const root = mkdtempSync(join(tmpdir(), prefix));
    dirs.push(root);
    copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
    writeLinks(root, links);
    return root;
  };
}

/** A library file the Sync plugin pushed `model` into (it writes and reads raw text). */
export async function pushedLibrary(model, extraFonts = []) {
  const figma = createFakeFigma({
    fileName: LINKS.libraryFileName,
    fonts: [...textStyleFonts(model.textStyles), ...extraFonts],
  });
  figma.fileKey = LINKS.libraryFileKey;
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  return figma;
}
