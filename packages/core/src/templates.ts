import { InstanceTemplate } from './types';

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
    description: 'Configured for coding assistance',
    category: 'development',
    icon: '💻',
    config: {
      gateway: { mode: 'local', bind: 'loopback' },
      agents: { defaults: { maxConcurrent: 4 }, list: [{ id: 'main' }] },
      tools: { profile: 'coding' }
    },
    tags: ['development', 'coding']
  },
  {
    id: 'chatbot',
    name: 'Chatbot Shrimp',
    description: 'Optimized for messaging channels',
    category: 'production',
    icon: '💬',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { maxConcurrent: 10 }, list: [{ id: 'main' }] },
      tools: { profile: 'messaging' }
    },
    channels: ['feishu', 'dingtalk'],
    tags: ['chatbot', 'messaging']
  },
  {
    id: 'research',
    name: 'Research Shrimp',
    description: 'Configured for web search and memory',
    category: 'specialized',
    icon: '🔍',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { memorySearch: { enabled: true, provider: 'local' } }, list: [{ id: 'main' }] },
      tools: { web: { search: { enabled: true }, fetch: { enabled: true } } }
    },
    tags: ['research', 'web']
  },
  {
    id: 'high-performance',
    name: 'High Performance',
    description: 'Optimized for parallel processing',
    category: 'production',
    icon: '⚡',
    config: {
      gateway: { mode: 'local' },
      agents: { defaults: { maxConcurrent: 16, subagents: { maxConcurrent: 8, maxSpawnDepth: 3 } }, list: [{ id: 'main' }] }
    },
    tags: ['performance', 'parallel']
  }
];

export function getTemplate(id: string): InstanceTemplate | undefined {
  return templates.find(t => t.id === id);
}
