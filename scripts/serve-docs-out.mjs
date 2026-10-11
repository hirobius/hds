#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Serves the built docs site (docs-site/out) on a fixed port for the Playwright
 * visual spec (tests/visual/docs-demos.spec.ts).
 * Usage: node scripts/serve-docs-out.mjs [--port 4173] [--dir docs-site/out]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './lib/docs-axe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const dir = path.resolve(ROOT, arg('dir', 'docs-site/out'));
const { port } = await serveStatic(dir, Number(arg('port', 4173)));
console.log(`serving ${path.relative(ROOT, dir)} at http://127.0.0.1:${port}`);
