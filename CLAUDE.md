# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp Web MCP is a Node.js/TypeScript application that bridges WhatsApp Web with AI models through the Model Context Protocol (MCP). It provides two main deployment modes:

1. **WhatsApp API Server** (`--mode whatsapp-api`) - Standalone REST API server
2. **MCP Server** (`--mode mcp`) - Direct MCP protocol implementation with two sub-modes:
   - `standalone` - Direct WhatsApp Web client connection
   - `api` - Connects to a WhatsApp API server

## Development Commands

### Essential Commands
```bash
# Build the project
npm run build

# Run tests
npm test
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report

# Linting and formatting
npm run lint
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format with Prettier
npm run validate        # Run lint + test together
```

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build && npm start

# Run specific modes
npx . --mode whatsapp-api --api-port 3001
npx . --mode mcp --mcp-mode standalone --transport sse --sse-port 3002
```

## Architecture

### Core Components
- **main.ts** - Application entry point with CLI argument parsing and server initialization
- **whatsapp-service.ts** - Core business logic for WhatsApp interactions using whatsapp-web.js
- **whatsapp-api-client.ts** - HTTP client for connecting to WhatsApp API server
- **mcp-server.ts** - MCP protocol implementation with tools and resources
- **api.ts** - Express REST API router
- **whatsapp-client.ts** - WhatsApp Web client factory and configuration

### Key Design Patterns
1. **Service Layer Pattern** - WhatsAppService abstracts WhatsApp operations
2. **Factory Pattern** - createWhatsAppClient and createMcpServer for component creation
3. **Adapter Pattern** - WhatsAppApiClient adapts REST API to service interface
4. **Configuration Object Pattern** - WhatsAppConfig and McpConfig for dependency injection

### Authentication & Storage
- Uses `.wwebjs_auth` directory for WhatsApp session persistence
- API key generation and storage in `api_key.txt`
- Media files stored in configurable media storage path
- Two auth strategies: `local` (persistent) and `none` (ephemeral)

## MCP Tools and Resources

### Available Tools
- `get_status` - Check WhatsApp connection status
- `send_message` - Send text messages to contacts
- `search_contacts` - Search contacts by name/number
- `get_messages` - Retrieve chat messages
- `get_chats` - List all chats
- `create_group` - Create new WhatsApp groups
- `add_participants_to_group` - Add members to groups
- `get_group_messages` - Get group chat messages
- `send_group_message` - Send messages to groups
- `search_groups` - Search groups by name/description
- `get_group_by_id` - Get detailed group information
- `download_media_from_message` - Download media files
- `send_media_message` - Send media messages (images only)

### Available Resources
- `whatsapp://contacts` - Contact list
- `whatsapp://messages/{number}` - Messages from specific chat
- `whatsapp://chats` - All chats
- `whatsapp://groups` - All groups
- `whatsapp://groups/search` - Group search
- `whatsapp://groups/{groupId}/messages` - Group messages

## Configuration

### Command Line Arguments
The application uses yargs for CLI parsing with these key options:
- `--mode` / `-m`: `mcp` or `whatsapp-api`
- `--mcp-mode` / `-c`: `standalone` or `api`
- `--transport` / `-t`: `sse` or `command`
- `--auth-strategy` / `-s`: `local` or `none`
- `--log-level` / `-l`: `error`, `warn`, `info`, `http`, `debug`

### Environment Considerations
- Docker support via `DOCKER_CONTAINER=true` env var
- MCP command mode redirects all logs to stderr
- Test environment detection via `NODE_ENV=test`

## Testing

- Jest configuration in `jest.config.js` and `tsconfig.test.json`
- Test files in `test/` directory with `.test.ts` suffix
- Includes unit tests for core services and API endpoints
- Setup file at `test/setup.ts` for test environment configuration

## Dependencies

### Core Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `whatsapp-web.js` - WhatsApp Web client library
- `express` - REST API server
- `winston` - Logging framework
- `yargs` - CLI argument parsing

### Development Dependencies
- `typescript` - TypeScript compiler
- `jest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting
- `nodemon` - Development auto-reload

## Known Limitations

1. **Claude Desktop Integration**: Cannot use MCP standalone mode in command transport due to multiple process instantiation issues
2. **Media Support**: Only image files supported for sending media messages
3. **Group Management**: Some group operations may have API restrictions
4. **Authentication**: Requires QR code scanning for initial setup