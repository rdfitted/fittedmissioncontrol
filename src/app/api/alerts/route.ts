import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.clawdbot', 'agents', 'main', 'sessions');

export interface Alert {
  id: string;
  type: 'error' | 'stuck' | 'help_needed' | 'long_running' | 'high_token_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId: string;
  agentName: string;
  sessionId: string;
  message: string;
  details?: string;
  timestamp: number;
  acknowledged: boolean;
}

interface SessionsJson {
  [key: string]: {
    sessionId: string;
    updatedAt: number;
    model?: string;
    totalTokens?: number;
    abortedLastRun?: boolean;
  };
}

interface TranscriptEntry {
  type: string;
  timestamp: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
  details?: {
    status?: string;
    error?: string;
  };
}

function parseSessionKey(key: string): { type: string; name: string } {
  const parts = key.split(':');
  
  if (parts[2] === 'main') {
    return { type: 'main', name: 'Main Agent' };
  }
  if (parts[2] === 'subagent') {
    return { type: 'subagent', name: `Subagent ${parts[3]?.slice(0, 8) || 'unknown'}` };
  }
  if (parts[2] === 'cron') {
    return { type: 'cron', name: `Cron ${parts[3]?.slice(0, 8) || 'unknown'}` };
  }
  
  return { type: 'unknown', name: key };
}

async function analyzeTranscriptForAlerts(
  agentId: string,
  agentName: string,
  sessionId: string
): Promise<Alert[]> {
  const transcriptPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
  const alerts: Alert[] = [];
  
  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    // Parse last 100 lines
    const recentLines = lines.slice(-100);
    let lastActivityTs = 0;
    let errorCount = 0;
    let lastError: string | null = null;
    let helpRequested = false;
    let helpMessage: string | null = null;
    
    for (const line of recentLines) {
      try {
        const entry: TranscriptEntry = JSON.parse(line);
        const entryTs = new Date(entry.timestamp).getTime();
        
        if (entryTs > lastActivityTs) {
          lastActivityTs = entryTs;
        }
        
        // Check for errors
        if (entry.details?.status === 'error' || entry.details?.error) {
          errorCount++;
          lastError = entry.details?.error || 'Unknown error';
        }
        
        // Check for help patterns in assistant messages
        if (entry.type === 'message' && entry.message?.role === 'assistant') {
          const textContent = entry.message.content?.find(c => c.type === 'text');
          if (textContent?.text) {
            const text = textContent.text;
            
            const helpPatterns = [
              { pattern: /I need.*help/i, msg: 'Agent explicitly requested help' },
              { pattern: /I('m| am) stuck/i, msg: 'Agent reports being stuck' },
              { pattern: /cannot proceed/i, msg: 'Agent cannot proceed' },
              { pattern: /waiting for.*input/i, msg: 'Agent waiting for input' },
              { pattern: /please.*confirm/i, msg: 'Agent needs confirmation' },
              { pattern: /I don't know how to/i, msg: 'Agent uncertain about approach' },
              { pattern: /error.*occurred/i, msg: 'Agent encountered an error' },
              { pattern: /failed to/i, msg: 'Agent task failed' },
              { pattern: /unable to (access|find|complete)/i, msg: 'Agent unable to complete task' },
              { pattern: /permission denied/i, msg: 'Permission issue detected' },
            ];
            
            for (const { pattern, msg } of helpPatterns) {
              if (pattern.test(text) && !helpRequested) {
                helpRequested = true;
                helpMessage = msg;
                break;
              }
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    const now = Date.now();
    
    // Generate alerts based on analysis
    
    // Error alert
    if (errorCount > 0) {
      alerts.push({
        id: `${sessionId}-error-${now}`,
        type: 'error',
        severity: errorCount > 3 ? 'critical' : errorCount > 1 ? 'high' : 'medium',
        agentId,
        agentName,
        sessionId,
        message: `${errorCount} error(s) detected in recent activity`,
        details: lastError || undefined,
        timestamp: now,
        acknowledged: false,
      });
    }
    
    // Help needed alert
    if (helpRequested && helpMessage) {
      alerts.push({
        id: `${sessionId}-help-${now}`,
        type: 'help_needed',
        severity: 'high',
        agentId,
        agentName,
        sessionId,
        message: helpMessage,
        timestamp: now,
        acknowledged: false,
      });
    }
    
    // Long running check (no activity in 30+ minutes for non-cron)
    const THIRTY_MINUTES = 30 * 60 * 1000;
    if (lastActivityTs > 0 && now - lastActivityTs > THIRTY_MINUTES) {
      const idleMinutes = Math.round((now - lastActivityTs) / 60000);
      alerts.push({
        id: `${sessionId}-stuck-${now}`,
        type: 'stuck',
        severity: idleMinutes > 120 ? 'medium' : 'low',
        agentId,
        agentName,
        sessionId,
        message: `Agent idle for ${idleMinutes} minutes`,
        details: 'May be stuck or waiting for external input',
        timestamp: now,
        acknowledged: false,
      });
    }
  } catch {
    // Transcript file doesn't exist or can't be read
  }
  
  return alerts;
}

export async function GET() {
  try {
    // Read sessions.json
    const sessionsPath = path.join(SESSIONS_DIR, 'sessions.json');
    const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
    const sessions: SessionsJson = JSON.parse(sessionsContent);
    
    const allAlerts: Alert[] = [];
    
    for (const [key, session] of Object.entries(sessions)) {
      const parsed = parseSessionKey(key);
      
      // Skip very old/stale sessions from alert analysis
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (Date.now() - session.updatedAt > ONE_DAY) {
        continue;
      }
      
      // Check for aborted runs
      if (session.abortedLastRun) {
        allAlerts.push({
          id: `${session.sessionId}-aborted-${Date.now()}`,
          type: 'error',
          severity: 'high',
          agentId: key,
          agentName: parsed.name,
          sessionId: session.sessionId,
          message: 'Last run was aborted',
          details: 'The agent\'s previous execution was forcefully terminated',
          timestamp: session.updatedAt,
          acknowledged: false,
        });
      }
      
      // Check for high token usage (over 100k)
      if (session.totalTokens && session.totalTokens > 100000) {
        allAlerts.push({
          id: `${session.sessionId}-tokens-${Date.now()}`,
          type: 'high_token_usage',
          severity: session.totalTokens > 150000 ? 'high' : 'medium',
          agentId: key,
          agentName: parsed.name,
          sessionId: session.sessionId,
          message: `High token usage: ${(session.totalTokens / 1000).toFixed(1)}k tokens`,
          details: 'Consider compacting context or reviewing task scope',
          timestamp: session.updatedAt,
          acknowledged: false,
        });
      }
      
      // Analyze transcript for detailed alerts
      const transcriptAlerts = await analyzeTranscriptForAlerts(key, parsed.name, session.sessionId);
      allAlerts.push(...transcriptAlerts);
    }
    
    // Sort by severity then timestamp
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });
    
    return NextResponse.json({
      alerts: allAlerts,
      totalAlerts: allAlerts.length,
      criticalCount: allAlerts.filter(a => a.severity === 'critical').length,
      highCount: allAlerts.filter(a => a.severity === 'high').length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error analyzing alerts:', error);
    return NextResponse.json(
      { error: 'Failed to analyze alerts', alerts: [] },
      { status: 500 }
    );
  }
}
