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

/**
 * Generate a synthetic timestamp from date and message index
 * Since chat.md doesn't have precise timestamps, we create synthetic ones
 * based on the date header and spread messages throughout the day
 */
function generateTimestamp(date: string, index: number, totalForDate: number): string {
  const baseDate = new Date(date + 'T09:00:00');
  // Spread messages from 9am to 5pm (8 hours = 480 minutes)
  const minutesSpread = Math.floor((480 / Math.max(totalForDate, 1)) * index);
  baseDate.setMinutes(baseDate.getMinutes() + minutesSpread);
  return baseDate.toISOString();
}

function parseChat(content: string): ParsedChat {
  const messages: ChatMessage[] = [];
  let currentDate: string | null = null;
  
  // First pass: count messages per date for timestamp distribution
  const dateMessageCounts: Record<string, number> = {};
  const dateMessageIndices: Record<string, number> = {};
  const lines = content.split('\n');
  
  // Pre-count messages per date
  let tempDate: string | null = null;
  for (const line of lines) {
    const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      tempDate = dateMatch[1];
      if (!dateMessageCounts[tempDate]) {
        dateMessageCounts[tempDate] = 0;
        dateMessageIndices[tempDate] = 0;
      }
      continue;
    }
    
    const messageMatch = line.match(/^\*\*([^*]+):\*\*\s*(.+)/);
    if (messageMatch && tempDate) {
      dateMessageCounts[tempDate]++;
    }
  }
  
  // Second pass: build messages with timestamps
  let messageId = 0;
  for (const line of lines) {
    // Check for date headers
    const dateMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }
    
    // Check for messages: **Agent Name:** message
    const messageMatch = line.match(/^\*\*([^*]+):\*\*\s*(.+)/);
    if (messageMatch) {
      const agent = messageMatch[1].trim();
      const msg = messageMatch[2].trim();
      const msgDate = currentDate || new Date().toISOString().split('T')[0];
      
      // Generate timestamp based on date and position
      const idx = dateMessageIndices[msgDate] || 0;
      const total = dateMessageCounts[msgDate] || 1;
      const timestamp = generateTimestamp(msgDate, idx, total);
      dateMessageIndices[msgDate] = idx + 1;
      
      messages.push({
        id: `msg-${messageId++}`,
        agent,
        message: msg,
        timestamp,
        date: currentDate || undefined,
      });
    }
  }
  
  return { messages, currentDate };
}

export async function GET() {
  try {
    const content = await fs.readFile(CHAT_FILE, 'utf-8');
    const { messages } = parseChat(content);
    
    return NextResponse.json({ 
      messages,
      // Could add cursor-based pagination later
      // nextCursor: messages.length > 0 ? messages[messages.length - 1].id : undefined
    });
  } catch (error) {
    console.error('Error reading chat:', error);
    return NextResponse.json({ messages: [] });
  }
}
