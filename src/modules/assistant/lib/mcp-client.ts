
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL || "https://mcp-hono-production.up.railway.app";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

let mcpClientInstance: MCPClient | null = null;
let connectionPromise: Promise<MCPClient> | null = null;

export async function getMCPClient(): Promise<MCPClient> {
  if (connectionPromise) {
    return connectionPromise;
  }

  if (mcpClientInstance) {
    return mcpClientInstance;
  }

  connectionPromise = createMCPClient({
    transport: {
      type: "http",
      url: `${MCP_SERVER_URL}/mcp`,
      headers: {
        ...(MCP_API_KEY ? { Authorization: `Bearer ${MCP_API_KEY}` } : {}),
      },
    },
  });

  try {
    mcpClientInstance = await connectionPromise;
    return mcpClientInstance;
  } finally {
    connectionPromise = null;
  }
}

export async function closeMCPClient(): Promise<void> {
  if (mcpClientInstance) {
    await mcpClientInstance.close();
    mcpClientInstance = null;
  }
}

export async function getMCPTools() {
  const client = await getMCPClient();
  return client.tools();
}

export async function readMCPResource(uri: string) {
  const client = await getMCPClient();
  return client.readResource({ uri });
}

export async function listMCPResources() {
  const client = await getMCPClient();
  return client.listResources();
}
