/**
 * Integration test for the `hds-mcp` stdio server (mcp/hds-mcp.mjs).
 *
 * The seam under test is the process boundary a consumer's agent uses: spawn the
 * bin, write newline-delimited JSON-RPC 2.0 to stdin, read responses from stdout.
 * Nothing inside the server is imported, so a refactor that keeps the protocol
 * keeps these tests green.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'mcp', 'hds-mcp.mjs');

/** Budget per tool result, the size the server promises (compact, never the manifest). */
const MAX_RESULT_BYTES = 2048;

function startServer() {
  const child = spawn(process.execPath, [BIN], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let buffer = '';
  let nextId = 1;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      const waiter = pending.get(msg.id);
      if (waiter) {
        pending.delete(msg.id);
        waiter(msg);
      }
    }
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 5000);
      pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  const notify = (method, params) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  return { child, request, notify };
}

/** Calls a tool and returns { bytes, data } where data is the parsed JSON text content. */
async function callTool(server, name, args) {
  const res = await server.request('tools/call', { name, arguments: args });
  expect(res.error).toBeUndefined();
  const text = res.result.content[0].text;
  return { res, bytes: Buffer.byteLength(text), data: JSON.parse(text) };
}

describe('hds-mcp over stdio', () => {
  let server;

  beforeAll(async () => {
    server = startServer();
    const init = await server.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'vitest', version: '0' },
    });
    server.init = init;
    server.notify('notifications/initialized');
  });

  afterAll(() => {
    server?.child.kill();
  });

  it('answers initialize with the hds server info and the tools capability', () => {
    const { result } = server.init;
    expect(result.serverInfo.name).toBe('hds');
    expect(result.protocolVersion).toBe('2025-06-18');
    expect(result.capabilities.tools).toBeDefined();
    expect(typeof result.instructions).toBe('string');
  });

  it('lists the four lookup tools, each with an input schema', async () => {
    const res = await server.request('tools/list', {});
    const names = res.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['get_component', 'list_core', 'search_components', 'search_tokens']);
    for (const tool of res.result.tools) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('search_components ranks the pattern for a purpose first, with its import path', async () => {
    const { bytes, data } = await callTool(server, 'search_components', {
      query: 'row of headline numbers',
    });
    expect(bytes).toBeLessThan(MAX_RESULT_BYTES);
    expect(data.results[0]).toMatchObject({
      name: 'MetricTiles',
      import: '@hirobius/design-system/patterns',
    });
    expect(data.results.length).toBeLessThanOrEqual(8);
  });

  it('search_components finds a root component by name', async () => {
    const { data } = await callTool(server, 'search_components', { query: 'textarea' });
    expect(data.results[0]).toMatchObject({ name: 'Textarea', import: '@hirobius/design-system' });
  });

  it('get_component returns the usage contract, props and the guide line for a pattern', async () => {
    const { bytes, data } = await callTool(server, 'get_component', { name: 'DataTableSection' });
    expect(bytes).toBeLessThan(MAX_RESULT_BYTES);
    expect(data.name).toBe('DataTableSection');
    expect(data.import).toBe('@hirobius/design-system/patterns');
    expect(data.props).toEqual(
      expect.arrayContaining([expect.stringMatching(/^rows: DataTableSectionRow\[\]/)]),
    );
    expect(data.guide[0].need).toMatch(/table/i);
  });

  it('get_component steers a commonly confused component to the guide answer', async () => {
    const { data } = await callTool(server, 'get_component', { name: 'Stat' });
    expect(data.insteadFor).toEqual(
      expect.arrayContaining([expect.objectContaining({ use: 'MetricTiles' })]),
    );
    const dialog = await callTool(server, 'get_component', { name: 'dialog' });
    expect(dialog.data.name).toBe('Dialog');
    expect(dialog.data.parts).toEqual(expect.arrayContaining(['Dialog.Content']));
    expect(dialog.data.insteadFor).toEqual(
      expect.arrayContaining([expect.objectContaining({ use: 'AlertDialog' })]),
    );
  });

  it('get_component reports an unknown name as a tool error with suggestions', async () => {
    const res = await server.request('tools/call', {
      name: 'get_component',
      arguments: { name: 'MetricTyles' },
    });
    expect(res.result.isError).toBe(true);
    const { error } = JSON.parse(res.result.content[0].text);
    expect(error).toMatch(/No component named "MetricTyles"\. Did you mean: MetricTile/);
  });

  it('every core component fits the per-call budget', async () => {
    const { data } = await callTool(server, 'list_core', {});
    for (const name of [...data.root, ...data.patterns]) {
      const { bytes } = await callTool(server, 'get_component', { name });
      expect(bytes, name).toBeLessThan(MAX_RESULT_BYTES);
    }
  });

  it('search_tokens returns one token in full for an exact path', async () => {
    const { data } = await callTool(server, 'search_tokens', {
      query: 'semantic.color.surface.page',
    });
    expect(data.token).toMatchObject({
      path: 'semantic.color.surface.page',
      cssVar: '--semantic-color-surface-page',
      value: '#ffffff',
      dark: '#000000',
      type: 'color',
    });
  });

  it('search_tokens lists a prefix compactly, semantic tier only for a semantic prefix', async () => {
    const { bytes, data } = await callTool(server, 'search_tokens', { query: 'semantic.space' });
    expect(bytes).toBeLessThan(MAX_RESULT_BYTES);
    expect(data.results.length).toBeGreaterThan(5);
    expect(data.results.every((t) => t.path.startsWith('semantic.space.'))).toBe(true);
    expect(data.results[0]).toEqual(
      expect.objectContaining({ cssVar: expect.stringMatching(/^--semantic-space-/) }),
    );
  });

  it('search_tokens stays under budget for a broad query and says how many it left out', async () => {
    const { bytes, data } = await callTool(server, 'search_tokens', { query: 'color', limit: 40 });
    expect(bytes).toBeLessThan(MAX_RESULT_BYTES);
    expect(data.total).toBeGreaterThan(data.results.length);
    expect(data.more).toBe(data.total - data.results.length);
  });

  it('list_core names the preferred components by import path and omits prune candidates', async () => {
    const { bytes, data } = await callTool(server, 'list_core', {});
    expect(bytes).toBeLessThan(MAX_RESULT_BYTES);
    expect(data.patterns).toEqual(
      expect.arrayContaining([
        'DataTableSection',
        'FormActions',
        'MetricTiles',
        'Page',
        'PageHeader',
      ]),
    );
    expect(data.root).toEqual(expect.arrayContaining(['AlertDialog', 'Badge', 'Button', 'Tabs']));
    expect(data.root).not.toContain('Stat');
    expect(data.root).not.toContain('CardMetric');
    expect(data.hooks).toContain('useToast');
  });

  it('answers ping and rejects an unknown method with -32601', async () => {
    expect((await server.request('ping', {})).result).toEqual({});
    expect((await server.request('resources/list', {})).error.code).toBe(-32601);
  });
});
