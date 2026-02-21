import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { AgentSession, AgentsResponse } from '@/lib/api-types';

// Path configurations - updated for OpenClaw directory structure
// Try ~/.openclaw first, fallback to ~/.clawdbot for backward compatibility
async function getClawdirPaths() {
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');
  const clawdbotDir = path.join(homeDir, '.clawdbot');
  
  let baseDir = openclawDir;
  try {
    await fs.access(openclawDir);
  } catch {
    baseDir = clawdbotDir;
  }
  
  // Try openclaw.json first, then clawdbot.json
  let configPath = path.join(baseDir, 'openclaw.json');
  try {
    await fs.access(configPath);
  } catch {
    configPath = path.join(baseDir, 'clawdbot.json');
  }
  
  return {
    baseDir,
    configPath,
    agentsDir: path.join(baseDir, 'agents'),
  };
}

// List of all agent IDs to check for sessions
const ALL_AGENT_IDS = ['main', 'knox', 'vault', 'aria', 'scout', 'rigor', 'sterling', 'pulse', 'reach', 'iris', 'recon', 'slate'];

interface ClawdbotAgent {
  id: string;
  name?: string;
  model?: string;
  agentDir?: string;
  default?: boolean;
  subagents?: {
    allowAgents?: string[];
  };
}

interface ClawdbotConfig {
  agents?: {
    list?: ClawdbotAgent[];
    defaults?: {
      model?: { primary?: string };
    };
  };
}

interface ParsedAgent {
  id: string;
  name: string;
  role: string;
  reportsTo: string | null;
  model: string;
  agentDir: string;
}

interface SessionData {
  sessionId: string;
  updatedAt: number;
  model?: string;
  label?: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  channel?: string;
  abortedLastRun?: boolean;
}

/**
 * Parse SOUL.md to extract agent metadata
 */
function parseSoulMd(content: string, agentId: string, configName?: string): Partial<ParsedAgent> {
  const result: Partial<ParsedAgent> = {};
  
  // Extract name from first H1
  const h1Match = content.match(/^#\s+(.+?)(?:\s*[—-]|$)/m);
  if (h1Match) {
    result.name = h1Match[1].trim();
  }
  
  // Extract role from ## Role section or **Primary:** field
  const roleMatch = content.match(/\*\*Primary:\*\*\s*(.+?)(?:\n|$)/);
  if (roleMatch) {
    result.role = roleMatch[1].trim();
  }
  
  // Extract reports to
  const reportsToMatch = content.match(/\*\*Reports to:\*\*\s*(.+?)(?:\n|$)/);
  if (reportsToMatch) {
    const reportTo = reportsToMatch[1].trim();
    // Parse "Knox (Architect)" -> "knox"
    const nameMatch = reportTo.match(/^(\w+)/);
    if (nameMatch) {
      let reportsTo = nameMatch[1].toLowerCase();
      // Map "hex" to "main" since Hex is the main agent
      if (reportsTo === 'hex') reportsTo = 'main';
      result.reportsTo = reportsTo;
    }
  }
  
  // Use config name as fallback
  if (!result.name && configName) {
    result.name = configName;
  }
  
  return result;
}

/**
 * Determine agent status based on session data
 */
function determineStatus(session: SessionData | null, now: number): 'active' | 'idle' | 'stale' {
  if (!session) return 'stale';
  
  const timeSinceUpdate = now - session.updatedAt;
  const FIVE_MINUTES = 5 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;
  
  if (timeSinceUpdate < FIVE_MINUTES) return 'active';
  if (timeSinceUpdate < ONE_HOUR) return 'idle';
  return 'stale';
}

/**
 * Find matching session for an agent
 */
function findAgentSession(
  agentId: string,
  sessions: Record<string, SessionData>
): SessionData | null {
  // Main agent
  if (agentId === 'main') {
    return sessions['agent:main:main'] || null;
  }
  
  // Look for subagent sessions
  const idLower = agentId.toLowerCase();
  
  for (const [key, session] of Object.entries(sessions)) {
    // Match agent:knox:*, agent:vault:*, etc.
    if (key.startsWith(`agent:${idLower}:`)) {
      return session;
    }
    
    // Also check label for spawned subagents
    if (key.includes(':subagent:') && session.label) {
      const labelLower = session.label.toLowerCase();
      if (labelLower.includes(idLower) || labelLower.startsWith(idLower)) {
        return session;
      }
    }
  }
  
  return null;
}

/**
 * Extract model provider from model string
 */
function getModelProvider(model: string): string {
  if (model.includes('claude') || model.includes('anthropic')) return 'anthropic';
  if (model.includes('gpt') || model.includes('openai')) return 'openai';
  if (model.includes('gemini') || model.includes('google')) return 'google';
  return 'anthropic';
}

/**
 * Build hierarchy from known relationships
 */
const HIERARCHY: Record<string, string> = {
  // Dev team reports to Knox
  'vault': 'knox',
  'aria': 'knox',
  'scout': 'knox',
  'rigor': 'knox',
  // Knox and marketing report to Hex (main)
  'knox': 'main',
  'sterling': 'main',
  'recon': 'main',
  // Marketing team reports to Sterling
  'pulse': 'sterling',
  'reach': 'sterling',
  'iris': 'sterling',
  'slate': 'sterling',
};

export async function GET() {
  try {
    const now = Date.now();
    const paths = await getClawdirPaths();
    
    // Read Clawdbot config for agent list
    let config: ClawdbotConfig = {};
    try {
      const configContent = await fs.readFile(paths.configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (err) {
      console.warn('Could not read clawdbot config:', err);
    }
    
    const configAgents = config.agents?.list || [];
    const defaultModel = config.agents?.defaults?.model?.primary || 'claude-opus-4-5';
    
    // Read sessions data from ALL agent directories
    let sessions: Record<string, SessionData> = {};
    for (const agentId of ALL_AGENT_IDS) {
      try {
        const sessionsPath = path.join(paths.agentsDir, agentId, 'sessions', 'sessions.json');
        const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
        const agentSessions = JSON.parse(sessionsContent);
        // Merge sessions, newer timestamps win
        for (const [key, session] of Object.entries(agentSessions)) {
          const existingSession = sessions[key] as SessionData | undefined;
          const newSession = session as SessionData;
          if (!existingSession || newSession.updatedAt > existingSession.updatedAt) {
            sessions[key] = newSession;
          }
        }
      } catch {
        // No sessions file for this agent, skip
      }
    }
    
    // Build agent list from config + SOUL.md files
    const parsedAgents: ParsedAgent[] = [];
    
    for (const agent of configAgents) {
      let soulData: Partial<ParsedAgent> = {};
      
      // Read SOUL.md if agentDir exists
      if (agent.agentDir) {
        try {
          const soulPath = path.join(agent.agentDir, 'SOUL.md');
          const soulContent = await fs.readFile(soulPath, 'utf-8');
          soulData = parseSoulMd(soulContent, agent.id, agent.name);
        } catch {
          // No SOUL.md, use config values
        }
      }
      
      parsedAgents.push({
        id: agent.id,
        name: soulData.name || agent.name || agent.id.charAt(0).toUpperCase() + agent.id.slice(1),
        role: soulData.role || (agent.id === 'main' ? 'Chief of Staff / Coordinator' : 'Agent'),
        reportsTo: soulData.reportsTo || HIERARCHY[agent.id] || null,
        model: agent.model || defaultModel,
        agentDir: agent.agentDir || '',
      });
    }
    
    // If no agents in config, add main as fallback
    if (parsedAgents.length === 0) {
      parsedAgents.push({
        id: 'main',
        name: 'Hex',
        role: 'Chief of Staff / Coordinator',
        reportsTo: null,
        model: defaultModel,
        agentDir: path.join(paths.agentsDir, 'main'),
      });
    }
    
    // Build children map
    const childrenMap = new Map<string, string[]>();
    for (const agent of parsedAgents) {
      if (agent.reportsTo) {
        const children = childrenMap.get(agent.reportsTo) || [];
        children.push(agent.id);
        childrenMap.set(agent.reportsTo, children);
      }
    }
    
    // Build final agent list
    const agents: AgentSession[] = parsedAgents.map(parsed => {
      const session = findAgentSession(parsed.id, sessions);
      const status = determineStatus(session, now);
      
      const isMain = parsed.id === 'main';
      
      return {
        id: parsed.id,
        sessionId: session?.sessionId || `virtual-${parsed.id}`,
        name: parsed.name,
        type: isMain ? 'main' : 'subagent',
        status,
        model: session?.model || parsed.model,
        modelProvider: getModelProvider(session?.model || parsed.model),
        parent: parsed.reportsTo || undefined,
        children: childrenMap.get(parsed.id) || [],
        updatedAt: session?.updatedAt || now,
        totalTokens: session?.totalTokens || 0,
        inputTokens: session?.inputTokens || 0,
        outputTokens: session?.outputTokens || 0,
        channel: session?.channel,
        label: parsed.role,
        lastMessage: undefined,
      };
    });
    
    // Sort: main first, then by name
    agents.sort((a, b) => {
      if (a.id === 'main') return -1;
      if (b.id === 'main') return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Count active agents
    const activeAgents = agents.filter(a => a.status === 'active').length;
    
    const response: AgentsResponse = {
      agents,
      totalAgents: agents.length,
      activeAgents,
      timestamp: now,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
      { status: 500 }
    );
  }
}
