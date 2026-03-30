# Changelog

All notable changes to OpenClaw Manager will be documented in this file.

## [2.0.0] - 2026-03-30

### Added

#### Multi-Channel Support
- **Global Messenger Shrimp** - All major international platforms (Telegram, Discord, WhatsApp, Slack, iMessage, LINE, Twitch)
- **China Messenger Shrimp** - All major China platforms (Feishu, DingTalk, WeCom, WeChat)
- **Multi-Channel Shrimp** - Popular international channels (Telegram, Discord, WhatsApp, Slack, LINE)
- **Telegram Bot Shrimp** - Optimized for Telegram with group/topic support
- **Discord Bot Shrimp** - Optimized for Discord with thread/channel support

#### Supported Channels
- International: Telegram, Discord, WhatsApp, Slack, iMessage, LINE, Twitch
- China: Feishu (飞书), DingTalk (钉钉), WeCom (企业微信), WeChat (微信)

#### Core Features
- Auto-detect instance running status via port connection
- Health check now updates instance status automatically
- Detached process mode for background operation
- `SUPPORTED_CHANNELS` constant for channel metadata

### Changed

- Template count expanded from 8 to 13
- Chatbot Shrimp now explicitly shows supported channels (Feishu, DingTalk)
- Removed axios dependency, using native fetch API
- Instance status detection no longer depends on in-memory process tracking

### Fixed

- Instance status shows "running" correctly after creation
- Health check works even when instance status in memory is incorrect
- Process no longer exits immediately when started in detached mode

## [1.0.0] - Initial Release

### Added

- Basic, Developer, Chatbot, Research, Content Creator, Automation, Secure, High Performance templates
- CLI tool for instance management
- Web interface for visual management
- Instance CRUD operations
- Backup and restore functionality
- Health monitoring
- No external dependencies
- TypeScript source with CommonJS output
- Monorepo structure with packages/core, packages/cli, packages/web
