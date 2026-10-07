/**
 * The `hds` MCP server's protocol layer: JSON-RPC 2.0 messages in, responses out.
 *
 * Interface: `createServer({ version, instructions, tools })` returns
 * `handle(message)`, which takes one parsed JSON value and returns the response
 * object, or `null` for a notification. It never throws: a message that is not a
 * request object gets -32600, and anything unexpected inside gets -32603, so one
 * bad line cannot stop the process. Transport (stdio framing) lives in hds-mcp.mjs, the
 * tool behaviour in catalog.mjs; this module only speaks MCP.
 *
 * No dependency on @modelcontextprotocol/sdk: the server needs four methods
 * (initialize, ping, tools/list, tools/call), and a zero-dependency module keeps
 * the published package's install graph unchanged.
 */

export const SERVER_NAME = 'hds';

/** Protocol versions this server can speak; it echoes the client's when it is one of these. */
const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

/**
 * @param {{ version: string, instructions: string, tools: { name: string, description: string, inputSchema: object, run: (args: object) => unknown }[] }} options
 */
export function createServer({ version, instructions, tools }) {
  const byName = new Map(tools.map((t) => [t.name, t]));

  function dispatch(message) {
    // MCP has no batches (removed in 2025-06-18), so an array is invalid like any non-object.
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return rpcError(null, -32600, 'Invalid Request: expected one JSON-RPC request object');
    }
    const hasId = Object.prototype.hasOwnProperty.call(message, 'id');
    const id = hasId ? message.id : null;
    if (typeof message.method !== 'string') {
      return hasId ? rpcError(id, -32600, 'Invalid Request: method must be a string') : null;
    }
    // A message without an `id` member is a notification; `id: null` is still a request.
    if (!hasId) return null;
    const { method } = message;
    const params = message.params && typeof message.params === 'object' ? message.params : {};

    switch (method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        return rpcResult(id, {
          protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version },
          instructions,
        });
      }
      case 'ping':
        return rpcResult(id, {});
      case 'tools/list':
        return rpcResult(id, {
          tools: tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
        });
      case 'tools/call': {
        const tool = typeof params.name === 'string' ? byName.get(params.name) : undefined;
        if (!tool) return rpcError(id, -32602, `Unknown tool: ${params.name}`);
        try {
          const args =
            params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
          const data = tool.run(args);
          return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data) }] });
        } catch (err) {
          // A tool-level failure is a result with isError, so the agent can read and recover.
          return rpcResult(id, {
            content: [{ type: 'text', text: JSON.stringify({ error: String(err.message) }) }],
            isError: true,
          });
        }
      }
      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  return function handle(message) {
    try {
      return dispatch(message);
    } catch (err) {
      const id = message && typeof message === 'object' && 'id' in message ? message.id : null;
      return rpcError(id ?? null, -32603, `Internal error: ${err?.message ?? err}`);
    }
  };
}
