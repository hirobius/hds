/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * A minimal static server for the exported docs site (docs-site/out), for the
 * walkthrough recorder (hds#1148). Resolves /docs/foo to foo.html the way the
 * static host does (next.config.mjs: trailingSlash false). Range requests are
 * served so the embedded <video> can seek.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/** Map a URL path to a file under root, or null. */
export function resolveFile(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/';
  const base = path.join(root, path.normalize(clean));
  if (!base.startsWith(root)) return null;
  for (const candidate of [base, `${base}.html`, path.join(base, 'index.html')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Start serving root on a free port; resolves to { url, close, setPage }.
 * setPage(route, html) serves an in-memory page (the terminal panels) from the
 * same origin, so it can load the site's stylesheets and fonts.
 */
export function serve(root) {
  const abs = path.resolve(root);
  const pages = new Map();
  const server = createServer((req, res) => {
    const route = (req.url ?? '/').split('?')[0];
    if (pages.has(route)) {
      res.writeHead(200, { 'content-type': TYPES['.html'] }).end(pages.get(route));
      return;
    }
    const file = resolveFile(abs, req.url ?? '/');
    if (!file) {
      res.writeHead(404).end('not found');
      return;
    }
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const { size } = statSync(file);
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, {
        'content-type': type,
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
        'content-length': end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        setPage: (route, html) => pages.set(route, html),
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
