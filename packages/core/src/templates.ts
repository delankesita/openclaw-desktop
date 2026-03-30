/**
 * OpenClaw Manager - Instance Templates
 * 13 pre-configured templates for different use cases
 */

import { InstanceTemplate } from './types';

// 支持的渠道类型定义
export const SUPPORTED_CHANNELS = {
  // 国外主流通讯办公软件
  telegram: { name: 'Telegram', icon: '📱', region: 'international' },
  discord: { name: 'Discord', icon: '🎮', region: 'international' },
  whatsapp: { name: 'WhatsApp', icon: '💬', region: 'international' },
  slack: { name: 'Slack', icon: '💼', region: 'international' },
  imessage: { name: 'iMessage', icon: '🍎', region: 'international' },
  line: { name: 'LINE', icon: '💚', region: 'international' },
  twitch: { name: 'Twitch', icon: '📺', region: 'international' },
  // 国内主流通讯办公软件
  feishu: { name: '飞书', icon: '🪿', region: 'china' },
  dingtalk: { name: '钉钉', icon: '📌', region: 'china' },
  wecom: { name: '企业微信', icon: '🏢', region: 'china' },
  wechat: { name: '微信', icon: '💚', region: 'china' },
} as const;

export const templates: InstanceTemplate[] = [
  {
    id: 'basic',
    name: 'Basic Shrimp',
    description: 'Simple OpenClaw instance with default settings',
    category: 'basic',
    icon: '🦞',
    config: {
      gateway: { mode: 'local', bind: 'loopback' },
      agents: { list: [{ id: 'main' }] }
    },
    tags: ['basic', 'default']
  },
  {
    id: 'developer',
    name: 'Developer Shrimp',
    description: 'Configured for coding assistance with exec permissions',
    category: 'development',
    icon: '💻',
    config: {
      gateway: { mode: 'local', bind: 'loopback' },
      agents: {
        defaults: { workspace: '${workspace}', maxConcurrent: 4 },
        list: [{ id: 'main' }]
      },
      tools: { profile: 'coding' }
    },
    tags: ['development', 'coding', 'programming']
  },
  {
    id: 'chatbot',
    name: 'Chatbot Shrimp',
    description: 'Optimized for conversational AI with messaging channels (Feishu, DingTalk)',
    category: 'production',
    icon: '💬',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { maxConcurrent: 10 }, list: [{ id: 'main' }] },
      tools: { profile: 'messaging' }
    },
    channels: ['feishu', 'dingtalk'],
    tags: ['chatbot', 'messaging', 'production', 'china']
  },
  {
    id: 'multichannel',
    name: 'Multi-Channel Shrimp',
    description: 'International channels: Telegram, Discord, WhatsApp, Slack, LINE',
    category: 'production',
    icon: '🌐',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { maxConcurrent: 20 }, list: [{ id: 'main' }] },
      tools: { profile: 'messaging' }
    },
    channels: ['telegram', 'discord', 'whatsapp', 'slack', 'line'],
    tags: ['chatbot', 'messaging', 'production', 'international', 'multichannel']
  },
  {
    id: 'global-messenger',
    name: 'Global Messenger Shrimp',
    description: 'All major international platforms: Telegram, Discord, WhatsApp, Slack, iMessage, LINE, Twitch',
    category: 'production',
    icon: '🌍',
    config: {
      gateway: { mode: 'local' },
      agents: { 
        defaults: { maxConcurrent: 30 }, 
        list: [{ id: 'main' }] 
      },
      tools: { profile: 'messaging' }
    },
    channels: ['telegram', 'discord', 'whatsapp', 'slack', 'imessage', 'line', 'twitch'],
    tags: ['chatbot', 'messaging', 'production', 'international', 'global', 'all-platforms']
  },
  {
    id: 'china-messenger',
    name: 'China Messenger Shrimp',
    description: 'All major China platforms: Feishu, DingTalk, WeCom, WeChat',
    category: 'production',
    icon: '🇨🇳',
    config: {
      gateway: { mode: 'local' },
      agents: { 
        defaults: { maxConcurrent: 20 }, 
        list: [{ id: 'main' }] 
      },
      tools: { profile: 'messaging' }
    },
    channels: ['feishu', 'dingtalk', 'wecom', 'wechat'],
    tags: ['chatbot', 'messaging', 'production', 'china', 'all-platforms']
  },
  {
    id: 'telegram-bot',
    name: 'Telegram Bot Shrimp',
    description: 'Optimized for Telegram with groups, topics and streaming support',
    category: 'production',
    icon: '📱',
    config: {
      gateway: { mode: 'local' },
      agents: { 
        defaults: { 
          maxConcurrent: 10,
          groupChat: { mentionPatterns: ['@bot'] }
        }, 
        list: [{ id: 'main' }] 
      },
      tools: { profile: 'messaging' }
    },
    channels: ['telegram'],
    tags: ['chatbot', 'messaging', 'production', 'telegram', 'international']
  },
  {
    id: 'discord-bot',
    name: 'Discord Bot Shrimp',
    description: 'Optimized for Discord with threads, channels and guild support',
    category: 'production',
    icon: '🎮',
    config: {
      gateway: { mode: 'local' },
      agents: { 
        defaults: { 
          maxConcurrent: 10,
          groupChat: { mentionPatterns: ['@bot', '<@bot>'] }
        }, 
        list: [{ id: 'main' }] 
      },
      tools: { profile: 'messaging' }
    },
    channels: ['discord'],
    tags: ['chatbot', 'messaging', 'production', 'discord', 'international', 'gaming']
  },
  {
    id: 'research',
    name: 'Research Shrimp',
    description: 'Configured for research with web search and memory',
    category: 'specialized',
    icon: '🔍',
    config: {
      gateway: { mode: 'local' },
      agents: {
        defaults: { memorySearch: { enabled: true, provider: 'local' } },
        list: [{ id: 'main' }]
      },
      tools: { web: { search: { enabled: true }, fetch: { enabled: true } } }
    },
    tags: ['research', 'web', 'search']
  },
  {
    id: 'content-creator',
    name: 'Content Creator Shrimp',
    description: 'For content creation with writing and publishing tools',
    category: 'specialized',
    icon: '✍️',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { maxConcurrent: 2 }, list: [{ id: 'main' }] },
      tools: { profile: 'coding' }
    },
    tags: ['content', 'writing', 'creative']
  },
  {
    id: 'automation',
    name: 'Automation Shrimp',
    description: 'For scheduled tasks and automation workflows',
    category: 'specialized',
    icon: '🤖',
    config: {
      gateway: { mode: 'local' },
      agents: {
        defaults: { heartbeat: { every: '5m', includeReasoning: false } },
        list: [{ id: 'main' }]
      }
    },
    tags: ['automation', 'scheduled', 'tasks']
  },
  {
    id: 'secure',
    name: 'Secure Shrimp',
    description: 'Maximum security with restricted permissions',
    category: 'production',
    icon: '🔒',
    config: {
      gateway: { mode: 'local', bind: 'loopback', auth: { mode: 'token' } },
      agents: {
        defaults: {
          maxConcurrent: 2,
          subagents: { maxConcurrent: 2, maxSpawnDepth: 1 }
        },
        list: [{ id: 'main' }]
      },
      tools: { profile: 'messaging', deny: ['tts', 'exec'] }
    },
    tags: ['security', 'production', 'restricted']
  },
  {
    id: 'high-performance',
    name: 'High Performance Shrimp',
    description: 'Optimized for high throughput with parallel processing',
    category: 'production',
    icon: '⚡',
    config: {
      gateway: { mode: 'local' },
      agents: {
        defaults: {
          maxConcurrent: 16,
          subagents: { maxConcurrent: 8, maxSpawnDepth: 3, maxChildrenPerAgent: 16 }
        },
        list: [{ id: 'main' }]
      }
    },
    tags: ['performance', 'parallel', 'high-throughput']
  }
];

export function getTemplate(id: string): InstanceTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: InstanceTemplate['category']): InstanceTemplate[] {
  return templates.filter(t => t.category === category);
}

export function getTemplatesByTag(tag: string): InstanceTemplate[] {
  return templates.filter(t => t.tags.includes(tag));
}
