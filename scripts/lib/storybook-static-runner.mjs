/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Serves a built storybook-static/ and drives stories in Chromium. Same serving
 * and launch strategy as scripts/check-storybook-axe.mjs (static server on a
 * random port, Playwright's Chromium with a fallback to the preinstalled one in
 * PLAYWRIGHT_BROWSERS_PATH, default /opt/pw-browsers).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

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
  '.map': 'application/json',
};

export function serve(dir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, rel.endsWith('/') ? `${rel}index.html` : rel);
    if (!file.startsWith(dir + path.sep) && file !== dir) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

export async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    const dirs = fs.existsSync(base)
      ? fs
          .readdirSync(base)
          .filter((d) => /^chromium-\d+$/.test(d))
          .sort()
          .reverse()
      : [];
    for (const d of dirs) {
      const exe = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return chromium.launch({ executablePath: exe });
    }
    throw err;
  }
}

const FREEZE_CSS =
  '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';

/** One page on the preview iframe in light theme; stories are switched over the channel. */
export async function openWorker(context, base) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/iframe.html?viewMode=story&globals=theme:light`, {
    waitUntil: 'load',
    timeout: 45000,
  });
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.waitForFunction(
    () => window.__STORYBOOK_ADDONS_CHANNEL__ && window.__STORYBOOK_PREVIEW__,
    null,
    { timeout: 30000 },
  );
  await page.evaluate(() =>
    window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateGlobals', {
      globals: { theme: 'light', a11y: { manual: true } },
    }),
  );
  return page;
}

/** Resolves to null once the story finished (after play), or to a short error string. */
export function renderStory(page, storyId) {
  return page.evaluate(
    (id) =>
      new Promise((resolve) => {
        const ch = window.__STORYBOOK_ADDONS_CHANNEL__;
        const failures = {
          storyErrored: 'story errored',
          storyThrewException: 'story threw',
          storyMissing: 'story missing',
          playFunctionThrewException: 'play function threw',
        };
        const handlers = [];
        const finish = (err) => {
          for (const [ev, fn] of handlers) ch.off(ev, fn);
          clearTimeout(timer);
          resolve(err);
        };
        const on = (ev, fn) => {
          ch.on(ev, fn);
          handlers.push([ev, fn]);
        };
        on('storyFinished', (arg) => (arg?.storyId ?? arg) === id && finish(null));
        for (const [ev, msg] of Object.entries(failures)) {
          on(ev, (arg) =>
            finish(`${msg}: ${String(arg?.message ?? arg?.title ?? arg ?? '').slice(0, 160)}`),
          );
        }
        const timer = setTimeout(() => finish('timed out waiting for story render'), 20000);
        ch.emit('setCurrentStory', { storyId: id, viewMode: 'story' });
      }),
    storyId,
  );
}

/** Wait for fonts, images and two animation frames so measurements are stable. */
export function settle(page) {
  return page.evaluate(async () => {
    await document.fonts?.ready;
    const imgs = [...document.querySelectorAll('#storybook-root img')];
    await Promise.all(
      imgs.filter((i) => !i.complete).map((i) => new Promise((r) => (i.onload = i.onerror = r))),
    );
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}
