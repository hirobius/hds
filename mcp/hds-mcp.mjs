#!/usr/bin/env node
/**
 * hds-mcp — the `hds` MCP server over stdio, shipped in @hirobius/design-system.
 *
 * Run from an app that has the package installed:  npx hds-mcp
 * Without an install:  npx -y -p @hirobius/design-system hds-mcp
 *
 * Reads the data the package already ships (public/hds-manifest.json,
 * src/app/data/component-api.json) from its own install directory; it never
 * touches the network or the caller's files. Messages are newline-delimited
 * JSON-RPC 2.0 (the MCP stdio transport); logs go to stderr only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './catalog.mjs';
import { createServer } from './server.mjs';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

let catalog;
try {
  catalog = loadCatalog(PKG_ROOT);
} catch (err) {
  console.error(
    `hds-mcp: could not read the design-system data under ${PKG_ROOT} (${err.message}).\n` +
      '  Reinstall @hirobius/design-system; in the hds repo run `node scripts/generate-component-api.mjs` first.',
  );
  process.exit(1);
}

const handle = createServer({ version, instructions: catalog.instructions, tools: catalog.tools });

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);

createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  const response = handle(message);
  if (response) send(response);
});
