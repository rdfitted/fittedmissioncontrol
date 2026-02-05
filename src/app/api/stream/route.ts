import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.clawdbot', 'agents', 'main', 'sessions');

interface SessionState {
  updatedAt: number;
  totalTokens: number;
  status: string;
}

/**
 * Server-Sent Events endpoint for real-time agent updates.
 * 
 * Polls the sessions directory and emits events when:
 * - Agent status changes
 * - New agents spawn
 * - Agents terminate
 * - Token usage changes significantly
 * 
 * Client usage:
 * ```typescript
 * const eventSource = new EventSource('/api/stream');
 * eventSource.onmessage = (e) => {
 *   const data = JSON.parse(e.data);
 *   console.log('Update:', data);
 * };
 * eventSource.addEventListener('agent_spawn', (e) => { ... });
 * eventSource.addEventListener('agent_update', (e) => { ... });
 * eventSource.addEventListener('agent_remove', (e) => { ... });
 * eventSource.addEventListener('alert', (e) => { ... });
 * ```
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Track previous state to detect changes
  let previousState: Map<string, SessionState> = new Map();
  let isConnected = true;
  
  // Cleanup on disconnect
  request.signal.addEventListener('abort', () => {
    isConnected = false;
  });
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          isConnected = false;
        }
      };
      
      // Send initial connection event
      sendEvent('connected', { timestamp: Date.now(), message: 'Connected to agent stream' });
      
      const pollInterval = 2000; // 2 seconds
      
      const poll = async () => {
        if (!isConnected) return;
        
        try {
          const sessionsPath = path.join(SESSIONS_DIR, 'sessions.json');
          const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
          const sessions = JSON.parse(sessionsContent);
          
          const currentKeys = new Set(Object.keys(sessions));
          const previousKeys = new Set(previousState.keys());
          
          // Detect new agents (spawned)
          for (const key of currentKeys) {
            if (!previousKeys.has(key)) {
              const session = sessions[key];
              sendEvent('agent_spawn', {
                id: key,
                sessionId: session.sessionId,
                model: session.model,
                timestamp: Date.now(),
              });
            }
          }
          
          // Detect removed agents
          for (const key of previousKeys) {
            if (!currentKeys.has(key)) {
              sendEvent('agent_remove', {
                id: key,
                timestamp: Date.now(),
              });
            }
          }
          
          // Detect updates to existing agents
          for (const key of currentKeys) {
            const session = sessions[key];
            const prev = previousState.get(key);
            
            if (prev) {
              const now = Date.now();
              
              // Detect activity (updatedAt changed)
              if (session.updatedAt !== prev.updatedAt) {
                const newStatus = determineStatus(session.updatedAt);
                const oldStatus = prev.status;
                
                sendEvent('agent_update', {
                  id: key,
                  sessionId: session.sessionId,
                  updatedAt: session.updatedAt,
                  status: newStatus,
                  statusChanged: newStatus !== oldStatus,
                  timestamp: now,
                });
              }
              
              // Detect significant token usage increase (>1000 tokens)
              if (session.totalTokens - prev.totalTokens > 1000) {
                sendEvent('token_usage', {
                  id: key,
                  totalTokens: session.totalTokens,
                  delta: session.totalTokens - prev.totalTokens,
                  timestamp: now,
                });
              }
            }
          }
          
          // Update previous state
          previousState = new Map();
          for (const [key, session] of Object.entries(sessions)) {
            const s = session as { updatedAt: number; totalTokens?: number };
            previousState.set(key, {
              updatedAt: s.updatedAt,
              totalTokens: s.totalTokens || 0,
              status: determineStatus(s.updatedAt),
            });
          }
        } catch (error) {
          sendEvent('error', {
            message: 'Failed to read sessions',
            error: String(error),
            timestamp: Date.now(),
          });
        }
        
        // Schedule next poll
        if (isConnected) {
          setTimeout(poll, pollInterval);
        }
      };
      
      // Start polling
      await poll();
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (!isConnected) {
          clearInterval(heartbeat);
          return;
        }
        sendEvent('heartbeat', { timestamp: Date.now() });
      }, 30000);
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function determineStatus(updatedAt: number): string {
  const now = Date.now();
  const ageMs = now - updatedAt;
  const FIVE_MINUTES = 5 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;
  
  if (ageMs < FIVE_MINUTES) return 'active';
  if (ageMs < ONE_HOUR) return 'idle';
  return 'stale';
}
