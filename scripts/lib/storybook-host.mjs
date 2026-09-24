/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * storybook-host — serve storybook-static and find a Chromium to render it.
 *
 * Both the rendered-geometry gate and the reference site need the same two
 * things, and both grew their own copy of a static file server, a MIME table
 * and a Chromium path. Two copies of a literal is one that can be wrong; the
 * path in particular is an image detail (/opt/pw-browsers/chromium-<build>)
 * that moves when the container image does, and fixing it in one place while
 * missing the other is the obvious failure.
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const MIME = Object.freeze({
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
});

/**
 * Where a Chromium might be, most specific first. The env var wins so a
 * machine whose Playwright build disagrees with the installed browser can say
 * so; `undefined` at the end means "let Playwright use its own download".
 */
export function chromiumPath() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

/** Launch options for Playwright, empty when no pinned browser was found. */
export async function launchChromium() {
  const { chromium } = await import('playwright');
  const executablePath = chromiumPath();
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** True when there is a built Storybook to serve. */
export const hasStorybookBuild = (root) =>
  existsSync(path.join(root, 'storybook-static', 'index.json'));

/**
 * Serve storybook-static on an ephemeral port.
 * Returns `{ server, baseUrl, close() }`, or null when nothing is built.
 */
export async function serveStorybook(root) {
  const dir = path.join(root, 'storybook-static');
  if (!hasStorybookBuild(root)) return null;

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, urlPath);
    // Never serve outside the build, whatever the request path claims.
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { server, baseUrl, close: () => server.close() };
}

/** The canonical story URL, so the two callers cannot build it differently. */
export const storyUrl = (baseUrl, id) =>
  `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
