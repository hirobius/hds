/**
 * Static pre-render script.
 *
 * Run after `vite build` + `vite build --ssr src/entry-server.tsx`:
 *   node scripts/prerender.mjs
 *
 * For each route, renders the page to an HTML string (full docs shell — the
 * client and SSR share one route tree), injects it into dist/index.html
 * (replacing the empty <div id="root">), swaps in per-page <title>/<meta>
 * tags, and writes a route-specific HTML file so the host serves a populated
 * shell before any JS executes.
 *
 * Cleans up the .ssr-cache/ server bundle after completion.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SSR_CACHE = join(ROOT, '.ssr-cache');

// ── Browser global polyfills ───────────────────────────────────────────────
// Required for ThemeContext (osPrefersDark already guarded), HDSDocPrimitives
// (useIsMobile already guarded), and any other component that touches
// window/localStorage in a useState initializer rather than useEffect.
// useEffect never runs during renderToString, so we only need init-time shims.
//
// NOTE: document is intentionally NOT polyfilled. Components that call
// createPortal guard with `if (typeof document === 'undefined') return null`
// — polyfilling document bypasses those guards and causes React SSR to throw
// "Portals are not currently supported by the server renderer."

const noop = () => {};
const mockStorage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop };

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver;

globalThis.window = {
  innerWidth: 1440,
  innerHeight: 900,
  scrollY: 0,
  scrollTo: noop,
  addEventListener: noop,
  removeEventListener: noop,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  location: { pathname: '/', search: '', hash: '' },
  localStorage: mockStorage,
  ResizeObserver: MockResizeObserver,
};
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { serviceWorker: null },
    writable: true,
  });
} catch {
  /* already defined */
}

// ── Route table ─────────────────────────────────────────────────────────────

const SITE_ORIGIN = 'https://adrianmilsap.com';
const SITE_NAME = 'Hirobius Design System';
const DEFAULT_OG_IMAGE = '/assets/xds-overview.webp';

// The registry drives per-page titles + descriptions. Its paths use the
// monorepo /hds/* prefix; map them to the standalone root scheme.
const toAppPath = (p) => (p === '/hds' ? '/' : p.startsWith('/hds/') ? p.slice(4) : p);
const registry = JSON.parse(
  readFileSync(join(ROOT, 'src', 'app', 'data', 'hds-registry.json'), 'utf8'),
);
const registryByPath = new Map(registry.map((e) => [toAppPath(e.path), e]));

// Doc routes to pre-render. Each gets the full shell SSR'd for a non-blank
// first paint; the lazy page body hydrates on the client.
const PRERENDER_PATHS = [
  '/color',
  '/typography',
  '/spacing',
  '/shape',
  '/elevation',
  '/motion',
  '/breakpoints',
  '/tokens',
  '/icons',
  '/components/actions',
  '/components/inputs',
  '/components/display',
  '/components/feedback',
  '/components/navigation',
  '/components/layout',
  '/getting-started',
  '/guidance',
  '/scope',
  '/system-contract',
  '/contribution-guide',
  '/brand-theming',
  '/sandbox',
  '/info',
];

function titleFor(path) {
  const name = registryByPath.get(path)?.page ?? path.replace(/^\//, '').replace(/\//g, ' / ');
  return `${name} — ${SITE_NAME}`;
}

function descFor(path) {
  return (
    registryByPath.get(path)?.summary ??
    'Token-governed React components, foundations, and documentation for the Hirobius Design System.'
  );
}

const ROUTES = [
  // Home: render the default landing route (/color) into index.html so the root
  // URL and the SPA fallback both paint the shell instead of a blank page.
  {
    url: '/',
    renderUrl: '/color',
    outFile: 'index.html',
    title: SITE_NAME,
    description: descFor('/color'),
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
  ...PRERENDER_PATHS.map((path) => ({
    url: path,
    outFile: `${path.replace(/^\//, '')}/index.html`,
    title: titleFor(path),
    description: descFor(path),
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'article',
  })),
];

// ── HTML helpers ──────────────────────────────────────────────────────────

function injectIntoShell(shell, routeMeta, bodyHtml) {
  const { url, title, description, ogImage, ogType, noindex } = routeMeta;
  const canonical = `${SITE_ORIGIN}${url === '/' ? '' : url}`;
  const absOgImage = `${SITE_ORIGIN}${ogImage}`;

  let html = shell;

  // Replace <title> — works whether the shell is a fresh Vite build or a
  // previous prerender (Vite's HTML pipeline strips comment markers, so we
  // can't rely on them surviving into dist/).
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

  // Strip any previously-injected per-route meta tags (idempotent across re-runs)
  html = html
    .replace(/\n?\s*<meta name="robots"[^>]*>/g, '')
    .replace(/\n?\s*<meta name="description"[^>]*>/g, '')
    .replace(/\n?\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\n?\s*<meta property="og:[^"]*"[^>]*>/g, '')
    .replace(/\n?\s*<meta name="twitter:[^"]*"[^>]*>/g, '');

  // Inject fresh meta block immediately before </head>
  const metaBlock = [
    noindex ? `    <meta name="robots" content="noindex" />` : null,
    `    <meta name="description" content="${description}" />`,
    `    <link rel="canonical" href="${canonical}" />`,
    `    <meta property="og:type" content="${ogType}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:image" content="${absOgImage}" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:url" content="${canonical}" />`,
    `    <meta property="og:site_name" content="${SITE_NAME}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <meta name="twitter:image" content="${absOgImage}" />`,
  ]
    .filter(Boolean)
    .join('\n');
  html = html.replace('</head>', `${metaBlock}\n  </head>`);

  // Inject pre-rendered body into #root
  html = html.replace(
    /<div id="root"><\/div>|<div id="root">[\s\S]*?<\/div>(?=\s*<script)/,
    `<div id="root">${bodyHtml}</div>`,
  );

  return html;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const serverBundle = join(SSR_CACHE, 'entry-server.js');
  if (!existsSync(serverBundle)) {
    console.error(`SSR bundle not found: ${serverBundle}`);
    console.error('Run `vite build --ssr src/entry-server.tsx --outDir .ssr-cache` first.');
    process.exit(1);
  }

  const { render } = await import(serverBundle);

  const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

  for (const route of ROUTES) {
    let bodyHtml = '';
    try {
      bodyHtml = render(route.renderUrl ?? route.url);
    } catch (err) {
      console.warn(`⚠  render() failed for ${route.url}: ${err.message}. Writing shell-only HTML.`);
    }

    const html = injectIntoShell(shell, route, bodyHtml);
    const outPath = join(DIST, route.outFile);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf8');
    console.log(`✓  ${route.url}  →  dist/${route.outFile}`);
  }

  // Clean up server bundle — not needed at runtime, shouldn't be served
  rmSync(SSR_CACHE, { recursive: true, force: true });
  console.log('✓  Cleaned .ssr-cache');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
