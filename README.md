# WhatsApp Web MCP

A powerful bridge between WhatsApp Web and AI models using the Model Context Protocol (MCP). This project enables AI models like Claude to interact with WhatsApp through a standardized interface, making it easy to automate and enhance WhatsApp interactions programmatically.

## Overview

WhatsApp Web MCP provides a seamless integration between WhatsApp Web and AI models by:
- Creating a standardized interface through the Model Context Protocol (MCP)
- Offering MCP Server access to WhatsApp functionality
- Providing flexible deployment options through SSE or Command modes

## Installation

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pnizer/wweb-mcp.git
   cd wweb-mcp
   ```

2. Build with Docker:
   ```bash
   docker build . -t wweb-mcp:latest
   ```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MCP_MODE` | Operation mode (`sse` or `command`) | No | sse |
| `SSE_PORT` | Port for SSE server | No | 3001 |
| `AUTH_STRATEGY` | Authentication strategy (`local` or `none`) | No | `none` |
| `AUTH_DATA_PATH` | Path for authentication data storage | No | `.wwebjs_auth` |
| `QR_CODE_FILE_NAME` | Path to save QR code image | No | - |
| `EAGERLY_INITIALIZE_CLIENT` | Initialize the Whatsapp Web client as soon as the process started | No | `false` |


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

### Starting the Server

1. Command Mode:
   ```bash
   wweb-mcp
   ```

2. SSE Mode:
   ```bash
   export MCP_MODE=sse
   export SSE_PORT=3001
   wweb-mcp
   ```

### Available Tools

| Tool | Description |
|------|-------------|
| `send_message` | Send messages to WhatsApp contacts |
| `get_status` | Check WhatsApp client connection status |
| `search_contacts` | Search for contacts by name or number |

### AI Integration

#### Claude Desktop Integration

1. Execute Docker with `EAGERLY_INITIALIZE_CLIENT=true` so you can scan the QR code and save the
session in the volume. 

```shell
docker run -i -e MCP_MODE=command -e AUTH_STRATEGY=local -e AUTH_DATA_PATH=/wwebjs_auth  EAGERLY_INITIALIZE_CLIENT=true -v wweb-mcp:/wwebjs_auth --rm wweb-mcp:latest
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

2. Restart Claude Desktop
3. The WhatsApp functionality will be available through Claude's interface

### Prompt Templates

The system includes pre-built prompts for common tasks:
- `compose_message`: Generate contextually appropriate messages
- `analyze_conversation`: Analyze chat history and extract insights

## Development

### Project Structure

```
src/
├── whatsapp-client.ts   # WhatsApp Web client implementation
├── server.ts            # REST API server
├── mcp-server.ts        # MCP protocol implementation
└── main.ts              # Application entry point
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
