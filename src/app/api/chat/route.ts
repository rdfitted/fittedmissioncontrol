import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CHAT_FILE = path.join(process.cwd(), '..', 'squad', 'chat.md');

interface ChatMessage {
  id: string;
  agent: string;
  message: string;
  timestamp: string; // ISO 8601
  date?: string;
}

interface ParsedChat {
  messages: ChatMessage[];
  currentDate: string | null;
}

function parseChat(content: string): ParsedChat {
  const messages: ChatMessage[] = [];
  let messageId = 0;
  
  // Split by message blocks (--- separator)
  const blocks = content.split(/^---$/m);
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // New format: **[2026-02-06 15:26 HST] AgentName**
    const newFormatMatch = trimmed.match(/^\*\*\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*(?:HST)?\]\s*([^*]+)\*\*/);
    if (newFormatMatch) {
      const [, date, time, agent] = newFormatMatch;
      // Get message content (everything after the header line)
      const lines = trimmed.split('\n');
      const messageContent = lines.slice(1).join('\n').trim();
      
      if (messageContent) {
        const timestamp = new Date(`${date}T${time}:00-10:00`).toISOString(); // HST = UTC-10
        messages.push({
          id: `msg-${messageId++}`,
          agent: agent.trim(),
          message: messageContent.slice(0, 500), // Truncate long messages
          timestamp,
          date,
        });
      }
      continue;
    }
    
    // Old format: **AgentName:** message (single line)
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const oldFormatMatch = line.match(/^\*\*([^*:]+):\*\*\s*(.+)/);
      if (oldFormatMatch) {
        const [, agent, msg] = oldFormatMatch;
        // Skip if agent name looks like a label (contains special chars or is too long)
        if (agent.length > 30 || /[[\]()]/.test(agent)) continue;
        
        messages.push({
          id: `msg-${messageId++}`,
          agent: agent.trim(),
          message: msg.trim(),
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  
  // Sort by timestamp
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return { messages, currentDate: null };
}

export async function GET() {
  try {
    const content = await fs.readFile(CHAT_FILE, 'utf-8');
    const { messages } = parseChat(content);
    
    return NextResponse.json({ 
      messages,
    });
  } catch (error) {
    console.error('Error reading chat:', error);
    return NextResponse.json({ messages: [] });
  }
}
