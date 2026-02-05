import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { AgentSession, AgentsResponse } from '@/lib/api-types';

// Path configurations
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || path.join(os.homedir(), 'Code Projects');
const AGENTS_DIR = path.join(WORKSPACE_PATH, 'squad', 'agents');
const CLAWDBOT_SESSIONS_PATH = path.join(os.homedir(), '.clawdbot', 'agents', 'main', 'sessions', 'sessions.json');

interface ParsedAgent {
  id: string;
  name: string;
  role: string;
  reportsTo: string | null;
  model: string;
  filename: string;
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
 * Parse a persona markdown file to extract agent metadata
 */
function parseAgentPersona(content: string, filename: string): ParsedAgent | null {
  // Extract name from title (# SOUL.md — Name) or from **Name:** field
  let name = '';
  const titleMatch = content.match(/^#\s*SOUL\.md\s*[—-]\s*(.+)$/m);
  if (titleMatch) {
    name = titleMatch[1].trim();
  }
  
  // Fallback to **Name:** field
  const nameMatch = content.match(/\*\*Name:\*\*\s*(.+?)(?:\n|$)/);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  if (!name) {
    // Use filename as fallback
    name = filename.replace('.md', '').split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  }
  
  // Extract role
  const roleMatch = content.match(/\*\*Role:\*\*\s*(.+?)(?:\n|$)/);
  const role = roleMatch ? roleMatch[1].trim() : 'Agent';
  
  // Extract reports-to
  const reportsToMatch = content.match(/\*\*Reports to:\*\*\s*(.+?)(?:\n|$)/);
  const reportsTo = reportsToMatch ? reportsToMatch[1].trim() : null;
  
  // Extract model from Model Assignment section
  const modelMatch = content.match(/\*\*Model:\*\*\s*(.+?)(?:\n|$)/);
  const model = modelMatch ? modelMatch[1].trim() : 'claude-sonnet-4';
  
  // Generate ID from filename
  const id = filename.replace('.md', '').toLowerCase();
  
  return {
    id,
    name,
    role,
    reportsTo,
    model,
    filename,
  };
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
  agentName: string, 
  agentId: string,
  sessions: Record<string, SessionData>
): SessionData | null {
  // Check for main agent
  if (agentName.toLowerCase() === 'hex prime' || agentId === 'hex-prime') {
    return sessions['agent:main:main'] || null;
  }
  
  // Search for subagent by label containing agent name
  const nameLower = agentName.toLowerCase();
  const idLower = agentId.toLowerCase();
  
  for (const [key, session] of Object.entries(sessions)) {
    if (key.includes(':subagent:') && session.label) {
      const labelLower = session.label.toLowerCase();
      if (labelLower.includes(nameLower) || labelLower.includes(idLower)) {
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
  return 'anthropic'; // default
}

export async function GET() {
  try {
    const now = Date.now();
    
    // Read all agent persona files
    let agentFiles: string[] = [];
    try {
      const files = await fs.readdir(AGENTS_DIR);
      agentFiles = files.filter(f => f.endsWith('.md'));
    } catch {
      console.warn('Could not read agents directory:', AGENTS_DIR);
    }
    
    // Parse persona files
    const parsedAgents: ParsedAgent[] = [];
    for (const filename of agentFiles) {
      try {
        const content = await fs.readFile(path.join(AGENTS_DIR, filename), 'utf-8');
        const agent = parseAgentPersona(content, filename);
        if (agent) {
          parsedAgents.push(agent);
        }
      } catch (err) {
        console.warn(`Failed to parse ${filename}:`, err);
      }
    }
    
    // Read sessions data
    let sessions: Record<string, SessionData> = {};
    try {
      const sessionsContent = await fs.readFile(CLAWDBOT_SESSIONS_PATH, 'utf-8');
      sessions = JSON.parse(sessionsContent);
    } catch {
      console.warn('Could not read sessions file:', CLAWDBOT_SESSIONS_PATH);
    }
    
    // Check if Hex Prime exists in personas, if not add it as the main agent
    const hasHexPrime = parsedAgents.some(a => 
      a.name.toLowerCase() === 'hex prime' || a.id === 'hex-prime'
    );
    
    if (!hasHexPrime) {
      // Add Hex Prime from main session if available
      const mainSession = sessions['agent:main:main'];
      parsedAgents.unshift({
        id: 'hex-prime',
        name: 'Hex Prime',
        role: 'Main Agent / Coordinator',
        reportsTo: null,
        model: mainSession?.model || 'claude-opus-4-5',
        filename: '',
      });
    }
    
    // Build name-to-id mapping for parent resolution
    const nameToId = new Map<string, string>();
    for (const agent of parsedAgents) {
      nameToId.set(agent.name.toLowerCase(), agent.id);
      // Also map without spaces
      nameToId.set(agent.name.toLowerCase().replace(/\s+/g, '-'), agent.id);
    }
    
    // Build parent-children relationships
    const childrenMap = new Map<string, string[]>();
    for (const agent of parsedAgents) {
      if (agent.reportsTo) {
        const parentId = nameToId.get(agent.reportsTo.toLowerCase()) || 
                         agent.reportsTo.toLowerCase().replace(/\s+/g, '-');
        const children = childrenMap.get(parentId) || [];
        children.push(agent.id);
        childrenMap.set(parentId, children);
      }
    }
    
    // Build final agent list
    const agents: AgentSession[] = parsedAgents.map(parsed => {
      const session = findAgentSession(parsed.name, parsed.id, sessions);
      const status = determineStatus(session, now);
      
      // Resolve parent ID
      let parentId: string | undefined;
      if (parsed.reportsTo) {
        parentId = nameToId.get(parsed.reportsTo.toLowerCase()) ||
                   parsed.reportsTo.toLowerCase().replace(/\s+/g, '-');
      }
      
      // Determine agent type
      const isMain = parsed.name.toLowerCase() === 'hex prime' || parsed.id === 'hex-prime';
      
      return {
        id: parsed.id,
        sessionId: session?.sessionId || `virtual-${parsed.id}`,
        name: parsed.name,
        type: isMain ? 'main' : 'subagent',
        status,
        model: session?.model || parsed.model,
        modelProvider: getModelProvider(session?.model || parsed.model),
        parent: parentId,
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
