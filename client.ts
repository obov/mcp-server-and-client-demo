import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "tsx",
  args: ["server.ts"],
});

export const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

export async function connectClient() {
  await client.connect(transport);
}

// Call a tool
const result = await client.callTool({
  name: "getWeather",
  arguments: {
    city: "Seoul",
  },
});

console.log(result);
const tools = await client.listTools();
console.log(tools);
await client.close();
