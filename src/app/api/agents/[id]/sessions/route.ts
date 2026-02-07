import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const CLAWDBOT_AGENTS_DIR = path.join(os.homedir(), '.clawdbot', 'agents');

interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface SessionSummary {
  sessionId: string;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
}

/**
 * Read JSONL file and extract messages
 */
async function readJsonlMessages(filePath: string, limit = 50): Promise<SessionMessage[]> {
  const messages: SessionMessage[] = [];
  
  try {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.role && entry.content) {
          messages.push({
            role: entry.role,
            content: typeof entry.content === 'string' 
              ? entry.content.slice(0, 1000) // Truncate long messages
              : JSON.stringify(entry.content).slice(0, 1000),
            timestamp: entry.timestamp,
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch (err) {
    console.warn(`Could not read ${filePath}:`, err);
  }
  
  // Return last N messages
  return messages.slice(-limit);
}

/**
 * List session files for an agent
 */
async function listAgentSessions(agentDir: string): Promise<SessionSummary[]> {
  const sessionsDir = path.join(agentDir, 'sessions');
  const sessions: SessionSummary[] = [];
  
  try {
    const files = await fs.readdir(sessionsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    
    for (const file of jsonlFiles.slice(-10)) { // Last 10 sessions
      const filePath = path.join(sessionsDir, file);
      const stats = await fs.stat(filePath);
      const sessionId = file.replace('.jsonl', '');
      
      sessions.push({
        sessionId,
        updatedAt: stats.mtimeMs,
        messageCount: 0, // Would need to count lines
        lastMessage: undefined,
      });
    }
    
    // Sort by most recent first
    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.warn(`Could not list sessions in ${sessionsDir}:`, err);
  }
  
  return sessions;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  
  const agentDir = path.join(CLAWDBOT_AGENTS_DIR, agentId);
  
  // Check if agent exists
  try {
    await fs.access(agentDir);
  } catch {
    return NextResponse.json(
      { error: `Agent ${agentId} not found` },
      { status: 404 }
    );
  }
  
  // If sessionId provided, return messages for that session
  if (sessionId) {
    const sessionPath = path.join(agentDir, 'sessions', `${sessionId}.jsonl`);
    const messages = await readJsonlMessages(sessionPath, limit);
    
    return NextResponse.json({
      agentId,
      sessionId,
      messages,
      timestamp: Date.now(),
    });
  }
  
  // Otherwise, list available sessions
  const sessions = await listAgentSessions(agentDir);
  
  return NextResponse.json({
    agentId,
    sessions,
    timestamp: Date.now(),
  });
}
