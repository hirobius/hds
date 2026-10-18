/** @internal — pure helpers for scripts/check-docs-axe.mjs (docs-site axe gate). */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

/** The live-demo wrapper rendered by docs-site/components/component-demos.tsx (DemoFrame). */
export const DEMO_SELECTOR = '.hds-demo-frame';
export const PAGE_SECTIONS = ['components', 'patterns'];

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
