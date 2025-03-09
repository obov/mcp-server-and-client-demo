import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Weather",
  version: "1.0.0",
});

server.tool("getWeather", { city: z.string() }, async ({ city }) => {
  return {
    content: [{ type: "text", text: `weather in ${city} is sunny I hope` }],
  };
});

const transport = new StdioServerTransport();
server.connect(transport);
