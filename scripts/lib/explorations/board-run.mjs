/** @internal — reads run directories for the explorations board (hirobius/hds#628). */
/**
 * One direction of one screen sits on disk as
 *
 *   <runDir>/<screen>-<A|B|C>/
 *     screenshots/{light,dark}-{1280,390}.png
 *     rationale.md  refs.json  bend-log.json  gaps.json  review.json
 *
 * This module reads that layout and reports what is there, what is missing and
 * what could not be parsed. It never throws on a bad file: a board must show a
 * visible gap, not fail to build. It does not judge the contents of the files;
 * the harness gates do that.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pngSize } from './board-images.mjs';
import { LETTERS, compareScreens } from './board-chrome.mjs';

export const THEMES = ['light', 'dark'];
export const VIEWPORTS = [1280, 390];
const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;

/** `standing-B` -> `{ screen: 'standing', letter: 'B' }`; null for any other name. */
export function parseDirectionId(name) {
  const m = /^(.+)-([ABC])$/.exec(name);
  return m ? { screen: m[1], letter: m[2] } : null;
}

const subdirs = (dir) =>
  readdirSync(dir)
    .sort()
    .filter((n) => statSync(path.join(dir, n)).isDirectory());

/**
 * Turn the paths a caller gives into run directories, oldest first. A path that
 * holds direction folders is one run; a path that holds date-named folders (a
 * `runs/` root) expands to each of those.
 * @param {string[]} paths
 * @returns {string[]}
 * @throws {Error} when a path is not a directory
 */
export function expandRunDirs(paths) {
  const out = [];
  for (const p of paths) {
    if (!existsSync(p) || !statSync(p).isDirectory()) {
      throw new Error(`run directory not found: ${p}`);
    }
    const names = subdirs(p);
    if (names.some((n) => parseDirectionId(n))) {
      out.push(p);
      continue;
    }
    const dated = names.filter((n) => DATE_DIR.test(n));
    if (dated.length) out.push(...dated.map((n) => path.join(p, n)));
    else out.push(p);
  }
  return out;
}

/** Screens that have at least one direction in the given run directories, in spec priority order. */
export function listScreens(runDirs) {
  const screens = new Set();
  for (const dir of runDirs) {
    for (const n of subdirs(dir)) {
      const parsed = parseDirectionId(n);
      if (parsed) screens.add(parsed.screen);
    }
  }
  return [...screens].sort(compareScreens);
}

/** The directory of one direction in the newest run that has it, or null. */
function findDirection(runDirs, screen, letter) {
  let found = null;
  for (const dir of runDirs) {
    const candidate = path.join(dir, `${screen}-${letter}`);
    if (existsSync(candidate) && statSync(candidate).isDirectory())
      found = { dir: candidate, run: dir };
  }
  return found;
}

function readJson(file) {
  if (!existsSync(file)) return { state: 'missing' };
  try {
    return { state: 'ok', value: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    return { state: 'invalid', error: err.message };
  }
}

function readText(file) {
  if (!existsSync(file)) return { state: 'missing' };
  const text = readFileSync(file, 'utf8').trim();
  return text ? { state: 'ok', text } : { state: 'empty' };
}

function readShot(dir, id, theme, vp, shotsDir) {
  const file = `${theme}-${vp}.png`;
  const rel = `${id}/screenshots/${file}`;
  // The harness (scripts/eval-consistency.mjs --explorations) writes <id>-<vp>-<theme>.png to
  // one reports directory; a direction folder's own screenshots/ is the fallback.
  const harness = shotsDir ? path.join(shotsDir, `${id}-${vp}-${theme}.png`) : null;
  const full = harness && existsSync(harness) ? harness : path.join(dir, 'screenshots', file);
  const shot = { theme, vp, file, rel };
  if (!existsSync(full)) return { ...shot, state: 'missing' };
  const buf = readFileSync(full);
  try {
    const { width, height } = pngSize(buf);
    return { ...shot, state: 'ok', buf, width, height };
  } catch (err) {
    return { ...shot, state: 'unreadable', error: err.message };
  }
}

/** The harness verdict for one direction from <shotsDir>/gates.json; `{}` when there is none. */
function gateResult(shotsDir, id) {
  if (!shotsDir) return {};
  const gates = readJson(path.join(shotsDir, 'gates.json'));
  const entry = gates.state === 'ok' ? gates.value?.directions?.[id] : null;
  return entry ? { pass: entry.pass !== false } : {};
}

/**
 * Read one direction. `screenshots: false` skips the images, for the index,
 * which needs the review and the gaps only.
 * @returns {object} the direction as found; `present: false` when no run has it
 */
export function readDirection(runDirs, screen, letter, { screenshots = true, shotsDir } = {}) {
  const id = `${screen}-${letter}`;
  const at = findDirection(runDirs, screen, letter);
  if (!at) return { id, letter, present: false };
  const gate = gateResult(shotsDir, id);
  return {
    id,
    letter,
    present: true,
    dir: at.dir,
    run: at.run,
    rationale: readText(path.join(at.dir, 'rationale.md')),
    refs: readJson(path.join(at.dir, 'refs.json')),
    bends: readJson(path.join(at.dir, 'bend-log.json')),
    gaps: readJson(path.join(at.dir, 'gaps.json')),
    review: readJson(path.join(at.dir, 'review.json')),
    gate,
    // a direction that failed its gates is not shown
    shots:
      screenshots && gate.pass !== false
        ? VIEWPORTS.flatMap((vp) =>
            THEMES.map((theme) => readShot(at.dir, id, theme, vp, shotsDir)),
          )
        : [],
  };
}

/**
 * Read all three directions of one screen. A direction run on more than one
 * date comes from the newest run.
 * @throws {Error} when no run holds any direction of the screen
 */
export function readScreenRun(runDirs, screen, opts) {
  const directions = LETTERS.map((letter) => readDirection(runDirs, screen, letter, opts));
  if (!directions.some((d) => d.present)) {
    throw new Error(`no directions for screen "${screen}" under ${runDirs.join(', ')}`);
  }
  const runs = [
    ...new Set(directions.filter((d) => d.present).map((d) => path.basename(d.run))),
  ].sort();
  return { screen, directions, runs };
}
