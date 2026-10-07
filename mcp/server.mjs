/**
 * The `hds` MCP server's protocol layer: JSON-RPC 2.0 messages in, responses out.
 *
 * Interface: `createServer({ tools, instructions })` returns `handle(message)`,
 * which takes one parsed JSON-RPC message and returns the response object, or
 * `null` for a notification. Transport (stdio framing) lives in hds-mcp.mjs, the
 * tool behaviour in catalog.mjs; this module only speaks MCP.
 *
 * No dependency on @modelcontextprotocol/sdk: the server needs four methods
 * (initialize, ping, tools/list, tools/call), and a zero-dependency module keeps
 * the published package's install graph unchanged.
 */

export const SERVER_INFO = { name: 'hds', version: '0' };

/** Protocol versions this server can speak; it echoes the client's when it is one of these. */
const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

/**
 * @param {{ version?: string, instructions: string, tools: { name: string, description: string, inputSchema: object, run: (args: object) => unknown }[] }} options
 */
export function createServer({ version = SERVER_INFO.version, instructions, tools }) {
  const byName = new Map(tools.map((t) => [t.name, t]));

  return function handle(message) {
    const { id, method, params = {} } = message ?? {};
    const isNotification = id === undefined || id === null;
    if (isNotification) return null;

    switch (method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        return rpcResult(id, {
          protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { ...SERVER_INFO, version },
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
        const tool = byName.get(params.name);
        if (!tool) return rpcError(id, -32602, `Unknown tool: ${params.name}`);
        try {
          const data = tool.run(params.arguments ?? {});
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
  };
}
