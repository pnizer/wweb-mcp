import express from 'express';
import { createMcpServer } from './mcp-server';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWhatsAppClient } from './whatsapp-client';

// Main function to start the application
async function main(): Promise<void> {        
    // Create and start MCP server
    const server = createMcpServer();

    const MCP_MODE = process.env.MCP_MODE || 'sse';

    if (MCP_MODE === 'sse') {
      const SSE_PORT = process.env.SSE_PORT || 3002;
      
      const app = express();
      let transport: SSEServerTransport;

      app.get("/sse", async (_req, res) => {
        console.error("Received connection");
        transport = new SSEServerTransport("/message", res);
        await server.connect(transport);
      });
      
      app.post("/message", async (req, res) => {
        await transport?.handlePostMessage(req, res);
      });

      app.listen(SSE_PORT, () => {
        console.error(`MCP server is running on port ${SSE_PORT}`);
      });
    } else if (MCP_MODE === 'command') {
      try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('WhatsApp MCP server started successfully');

      } catch (error) {
        console.error("Error connecting to MCP server", error);
      }

      process.stdin.on("close", () => {
        console.error("Puppeteer MCP Server closed");
        server.close();
      });

    } else {
      throw new Error(`Invalid MCP mode: ${MCP_MODE}`);
    }
}

// Run the application
main();