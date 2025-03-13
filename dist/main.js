"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_server_1 = require("./mcp-server");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
// Main function to start the application
async function main() {
    // Create and start MCP server
    const server = (0, mcp_server_1.createMcpServer)();
    const MCP_MODE = process.env.MCP_MODE || 'sse';
    if (MCP_MODE === 'sse') {
        const SSE_PORT = process.env.SSE_PORT || 3002;
        const app = (0, express_1.default)();
        let transport;
        app.get("/sse", async (_req, res) => {
            console.error("Received connection");
            transport = new sse_js_1.SSEServerTransport("/message", res);
            await server.connect(transport);
        });
        app.post("/message", async (req, res) => {
            await transport?.handlePostMessage(req, res);
        });
        app.listen(SSE_PORT, () => {
            console.error(`MCP server is running on port ${SSE_PORT}`);
        });
    }
    else if (MCP_MODE === 'command') {
        try {
            const transport = new stdio_js_1.StdioServerTransport();
            await server.connect(transport);
            console.error('WhatsApp MCP server started successfully');
        }
        catch (error) {
            console.error("Error connecting to MCP server", error);
        }
        process.stdin.on("close", () => {
            console.error("Puppeteer MCP Server closed");
            server.close();
        });
    }
    else {
        throw new Error(`Invalid MCP mode: ${MCP_MODE}`);
    }
}
// Run the application
main();
//# sourceMappingURL=main.js.map