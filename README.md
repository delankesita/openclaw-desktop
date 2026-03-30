# OpenClaw Desktop

Standalone application for managing OpenClaw instances without VS Code.

## Features

- **Multi-instance Management**: Create, start, stop, and manage multiple OpenClaw instances
- **Template System**: Pre-configured templates for different use cases
- **Real-time Monitoring**: WebSocket-based state updates
- **Backup & Restore**: Export and import instance configurations
- **Cross-platform**: Available as CLI, Web, and Electron desktop app

## Packages

- `@openclaw/desktop-core` - Shared business logic
- `@openclaw/desktop-cli` - Command-line interface
- `@openclaw/desktop-web` - Web interface (Express + WebSocket)
- `@openclaw/desktop-electron` - Desktop application (Electron)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run CLI
pnpm start:cli

# Run Web interface
pnpm start:web

# Run Electron app
pnpm start:electron
```

## CLI Usage

```bash
# List instances
openclaw-desktop list

# Create instance
openclaw-desktop create -n "my-shrimp" -t developer

# Start/Stop instance
openclaw-desktop start <id>
openclaw-desktop stop <id>

# Health check
openclaw-desktop health <id>

# Backup/Restore
openclaw-desktop backup <id> -o backup.json
openclaw-desktop restore <id> -f backup.json
```

## Templates

- **Basic Shrimp** 🦞 - Default configuration
- **Developer Shrimp** 💻 - Coding assistance
- **Chatbot Shrimp** 💬 - Messaging channels
- **Research Shrimp** 🔍 - Web search and memory
- **High Performance** ⚡ - Parallel processing

## Architecture

```
packages/
├── core/           # Business logic
│   ├── types.ts    # Type definitions
│   ├── config.ts   # Configuration management
│   ├── process.ts  # Process control
│   ├── templates.ts# Instance templates
│   └── manager.ts  # Main orchestrator
├── cli/            # CLI tool
├── web/            # Web interface
└── electron/       # Desktop app
```

## Development

Each package can be developed independently:

```bash
# Watch mode for core
pnpm --filter @openclaw/desktop-core dev

# Watch mode for CLI
pnpm --filter @openclaw/desktop-cli dev

# Watch mode for Web
pnpm --filter @openclaw/desktop-web dev
```

## Requirements

- Node.js >= 18.0.0
- OpenClaw CLI installed globally (`npm install -g openclaw`)
- pnpm (`npm install -g pnpm`)

## License

MIT
