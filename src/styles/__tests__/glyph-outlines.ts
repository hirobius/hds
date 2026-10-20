/**
 * Minimal WOFF2 → TrueType outline reader for the font contract tests.
 *
 * Reads only what the overlap check needs: the table directory, `head`, `loca`
 * and `glyf`. It does not decode the WOFF2 glyf transform, so a shipped file
 * must store glyf and loca untransformed (`readGlyphs` throws otherwise, naming
 * the re-encode step). Composite glyphs are skipped: their components are
 * checked as the simple glyphs they point to.
 */
import { brotliDecompressSync } from 'zlib';

type Point = [number, number];
export type Contour = Point[];
/** A raw TrueType point: x, y, on-curve. */
type RawPoint = [number, number, boolean];

// WOFF2 known-table index (spec §5.1); only these three are read by tag.
const KNOWN = { 1: 'head', 10: 'glyf', 11: 'loca' } as Record<number, string>;

function readBase128(buf: Buffer, at: { i: number }): number {
  let value = 0;
  for (let n = 0; n < 5; n++) {
    const byte = buf[at.i++];
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('bad UIntBase128');
}

function readTables(woff2: Buffer): Record<string, Buffer> {
  if (woff2.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  const numTables = woff2.readUInt16BE(12);
  const at = { i: 48 };
  const entries: { tag: string; length: number }[] = [];
  for (let t = 0; t < numTables; t++) {
    const flags = woff2[at.i++];
    const index = flags & 0x3f;
    const version = flags >> 6;
    let tag = KNOWN[index] ?? `#${index}`;
    if (index === 63) {
      tag = woff2.toString('latin1', at.i, at.i + 4);
      at.i += 4;
    }
    const origLength = readBase128(woff2, at);
    const nullTransform = tag === 'glyf' || tag === 'loca' ? version === 3 : version === 0;
    if (!nullTransform && (tag === 'glyf' || tag === 'loca')) {
      throw new Error(
        `${tag} uses the WOFF2 glyf transform; re-encode the font with glyf/loca untransformed (recipe in src/styles/fonts.css)`,
      );
    }
    const length = nullTransform ? origLength : readBase128(woff2, at);
    entries.push({ tag, length });
  }
  const totalCompressed = woff2.readUInt32BE(20);
  const data = brotliDecompressSync(woff2.subarray(at.i, at.i + totalCompressed));
  const tables: Record<string, Buffer> = {};
  let offset = 0;
  for (const { tag, length } of entries) {
    tables[tag] = data.subarray(offset, offset + length);
    offset += length;
  }
  return tables;
}

/** Decode one simple glyph into contours of [x, y, onCurve] points. */
function decodeSimple(g: Buffer): RawPoint[][] {
  const n = g.readInt16BE(0);
  const ends: number[] = [];
  for (let c = 0; c < n; c++) ends.push(g.readUInt16BE(10 + 2 * c));
  const count = ends.at(-1)! + 1;
  let i = 10 + 2 * n;
  i += 2 + g.readUInt16BE(i);
  const flags: number[] = [];
  while (flags.length < count) {
    const f = g[i++];
    flags.push(f);
    if (f & 8) for (let r = g[i++]; r > 0; r--) flags.push(f);
  }
  const coords = (short: number, same: number) => {
    const out: number[] = [];
    let v = 0;
    for (const f of flags) {
      if (f & short) v += f & same ? g[i++] : -g[i++];
      else if (!(f & same)) {
        v += g.readInt16BE(i);
        i += 2;
      }
      out.push(v);
    }
    return out;
  };
  const xs = coords(2, 16);
  const ys = coords(4, 32);
  const contours: RawPoint[][] = [];
  let start = 0;
  for (const end of ends) {
    const c: RawPoint[] = [];
    for (let p = start; p <= end; p++) c.push([xs[p], ys[p], !!(flags[p] & 1)]);
    contours.push(c);
    start = end + 1;
  }
  return contours;
}

/** Flatten TrueType quadratic contours into closed polylines. */
function flatten(raw: RawPoint[]): Contour {
  // Normalise to on-curve start, inserting implied on-curve midpoints.
  const pts: RawPoint[] = [];
  for (let k = 0; k < raw.length; k++) {
    const a = raw[k];
    const b = raw[(k + 1) % raw.length];
    pts.push(a);
    if (!a[2] && !b[2]) pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, true]);
  }
  const s = pts.findIndex((p) => p[2]);
  const ring = [...pts.slice(s), ...pts.slice(0, s)];
  const out: Contour = [];
  for (let k = 0; k < ring.length; k++) {
    const p = ring[k];
    if (!p[2]) continue;
    out.push([p[0], p[1]]);
    const next = ring[(k + 1) % ring.length];
    if (!next[2]) {
      const end = ring[(k + 2) % ring.length];
      for (let t = 1; t < 8; t++) {
        const u = t / 8;
        const m = 1 - u;
        out.push([
          m * m * p[0] + 2 * m * u * next[0] + u * u * end[0],
          m * m * p[1] + 2 * m * u * next[1] + u * u * end[1],
        ]);
      }
    }
  }
  return out;
}

/** Every simple glyph in the font, by glyph id, as flattened contours. */
export function readGlyphs(woff2: Buffer): Map<number, Contour[]> {
  const { head, loca, glyf } = readTables(woff2);
  const long = head.readInt16BE(50) === 1;
  const n = loca.length / (long ? 4 : 2) - 1;
  const off = (k: number) => (long ? loca.readUInt32BE(4 * k) : loca.readUInt16BE(2 * k) * 2);
  const glyphs = new Map<number, Contour[]>();
  for (let id = 0; id < n; id++) {
    const g = glyf.subarray(off(id), off(id + 1));
    if (g.length === 0 || g.readInt16BE(0) <= 0) continue; // empty or composite
    glyphs.set(id, decodeSimple(g).map(flatten));
  }
  return glyphs;
}

const cross = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/**
 * True when any two edges of the glyph cross: a contour that loops over itself
 * or two contours that overlap. Renderers that fill overlaps naively (Core Text
 * on macOS without the OVERLAP_SIMPLE flag, even-odd fills) show these as
 * notches or seams.
 */
export function hasOverlap(contours: Contour[]): boolean {
  const edges: { a: Point; b: Point; c: number; k: number; n: number }[] = [];
  contours.forEach((ring, c) =>
    ring.forEach((a, k) => edges.push({ a, b: ring[(k + 1) % ring.length], c, k, n: ring.length })),
  );
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e = edges[i];
      const f = edges[j];
      if (e.c === f.c && (Math.abs(e.k - f.k) === 1 || Math.abs(e.k - f.k) === e.n - 1)) continue;
      const d1 = cross(e.a, e.b, f.a);
      const d2 = cross(e.a, e.b, f.b);
      const d3 = cross(f.a, f.b, e.a);
      const d4 = cross(f.a, f.b, e.b);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
  }
  return false;
}
