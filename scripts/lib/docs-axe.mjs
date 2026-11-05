/** @internal — pure helpers for scripts/check-docs-axe.mjs (docs-site axe gate). */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

/** The live-demo wrapper rendered by docs-site/components/component-demos.tsx (DemoFrame). */
export const DEMO_SELECTOR = '.hds-demo-frame';
export const PAGE_SECTIONS = ['components', 'patterns'];
/** Every other /docs page (guides, engineering, section landings, foundations…): scanned across the whole <main> (hds#710). */
export const MAIN_SELECTOR = 'main';

/** Demo pages (components/patterns leaves) scan their frame, every other page <main>. */
const DEMO_ROUTE = new RegExp(`^/docs/(${PAGE_SECTIONS.join('|')})/[^/]+$`);
export function selectorFor(route) {
  return DEMO_ROUTE.test(route) ? DEMO_SELECTOR : MAIN_SELECTOR;
}

export const SITE_NAME = 'Hirobius Design System';

/**
 * The home page says the full name once, as its H1; the chrome uses "HDS" and
 * "Overview" (hds#845). Given the page's visible text (innerText of <body>), returns a
 * violation in the axe shape when the name repeats on /docs, else null.
 */
export function siteNameRepeats(route, text) {
  if (route !== '/docs') return null;
  const count = text.split(SITE_NAME).length - 1;
  return count > 1
    ? {
        id: 'site-name-repeated',
        impact: 'serious',
        nodes: count,
        help: `"${SITE_NAME}" appears ${count} times in the home page's visible text; keep it to the H1`,
      }
    : null;
}

/**
 * Route paths for every built /docs page that is not a component or pattern leaf
 * (those are discoverPages): /docs itself, the section landings and all nested pages.
 */
export function discoverMainPages(outDir) {
  const root = path.join(outDir, 'docs');
  const routes = new Set();
  const walk = (dir, route) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        walk(path.join(dir, e.name), `${route}/${e.name}`);
      } else if (e.name === 'index.html') {
        routes.add(route);
      } else if (e.name.endsWith('.html')) {
        routes.add(`${route}/${e.name.slice(0, -5)}`);
      }
    }
  };
  walk(root, '/docs');
  // The /docs landing is built as out/docs.html, a sibling of docs/ (cleanUrls), not docs/index.html.
  if (
    ['docs.html', path.join('docs', 'index.html')].some((f) => fs.existsSync(path.join(outDir, f)))
  ) {
    routes.add('/docs');
  }
  return [...routes].filter((r) => !DEMO_ROUTE.test(r)).sort();
}

/** Demo pages and every other /docs page. The visual spec keeps discoverPages: it has no demo frame. */
export function discoverAxeRoutes(outDir) {
  return [...discoverPages(outDir), ...discoverMainPages(outDir)].sort();
}

/**
 * Route paths (e.g. "/docs/components/button") for every built page under
 * <outDir>/docs/{components,patterns}/<slug>.html or <slug>/index.html.
 * The section index pages are excluded: they list demos, they are not one.
 */
export function discoverPages(outDir) {
  const routes = new Set();
  for (const section of PAGE_SECTIONS) {
    const dir = path.join(outDir, 'docs', section);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.html') && name.name !== 'index.html') {
        routes.add(`/docs/${section}/${name.name.slice(0, -5)}`);
      } else if (name.isDirectory() && fs.existsSync(path.join(dir, name.name, 'index.html'))) {
        routes.add(`/docs/${section}/${name.name}`);
      }
    }
  }
  return [...routes].sort();
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Static server; /a/b resolves to a/b, a/b.html, then a/b/index.html (cleanUrls). */
export function serveStatic(dir, port = 0) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidates = rel.endsWith('/')
      ? [path.join(rel, 'index.html')]
      : [rel, `${rel}.html`, path.join(rel, 'index.html')];
    const file = candidates
      .map((c) => path.join(dir, c))
      .find((f) => f.startsWith(dir + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
