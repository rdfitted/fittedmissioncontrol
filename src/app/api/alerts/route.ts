import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || path.join(os.homedir(), 'Code Projects');
const ALERTS_FILE = path.join(WORKSPACE_PATH, 'squad', 'alerts', 'alerts.json');
const PENDING_NOTIFICATIONS_FILE = path.join(WORKSPACE_PATH, 'squad', 'alerts', 'pending-notifications.json');
const SESSIONS_DIR = path.join(os.homedir(), '.clawdbot', 'agents', 'main', 'sessions');

// Priority levels per spec: info | needs-input | blocked | urgent
export type AlertPriority = 'info' | 'needs-input' | 'blocked' | 'urgent';

export interface Alert {
  id: string;
  priority: AlertPriority;
  agent: string;          // Agent name/id who created the alert
  targetAgent: string;    // Target agent for this alert (default: "ryan")
  message: string;        // Human-readable message
  details?: string;       // Optional additional context
  taskId?: string;        // Optional link to task
  taskTitle?: string;     // Optional task title for display
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  // Legacy fields for auto-detected alerts
  type?: 'error' | 'stuck' | 'help_needed' | 'long_running' | 'high_token_usage';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  sessionId?: string;
}

interface AlertsStore {
  alerts: Alert[];
  dismissedPatterns: string[];  // Track dismissed auto-alert patterns (e.g., "auto-sessionId-type")
  lastUpdated: number | null;
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

// Read persistent alerts from file
async function readAlertsStore(): Promise<AlertsStore> {
  try {
    const content = await fs.readFile(ALERTS_FILE, 'utf-8');
    const store = JSON.parse(content);
    return { alerts: store.alerts || [], dismissedPatterns: store.dismissedPatterns || [], lastUpdated: store.lastUpdated };
  } catch {
    return { alerts: [], dismissedPatterns: [], lastUpdated: null };
  }
}

// Extract pattern from auto-alert ID (e.g., "auto-sessionId-aborted-123" -> "auto-sessionId-aborted")
function getAutoAlertPattern(alertId: string): string | null {
  if (!alertId.startsWith('auto-')) return null;
  // Remove the timestamp suffix (last segment after final dash that's all digits)
  const parts = alertId.split('-');
  if (parts.length < 3) return null;
  // Remove last part if it's a timestamp (all digits)
  if (/^\d+$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join('-');
}

// Write alerts to file
async function writeAlertsStore(store: AlertsStore): Promise<void> {
  store.lastUpdated = Date.now();
  await fs.writeFile(ALERTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// Queue notification for WhatsApp dispatch by cron job
async function queueWhatsAppNotification(alert: Alert): Promise<boolean> {
  try {
    let pending: Array<{
      id: string;
      alertId: string;
      priority: string;
      agent: string;
      message: string;
      details?: string;
      taskId?: string;
      taskTitle?: string;
      queuedAt: number;
      channel: string;
      to: string;
    }> = [];
    
    try {
      const content = await fs.readFile(PENDING_NOTIFICATIONS_FILE, 'utf-8');
      pending = JSON.parse(content);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
    
    // Format the notification for WhatsApp
    const notification = {
      id: `notif-${randomUUID().slice(0, 8)}`,
      alertId: alert.id,
      priority: alert.priority,
      agent: alert.agent,
      message: alert.message,
      details: alert.details,
      taskId: alert.taskId,
      taskTitle: alert.taskTitle,
      queuedAt: Date.now(),
      channel: 'whatsapp',
      to: '+18088668332', // Ryan's WhatsApp
    };
    
    pending.push(notification);
    await fs.writeFile(PENDING_NOTIFICATIONS_FILE, JSON.stringify(pending, null, 2), 'utf-8');
    
    return true;
  } catch (error) {
    console.error('Failed to queue notification:', error);
    return false;
  }
}

// Parse session key for agent name
function parseSessionKey(key: string): { type: string; name: string } {
  const parts = key.split(':');
  if (parts[2] === 'main') return { type: 'main', name: 'Hex Prime' };
  if (parts[2] === 'subagent') return { type: 'subagent', name: `Subagent ${parts[3]?.slice(0, 8) || 'unknown'}` };
  if (parts[2] === 'cron') return { type: 'cron', name: `Cron ${parts[3]?.slice(0, 8) || 'unknown'}` };
  return { type: 'unknown', name: key };
}

// Analyze transcript for auto-detected alerts
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
        if (entryTs > lastActivityTs) lastActivityTs = entryTs;
        
        if (entry.details?.status === 'error' || entry.details?.error) {
          errorCount++;
          lastError = entry.details?.error || 'Unknown error';
        }
        
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
              { pattern: /@ryan/i, msg: 'Agent mentioned Ryan directly' },
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
    
    if (errorCount > 0) {
      alerts.push({
        id: `auto-${sessionId}-error-${now}`,
        priority: errorCount > 3 ? 'urgent' : 'needs-input',
        agent: agentName,
        targetAgent: 'ryan',
        message: `${errorCount} error(s) detected in recent activity`,
        details: lastError || undefined,
        timestamp: now,
        resolved: false,
        type: 'error',
        severity: errorCount > 3 ? 'critical' : errorCount > 1 ? 'high' : 'medium',
        sessionId,
      });
    }
    
    if (helpRequested && helpMessage) {
      alerts.push({
        id: `auto-${sessionId}-help-${now}`,
        priority: 'needs-input',
        agent: agentName,
        targetAgent: 'ryan',
        message: helpMessage,
        timestamp: now,
        resolved: false,
        type: 'help_needed',
        severity: 'high',
        sessionId,
      });
    }
    
    const THIRTY_MINUTES = 30 * 60 * 1000;
    if (lastActivityTs > 0 && now - lastActivityTs > THIRTY_MINUTES) {
      const idleMinutes = Math.round((now - lastActivityTs) / 60000);
      alerts.push({
        id: `auto-${sessionId}-stuck-${now}`,
        priority: idleMinutes > 60 ? 'blocked' : 'info',
        agent: agentName,
        targetAgent: 'ryan',
        message: `Agent idle for ${idleMinutes} minutes`,
        details: 'May be stuck or waiting for external input',
        timestamp: now,
        resolved: false,
        type: 'stuck',
        severity: idleMinutes > 120 ? 'medium' : 'low',
        sessionId,
      });
    }
  } catch {
    // Transcript file doesn't exist
  }
  
  return alerts;
}

// GET: List all pending alerts (persistent + auto-detected)
// Supports ?target=<agent> to filter alerts for a specific agent
export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    const { searchParams } = new URL(request.url);
    const targetFilter = searchParams.get('target');
    
    // Read persistent alerts
    const store = await readAlertsStore();
    const persistentAlerts = store.alerts.filter(a => !a.resolved);
    
    // Auto-detect alerts from sessions
    const autoAlerts: Alert[] = [];
    try {
      const sessionsPath = path.join(SESSIONS_DIR, 'sessions.json');
      const sessionsContent = await fs.readFile(sessionsPath, 'utf-8');
      const sessions: SessionsJson = JSON.parse(sessionsContent);
      
      for (const [key, session] of Object.entries(sessions)) {
        const parsed = parseSessionKey(key);
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (now - session.updatedAt > ONE_DAY) continue;
        
        if (session.abortedLastRun) {
          autoAlerts.push({
            id: `auto-${session.sessionId}-aborted-${now}`,
            priority: 'urgent',
            agent: parsed.name,
            targetAgent: 'ryan',
            message: 'Last run was aborted',
            details: 'The agent\'s previous execution was forcefully terminated',
            timestamp: session.updatedAt,
            resolved: false,
            type: 'error',
            severity: 'high',
            sessionId: session.sessionId,
          });
        }
        
        if (session.totalTokens && session.totalTokens > 100000) {
          autoAlerts.push({
            id: `auto-${session.sessionId}-tokens-${now}`,
            priority: session.totalTokens > 150000 ? 'needs-input' : 'info',
            agent: parsed.name,
            targetAgent: 'ryan',
            message: `High token usage: ${(session.totalTokens / 1000).toFixed(1)}k tokens`,
            details: 'Consider compacting context or reviewing task scope',
            timestamp: session.updatedAt,
            resolved: false,
            type: 'high_token_usage',
            severity: session.totalTokens > 150000 ? 'high' : 'medium',
            sessionId: session.sessionId,
          });
        }
        
        const transcriptAlerts = await analyzeTranscriptForAlerts(key, parsed.name, session.sessionId);
        autoAlerts.push(...transcriptAlerts);
      }
    } catch {
      // Sessions file not available
    }
    
    // Filter out auto-alerts that have been dismissed
    const filteredAutoAlerts = autoAlerts.filter(alert => {
      const pattern = getAutoAlertPattern(alert.id);
      return !pattern || !store.dismissedPatterns.includes(pattern);
    });
    
    // Merge and dedupe
    let allAlerts = [...persistentAlerts, ...filteredAutoAlerts];
    
    // Filter by target agent if specified
    if (targetFilter) {
      allAlerts = allAlerts.filter(a => (a.targetAgent || 'ryan') === targetFilter);
    }
    
    // Sort by priority then timestamp
    const priorityOrder = { urgent: 0, blocked: 1, 'needs-input': 2, info: 3 };
    allAlerts.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });
    
    return NextResponse.json({
      alerts: allAlerts,
      totalAlerts: allAlerts.length,
      urgentCount: allAlerts.filter(a => a.priority === 'urgent').length,
      blockedCount: allAlerts.filter(a => a.priority === 'blocked').length,
      needsInputCount: allAlerts.filter(a => a.priority === 'needs-input').length,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts', alerts: [] }, { status: 500 });
  }
}

// POST: Create a new alert (for agents to escalate to human)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.agent || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, message' },
        { status: 400 }
      );
    }
    
    const priority: AlertPriority = ['info', 'needs-input', 'blocked', 'urgent'].includes(body.priority) 
      ? body.priority 
      : 'info';
    
    const alert: Alert = {
      id: `alert-${randomUUID().slice(0, 8)}-${Date.now()}`,
      priority,
      agent: body.agent,
      targetAgent: body.targetAgent || 'ryan',
      message: body.message,
      details: body.details,
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      timestamp: Date.now(),
      resolved: false,
    };
    
    // Read, append, write
    const store = await readAlertsStore();
    store.alerts.push(alert);
    await writeAlertsStore(store);
    
    // Queue WhatsApp notification for urgent alerts targeting Ryan
    let notificationQueued = false;
    if (priority === 'urgent' && (alert.targetAgent === 'ryan' || !alert.targetAgent)) {
      notificationQueued = await queueWhatsAppNotification(alert);
    }
    
    return NextResponse.json({
      success: true,
      alert,
      notificationQueued,
      message: priority === 'urgent' 
        ? 'Alert created and queued for WhatsApp dispatch (next ~5 min)'
        : 'Alert created and visible in Mission Control',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}
