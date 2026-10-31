#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
// hds#972: the Next static export inlines its RSC payload and theme script, so
// docs-site's header CSP used to need script-src 'unsafe-inline'. At
// docs:publish this hashes every inline <script> per page and writes a
// <meta http-equiv="Content-Security-Policy"> (script-src with sha256 hashes) as the first child of <head>. The vercel.json header keeps the
// other directives and no default-src/script-src (either would block the inline
// scripts, since both policies are enforced).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const NON_EXEC_TYPE =
  /\btype\s*=\s*["']?(?!(?:text|application)\/(?:java|ecma)script|module)[^"'\s>]+/i;

export const SCRIPT_CSP_META = 'Content-Security-Policy';

/** sha256 CSP sources of every inline, executable <script> in `html`. */
export function inlineScriptHashes(html) {
  const out = [];
  for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
    if (/\bsrc\s*=/i.test(attrs) || NON_EXEC_TYPE.test(attrs)) continue;
    const h = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    if (!out.includes(h)) out.push(h);
  }
  return out;
}

/** `html` with a per-page script CSP meta first in <head> (idempotent). */
export function injectCspMeta(html) {
  const stripped = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '');
  // script-src only: a meta default-src would also clamp styles/images, since
  // the header and meta policies are both enforced.
  const csp = ['script-src', "'self'", ...inlineScriptHashes(stripped)].join(' ');
  const meta = `<meta http-equiv="${SCRIPT_CSP_META}" content="${csp}">`;
  return stripped.replace(/<head(\s[^>]*)?>/i, (m) => m + meta);
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? 'docs-site/out');
  let n = 0;
  for (const file of htmlFiles(dir)) {
    const html = readFileSync(file, 'utf8');
    if (!/<head(\s[^>]*)?>/i.test(html)) throw new Error(`hash-docs-csp: no <head> in ${file}`);
    writeFileSync(file, injectCspMeta(html));
    n++;
  }
  console.log(`hash-docs-csp: hashed inline scripts in ${n} page(s) under ${dir}`);
}
