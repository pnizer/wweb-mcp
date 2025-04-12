# WhatsApp Web MCP

[![PR Checks](https://github.com/pnizer/wweb-mcp/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/pnizer/wweb-mcp/actions/workflows/pr-checks.yml)

A Node.js application that connects WhatsApp Web with AI models through the Model Context Protocol (MCP). This project provides a standardized interface for programmatic interaction with WhatsApp, enabling automated messaging, contact management, and group chat functionality through AI-driven workflows.

## Overview

WhatsApp Web MCP provides a seamless integration between WhatsApp Web and AI models by:

- Creating a standardized interface through the Model Context Protocol (MCP)
- Offering MCP Server access to WhatsApp functionality
- Providing flexible deployment options through SSE or Command modes
- Supporting both direct WhatsApp client integration and API-based connectivity

## Disclaimer

**IMPORTANT**: This tool is for testing purposes only and should not be used in production environments.

Disclaimer from WhatsApp Web project:

> This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp or any of its subsidiaries or its affiliates. The official WhatsApp website can be found at whatsapp.com. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners. Also it is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.

## Learning Resources

To learn more about using WhatsApp Web MCP in real-world scenarios, check out these articles:

- [**Integrating WhatsApp with AI: Guide to Setting Up a WhatsApp MCP server**](https://medium.com/@pnizer/integrating-whatsapp-with-ai-a-complete-guide-to-setting-up-whatsapp-web-mcp-with-claude-and-f7a2180dca78)
- [**Integrating OpenAI Agents Python SDK with Anthropic's MCP**](https://medium.com/@pnizer/integrating-openai-agents-python-sdk-with-anthropics-mcp-229c686d9033)

## Installation

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
| `--auth-data-path` | `-a` | Path to store authentication data | - | `.wwebjs_auth` |
| `--auth-strategy` | `-s` | Authentication strategy | `local`, `none` | `local` |
| `--api-base-url` | `-b` | API base URL for MCP when using api mode | - | `http://localhost:3001/api` |
| `--api-key` | `-k` | API key for WhatsApp Web REST API when using api mode | - | `''` |

### API Key Authentication

When running in API mode, the WhatsApp API server requires authentication using an API key. The API key is automatically generated when you start the WhatsApp API server and is displayed in the logs:

```
WhatsApp API key: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

To connect the MCP server to the WhatsApp API server, you need to provide this API key using the `--api-key` or `-k` option:

```bash
npx wweb-mcp --mode mcp --mcp-mode api --api-base-url http://localhost:3001/api --api-key 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

The API key is stored in the authentication data directory (specified by `--auth-data-path`) and persists between restarts of the WhatsApp API server.

### Authentication Methods

#### Local Authentication (Recommended)

- Scan QR code once
- Credentials persist between sessions
- More stable for long-term operation

#### No Authentication

- Default method
- Requires QR code scan on each startup
- Suitable for testing and development

### Webhook Configuration

You can configure webhooks to receive incoming WhatsApp messages by creating a `webhook.json` file in your authentication data directory (specified by `--auth-data-path`).

#### Webhook JSON Format

```json
{
  "url": "https://your-webhook-endpoint.com/incoming",
  "authToken": "your-optional-authentication-token",
  "filters": {
    "allowedNumbers": ["+1234567890", "+0987654321"],
    "allowPrivate": true,
    "allowGroups": false
  }
}
```

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `url` | String | The webhook endpoint URL where message data will be sent |
| `authToken` | String (optional) | Authentication token to be included in the Authorization header as a Bearer token |
| `filters.allowedNumbers` | Array (optional) | List of phone numbers to accept messages from. If provided, only messages from these numbers will trigger the webhook |
| `filters.allowPrivate` | Boolean (optional) | Whether to send private messages to the webhook. Default: `true` |
| `filters.allowGroups` | Boolean (optional) | Whether to send group messages to the webhook. Default: `true` |

#### Webhook Payload

When a message is received and passes the filters, a POST request will be sent to the configured URL with the following JSON payload:

```json
{
  "from": "+1234567890",
  "name": "Contact Name",
  "message": "Hello, world!",
  "isGroup": false,
  "timestamp": 1621234567890,
  "messageId": "ABCDEF1234567890"
}
```

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
# First, start the WhatsApp API server and note the API key from the logs
npx wweb-mcp --mode whatsapp-api --api-port 3001

# Then, start the MCP server with the API key
npx wweb-mcp --mode mcp --mcp-mode api --api-base-url http://localhost:3001/api --api-key YOUR_API_KEY --transport sse --sse-port 3002
```

### Available Tools


| Tool | Description | Parameters |
|------|-------------|------------|
| `get_status` | Check WhatsApp client connection status | None |
| `send_message` | Send messages to WhatsApp contacts | `number`: Phone number to send to<br>`message`: Text content to send |
| `search_contacts` | Search for contacts by name or number | `query`: Search term to find contacts |
| `get_messages` | Retrieve messages from a specific chat | `number`: Phone number to get messages from<br>`limit` (optional): Number of messages to retrieve |
| `get_chats` | Get a list of all WhatsApp chats | None |
| `create_group` | Create a new WhatsApp group | `name`: Name of the group<br>`participants`: Array of phone numbers to add |
| `add_participants_to_group` | Add participants to an existing group | `groupId`: ID of the group<br>`participants`: Array of phone numbers to add |
| `get_group_messages` | Retrieve messages from a group | `groupId`: ID of the group<br>`limit` (optional): Number of messages to retrieve |
| `send_group_message` | Send a message to a group | `groupId`: ID of the group<br>`message`: Text content to send |
| `search_groups` | Search for groups by name, description, or member names | `query`: Search term to find groups |
| `get_group_by_id` | Get detailed information about a specific group | `groupId`: ID of the group to get |
| `download_media_from_message` | Download media from a message | `messageId`: ID of the message containing media to download |
| `send_media_message` | Send a media message to a WhatsApp contact | `number`: Phone number to send to<br>`source`: Media source with URI scheme (use `http://` or `https://` for URLs, `file://` for local files)<br>`caption` (optional): Text caption for the media |

### Available Resources

| Resource URI | Description |
|--------------|-------------|
| `whatsapp://contacts` | List of all WhatsApp contacts |
| `whatsapp://messages/{number}` | Messages from a specific chat |
| `whatsapp://chats` | List of all WhatsApp chats |
| `whatsapp://groups` | List of all WhatsApp groups |
| `whatsapp://groups/search` | Search for groups by name, description, or member names |
| `whatsapp://groups/{groupId}/messages` | Messages from a specific group |

### REST API Endpoints

#### Contacts & Messages

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/status` | GET | Get WhatsApp connection status | None |
| `/api/contacts` | GET | Get all contacts | None |
| `/api/contacts/search` | GET | Search for contacts | `query`: Search term |
| `/api/chats` | GET | Get all chats | None |
| `/api/messages/{number}` | GET | Get messages from a chat | `limit` (query): Number of messages |
| `/api/send` | POST | Send a message | `number`: Recipient<br>`message`: Message content |
| `/api/send/media` | POST | Send a media message | `number`: Recipient<br>`source`: Media source with URI scheme (use `http://` or `https://` for URLs, `file://` for local files)<br>`caption` (optional): Text caption |
| `/api/messages/{messageId}/media/download` | POST | Download media from a message | None |

#### Group Management

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/groups` | GET | Get all groups | None |
| `/api/groups/search` | GET | Search for groups | `query`: Search term |
| `/api/groups/create` | POST | Create a new group | `name`: Group name<br>`participants`: Array of numbers |
| `/api/groups/{groupId}` | GET | Get detailed information about a specific group | None |
| `/api/groups/{groupId}/messages` | GET | Get messages from a group | `limit` (query): Number of messages |
| `/api/groups/{groupId}/participants/add` | POST | Add members to a group | `participants`: Array of numbers |
| `/api/groups/send` | POST | Send a message to a group | `groupId`: Group ID<br>`message`: Message content |

### AI Integration

#### Claude Desktop Integration

##### Option 1: Using NPX

1. Start WhatsApp API server:

   ```bash
   npx wweb-mcp -m whatsapp-api -s local
   ```

2. Scan the QR code with your WhatsApp mobile app

3. Note the API key displayed in the logs:

   ```
   WhatsApp API key: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

4. Add the following to your Claude Desktop configuration:
   ```json
   {
       "mcpServers": {
           "whatsapp": {
               "command": "npx",
               "args": [
                   "wweb-mcp",
                   "-m", "mcp",
                   "-s", "local",
                   "-c", "api",
                   "-t", "command",
                   "--api-base-url", "http://localhost:3001/api",
                   "--api-key", "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
               ]
           }
       }
   }
   ```

##### Option 2: Using Docker

1. Start WhatsApp API server in Docker:

   ```bash
   docker run -i -p 3001:3001 -v wweb-mcp:/wwebjs_auth --rm wweb-mcp:latest -m whatsapp-api -s local -a /wwebjs_auth
   ```

2. Scan the QR code with your WhatsApp mobile app

3. Note the API key displayed in the logs:

   ```
   WhatsApp API key: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

4. Add the following to your Claude Desktop configuration:

   ```json
   {
       "mcpServers": {
           "whatsapp": {
               "command": "docker",
               "args": [
                   "run",
                   "-i",
                   "--rm",
                   "wweb-mcp:latest",
                   "-m", "mcp",
                   "-s", "local",
                   "-c", "api",
                   "-t", "command",
                   "--api-base-url", "http://host.docker.internal:3001/api",
                   "--api-key", "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
               ]
           }
       }
   }
   ```

5. Restart Claude Desktop
6. The WhatsApp functionality will be available through Claude's interface

## Architecture

The project is structured with a clean separation of concerns:

### Components

1. **WhatsAppService**: Core business logic for interacting with WhatsApp
2. **WhatsAppApiClient**: Client for connecting to the WhatsApp API
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

### Testing

The project uses Jest for unit testing. To run the tests:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Linting and Formatting

The project uses ESLint and Prettier for code quality and formatting:

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Validate code (lint + test)
npm run validate
```

The linting configuration enforces TypeScript best practices and maintains consistent code style across the project.

### Publishing

The project uses GitHub Actions for automated publishing to npm. The workflow handles:

1. Version incrementing (`patch`, `minor`, or `major`)
2. Git tagging with version prefixed by 'v' (e.g., v0.2.1)
3. Publishing to npm with GitHub secrets

To release a new version:

1. Go to the GitHub repository Actions tab
2. Select the "Publish Package" workflow
3. Click "Run workflow"
4. Choose the version increment type (patch, minor, or major)
5. Click "Run workflow" to start the publishing process

This workflow requires an NPM_TOKEN secret to be configured in your GitHub repository.

## Troubleshooting

### Claude Desktop Integration Issues

- It's not possible to start wweb-mcp in command standalone mode on Claude because Claude opens more than one process, multiple times, and each wweb-mcp needs to open a puppeteer session that cannot share the same WhatsApp authentication. Because of this limitation, we've split the app into MCP and API modes to allow for proper integration with Claude.

## Features

- Sending and receiving messages
- Sending media messages (images only)
- Downloading media from messages (images, audio, documents)
- Group chat management
- Contact management and search
- Message history retrieval

## Upcoming Features

- Support for sending all media file types (video, audio, documents)
- Enhanced message templates for common scenarios
- Advanced group management features
- Contact management (add/remove contacts)
- Enhanced error handling and recovery

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

## Dependencies

### WhatsApp Web.js

This project uses [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), an unofficial JavaScript client library for WhatsApp Web that connects through the WhatsApp Web browser app. For more information, visit the [whatsapp-web.js GitHub repository](https://github.com/pedroslopez/whatsapp-web.js).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Logging

WhatsApp Web MCP includes a robust logging system built with Winston. The logging system provides:

- Multiple log levels (error, warn, info, http, debug)
- Console output with colorized logs
- HTTP request/response logging for API endpoints
- Structured error handling
- Environment-aware log levels (development vs. production)
- All logs directed to stderr when running in MCP command mode

### Log Levels

The application supports the following log levels, in order of verbosity:

1. **error** - Critical errors that prevent the application from functioning
2. **warn** - Warnings that don't stop the application but require attention
3. **info** - General information about application state and events
4. **http** - HTTP request/response logging
5. **debug** - Detailed debugging information

### Configuring Log Level

You can configure the log level when starting the application using the `--log-level` or `-l` flag:

```bash
npm start -- --log-level=debug
```

Or when using the global installation:

```bash
wweb-mcp --log-level=debug
```

### Command Mode Logging

When running in MCP command mode (`--mode mcp --transport command`), all logs are directed to stderr. This is important for command-line tools where stdout might be used for data output while stderr is used for logging and diagnostics. This ensures that the MCP protocol communication over stdout is not interfered with by log messages.

### Test Environment

In test environments (when `NODE_ENV=test` or when running with Jest), the logger automatically adjusts its behavior to be suitable for testing environments.
