# WhatsApp Web MCP

A powerful bridge between WhatsApp Web and AI models using the Model Context Protocol (MCP). This project enables AI models like Claude to interact with WhatsApp through a standardized interface, making it easy to automate and enhance WhatsApp interactions programmatically.

## Overview

WhatsApp Web MCP provides a seamless integration between WhatsApp Web and AI models by:
- Creating a standardized interface through the Model Context Protocol (MCP)
- Offering MCP Server access to WhatsApp functionality
- Providing flexible deployment options through SSE or Command modes
- Supporting both direct WhatsApp client integration and API-based connectivity

## Installation

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pnizer/wweb-mcp.git
   cd wweb-mcp
   ```

2. Install globally or use with npx:
   ```bash
   # Install globally
   npm install -g .
   
   # Or use with npx directly
   npx .
   ```

3. Build with Docker:
   ```bash
   docker build . -t wweb-mcp:latest
   ```

## Configuration

### Command Line Options

| Option | Alias | Description | Choices | Default |
|--------|-------|-------------|---------|---------|
| `--mode` | `-m` | Run mode | `mcp`, `whatsapp-api` | `mcp` |
| `--mcp-mode` | `-c` | MCP connection mode | `standalone`, `api` | `standalone` |
| `--transport` | `-t` | MCP transport mode | `sse`, `command` | `sse` |
| `--sse-port` | `-p` | Port for SSE server | - | `3002` |
| `--api-port` | - | Port for WhatsApp API server | - | `3001` |
| `--qr-code-file` | `-q` | File to save QR code to | - | - |
| `--auth-data-path` | `-a` | Path to store authentication data | - | `.wwebjs_auth` |
| `--auth-strategy` | `-s` | Authentication strategy | `local`, `none` | `local` |
| `--api-base-url` | `-b` | API base URL for MCP when using api mode | - | `http://localhost:3001/api` |

### Authentication Methods

#### Local Authentication (Recommended)
```bash
export AUTH_STRATEGY=local
export AUTH_DATA_PATH=/path/to/auth/storage
```
- Scan QR code once
- Credentials persist between sessions
- More stable for long-term operation

#### No Authentication
- Default method
- Requires QR code scan on each startup
- Suitable for testing and development

## Usage

### Running Modes

#### WhatsApp API Server
Run a standalone WhatsApp API server that exposes WhatsApp functionality through REST endpoints:
```bash
npx wweb-mcp --mode whatsapp-api --api-port 3001
```

#### MCP Server (Standalone)
Run an MCP server that directly connects to WhatsApp Web:
```bash
npx wweb-mcp --mode mcp --mcp-mode standalone --transport sse --sse-port 3002
```

#### MCP Server (API Client)
Run an MCP server that connects to the WhatsApp API server:
```bash
npx wweb-mcp --mode mcp --mcp-mode api --api-base-url http://localhost:3001/api --transport sse --sse-port 3002
```

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_status` | Check WhatsApp client connection status | None |
| `send_message` | Send messages to WhatsApp contacts | `number`: Phone number to send to<br>`message`: Text content to send |
| `search_contacts` | Search for contacts by name or number | `query`: Search term to find contacts |
| `get_messages` | Retrieve messages from a specific chat | `number`: Phone number to get messages from<br>`limit` (optional): Number of messages to retrieve |
| `get_chats` | Get a list of all WhatsApp chats | None |

### Available Resources

| Resource URI | Description |
|--------------|-------------|
| `whatsapp://contacts` | List of all WhatsApp contacts |
| `whatsapp://messages/{number}` | Messages from a specific chat |
| `whatsapp://chats` | List of all WhatsApp chats |

### AI Integration

#### Claude Desktop Integration

1. Execute Docker to scan the QR code and save the session in the volume:

```shell
docker run -i -e MCP_MODE=command -e AUTH_STRATEGY=local -e AUTH_DATA_PATH=/wwebjs_auth -v wweb-mcp:/wwebjs_auth --rm wweb-mcp:latest
```

2. Add the following to your Claude Desktop configuration:
```json
{
    "mcpServers": {
        "whatsapp": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "-e", "MCP_MODE=command",
                "-e", "AUTH_STRATEGY=local",
                "-e", "AUTH_DATA_PATH=/wwebjs_auth",
                "-v", "wweb-mcp:/wwebjs_auth",
                "--rm",
                "wweb-mcp:latest"
            ]
        }
    }
}
```

3. Restart Claude Desktop
4. The WhatsApp functionality will be available through Claude's interface

### Prompt Templates

The system includes pre-built prompts for common tasks:
- `compose_message`: Generate contextually appropriate messages
- `analyze_conversation`: Analyze chat history and extract insights

## Architecture

The project is structured with a clean separation of concerns:

### Components

1. **WhatsAppService**: Core business logic for interacting with WhatsApp
2. **WhatsAppApiClient**: Client for connecting to the WhatsApp API server
3. **API Router**: Express routes for the REST API
4. **MCP Server**: Model Context Protocol implementation

### Deployment Options

1. **WhatsApp API Server**: Standalone REST API server
2. **MCP Server (Standalone)**: Direct connection to WhatsApp Web
3. **MCP Server (API Client)**: Connection to WhatsApp API server

This architecture allows for flexible deployment scenarios, including:
- Running the API server and MCP server on different machines
- Using the MCP server as a client to an existing API server
- Running everything on a single machine for simplicity

## Development

### Project Structure

```
src/
├── whatsapp-client.ts     # WhatsApp Web client implementation
├── whatsapp-service.ts    # Core business logic
├── whatsapp-api-client.ts # Client for the WhatsApp API
├── api.ts                 # REST API router
├── mcp-server.ts          # MCP protocol implementation
└── main.ts                # Application entry point
```

### Building from Source
```bash
npm run build
```

## Troubleshooting

### Common Issues

1. QR Code Not Scanning
   - Ensure your phone has a stable internet connection
   - Try clearing WhatsApp Web data on your phone
   - Restart the server and try again

2. Authentication Failures
   - Check if AUTH_DATA_PATH is writable
   - Clear the auth directory and re-authenticate
   - Verify WhatsApp Web is not connected to other devices

3. Connection Drops
   - Ensure stable internet connectivity
   - Check if phone is connected to the internet
   - Verify WhatsApp is running on your phone

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

Please ensure your PR:
- Follows the existing code style
- Includes appropriate tests
- Updates documentation as needed
- Describes the changes in detail

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
