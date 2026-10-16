/** @internal — pure helpers for scripts/check-docs-layout-shift.mjs (docs-site layout-shift gate). */
import fs from 'node:fs';
import path from 'node:path';

export const CLS_LIMIT = 0.01;
/** Chrome regions that must keep the same box on every route. */
export const REGIONS = {
  header: '#nd-subnav, body > header, [role="banner"]',
  sidebar: '#nd-sidebar, body > aside',
  // Site-level nav only: in-content navs (breadcrumb, pagination demos) legitimately vary per page.
  nav: 'body > header nav, #nd-subnav nav, #nd-sidebar nav',
};

/** Route for every built page under outDir (index.html -> dir, x.html -> x); 404 pages and _next assets skipped. */
export function discoverRoutes(outDir) {
  const routes = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '_next' && !e.name.startsWith('.')) walk(full);
      } else if (e.name.endsWith('.html') && !/^(404|_not-found|500)\.html$/.test(e.name)) {
        let rel = path.relative(outDir, full).split(path.sep).join('/').slice(0, -5);
        rel = rel === 'index' ? '' : rel.replace(/\/index$/, '');
        routes.push(`/${rel}`);
      }
    }
  };
  walk(outDir);
  return [...new Set(routes)].sort();
}

const round = (n) => Math.round(n * 1000) / 1000;
const same = (a, b) =>
  (!a && !b) || (a && b && ['x', 'y', 'width', 'height'].every((k) => a[k] === b[k]));

/**
 * @param {{route:string, cls:number, boxes:Record<string, {x,y,width,height}|null>}[]} scans
 * @returns {{route:string, kind:'cls'|'box', detail:string}[]}
 */
export function evaluateLayout(scans, limit = CLS_LIMIT) {
  const problems = [];
  for (const s of scans) {
    if (s.cls > limit) {
      problems.push({
        route: s.route,
        kind: 'cls',
        cls: s.cls,
        detail: `CLS ${round(s.cls)} > ${limit}`,
      });
    }
  }
  // Routes share chrome per layout: the landing page (/) is not the docs shell (/docs/**).
  const refs = new Map();
  for (const s of scans) {
    const group = s.route.split('/')[1] === 'docs' ? 'docs' : 'site';
    if (!refs.has(group)) refs.set(group, s);
  }
  for (const s of scans) {
    const ref = refs.get(s.route.split('/')[1] === 'docs' ? 'docs' : 'site');
    if (ref === s) continue;
    for (const region of Object.keys(REGIONS)) {
      if (!same(ref.boxes[region], s.boxes[region])) {
        const fmt = (b) => (b ? `${b.x},${b.y} ${b.width}x${b.height}` : 'missing');
        problems.push({
          route: s.route,
          kind: 'box',
          detail: `${region} differs from ${ref.route}: ${fmt(s.boxes[region])} vs ${fmt(ref.boxes[region])}`,
        });
      }
    }
  }
  return problems;
}

/**
 * Apply the known-failure baseline. An entry { route, kind, max?, reason, issue } waives a cls problem up to `max`
 * (a ratchet: worse still fails) or a box problem outright. A box entry that waives nothing is stale and fails;
 * a cls entry cannot go stale, because load time moves CLS from run to run and a quiet run may read zero.
 *
 * @param {{route:string, kind:string, detail:string, cls?:number}[]} problems
 * @param {{route:string, kind:'cls'|'box', max?:number, reason:string, issue:number}[]} allowlist
 */
export function applyAllowlist(problems, allowlist) {
  const used = new Set();
  const blocking = [];
  const allowed = [];
  for (const p of problems) {
    const i = allowlist.findIndex(
      (a) => a.route === p.route && a.kind === p.kind && (p.kind !== 'cls' || p.cls <= a.max),
    );
    if (i > -1) {
      used.add(i);
      allowed.push(p);
    } else blocking.push(p);
  }
  const stale = allowlist.filter((a, i) => !used.has(i) && a.kind === 'box');
  return { blocking, allowed, stale };
}

export function validateAllowlist(list) {
  if (!Array.isArray(list)) return ['allowlist must be an array'];
  return list.flatMap((a, i) => {
    const bad = [];
    if (!a.route?.startsWith('/')) bad.push('route');
    if (!['cls', 'box'].includes(a.kind)) bad.push('kind');
    if (a.kind === 'cls' && !(a.max > 0)) bad.push('max');
    if (!a.reason) bad.push('reason');
    if (!Number.isInteger(a.issue)) bad.push('issue');
    return bad.length ? [`entry ${i}: bad ${bad.join(', ')}`] : [];
  });
}
