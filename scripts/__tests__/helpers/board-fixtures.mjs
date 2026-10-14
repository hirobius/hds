/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Fixture run directories for the explorations board tests (hirobius/hds#628).
 *
 * Everything here is invented: fictional screens of a fictional agency, 21st
 * links that point nowhere, tiny generated PNGs. The layout is the one a
 * direction writes:
 *
 *   <runDir>/<screen>-<A|B|C>/
 *     screenshots/{light,dark}-{1280,390}.png
 *     rationale.md  refs.json  bend-log.json  gaps.json  review.json
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

export const VIEWS = [
  ['light', 1280],
  ['dark', 1280],
  ['light', 390],
  ['dark', 390],
];

/** A PNG buffer. `noise` makes it incompressible, so its byte size tracks its pixel count. */
export function makePng(width, height, { noise = false, seed = 1, rgb = [236, 238, 244] } = {}) {
  const img = new PNG({ width, height });
  let s = seed >>> 0;
  for (let i = 0; i < width * height; i += 1) {
    if (noise) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      img.data[i * 4] = s >>> 24;
      img.data[i * 4 + 1] = (s >>> 16) & 255;
      img.data[i * 4 + 2] = (s >>> 8) & 255;
    } else {
      img.data[i * 4] = rgb[0];
      img.data[i * 4 + 1] = rgb[1];
      img.data[i * 4 + 2] = rgb[2];
    }
    img.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(img);
}

export function tmpDir(prefix = 'hds-board-') {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

const write = (file, text) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    typeof text === 'string' || Buffer.isBuffer(text) ? text : `${JSON.stringify(text, null, 2)}\n`,
  );
};

export const RATIONALE = {
  A: 'Faithful: each band is an open row with a divider, and the count is the only accent.',
  B: 'Ceiling: the soft-demo overlay with pill chips, roomier rows and a larger band title.',
  C: 'Wildcard: a band header that pins under the page title, inspired by a pinned section list.',
};

export const REVIEW = {
  A: {
    score: 7.5,
    max: 10,
    notes: ['Hierarchy holds at 390.', 'Dark surfaces are close to flat.'],
  },
  B: { score: 8, max: 10, notes: 'Rhythm is even; the count chip is small at 390.' },
  C: { score: 6, max: 10, notes: ['Pinned header covers the first row at 390.'] },
};

const REFS = {
  A: {
    tenant: null,
    searches: [{ tool: 'search', query: 'status band list with a count' }],
    refs: [
      {
        url: 'https://21st.dev/example/band-list',
        took: 'The count sits beside the band name, not under it.',
      },
    ],
  },
  B: {
    tenant: 'soft-demo',
    searches: [{ tool: 'get_inspiration', query: 'soft list rows with pill chips' }],
    refs: [{ url: 'https://21st.dev/example/pill-rows', took: 'Pill chip for the row state.' }],
  },
  C: {
    tenant: 'accent-pair-demo',
    searches: [
      { tool: 'search', query: 'sticky section header list' },
      {
        tool: 'get_component',
        query: 'sticky-section-header',
        reason: 'Preview hid the pin offset.',
      },
    ],
    refs: [
      { url: 'https://21st.dev/example/sticky-sections', took: 'The header pins under the title.' },
      { url: 'https://21st.dev/example/band-motion', took: 'Rows ease in when a band opens.' },
    ],
  },
};

const BENDS_C = [
  {
    kind: 'design-rule',
    rule: 'No gradients',
    why: 'A fade hides the rows that scroll under the pinned header.',
    change: 'Add a scroll-edge fade token to the Page pattern.',
  },
  {
    kind: 'hex',
    file: 'src/App.tsx',
    match: '#1a2b3c',
    why: 'The pinned header needs a tint no token provides.',
    change: 'Add a semantic.surface.pinned token.',
  },
];

const gap = (screen, direction, over = {}) => ({
  screen,
  direction,
  kind: 'pattern',
  needed: 'A band section with a count and show all',
  didInstead: 'Composed a Card header with a Badge',
  proposal: 'Add a BandSection pattern',
  evidence: `${screen}-${direction}/src/App.tsx, the band header`,
  ...over,
});

/**
 * Write one screen's run. Options:
 *   screen      screen id (default "standing")
 *   directions  letters to write (default A, B, C)
 *   omit        screenshot paths to leave out, e.g. "standing-A/screenshots/dark-390.png"
 *   size        pixel size of the 1280 captures (default 64 x 40); 390 captures are 24 x 48
 *   noise       incompressible images (for the size budget tests)
 *   files       per-direction overrides: { A: { 'refs.json': '{not json' } }
 *   gaps        per-direction gap arrays (default: one shared gap on B and C)
 */
export function writeScreenRun(runDir, opts = {}) {
  const screen = opts.screen ?? 'standing';
  const letters = opts.directions ?? ['A', 'B', 'C'];
  const omit = new Set(opts.omit ?? []);
  const [w, h] = opts.size ?? [64, 40];
  letters.forEach((letter, li) => {
    const id = `${screen}-${letter}`;
    const dir = path.join(runDir, id);
    for (const [theme, vp] of VIEWS) {
      const rel = `${id}/screenshots/${theme}-${vp}.png`;
      if (omit.has(rel)) continue;
      const [pw, ph] = vp === 1280 ? [w, h] : [24, 48];
      write(
        path.join(dir, 'screenshots', `${theme}-${vp}.png`),
        makePng(pw, ph, {
          noise: opts.noise ?? false,
          seed: li * 10 + vp + (theme === 'dark' ? 1 : 0),
        }),
      );
    }
    const defaults = {
      'rationale.md': `${RATIONALE[letter]}\n`,
      'refs.json': REFS[letter],
      'review.json': REVIEW[letter],
      'gaps.json': opts.gaps?.[letter] ?? (letter === 'A' ? [] : [gap(screen, letter)]),
      ...(letter === 'C' ? { 'bend-log.json': BENDS_C } : {}),
    };
    const files = { ...defaults, ...(opts.files?.[letter] ?? {}) };
    for (const [name, body] of Object.entries(files)) {
      if (body === null) continue;
      write(path.join(dir, name), body);
    }
  });
  return runDir;
}

export { gap };
