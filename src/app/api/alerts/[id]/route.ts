import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || path.join(os.homedir(), 'Code Projects');
const ALERTS_FILE = path.join(WORKSPACE_PATH, 'squad', 'alerts', 'alerts.json');

interface Alert {
  id: string;
  priority: 'info' | 'needs-input' | 'blocked' | 'urgent';
  agent: string;
  message: string;
  details?: string;
  taskId?: string;
  taskTitle?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  type?: string;
  severity?: string;
  sessionId?: string;
}

interface AlertsStore {
  alerts: Alert[];
  dismissedPatterns: string[];
  lastUpdated: number | null;
}

async function readAlertsStore(): Promise<AlertsStore> {
  try {
    const content = await fs.readFile(ALERTS_FILE, 'utf-8');
    const store = JSON.parse(content);
    return { alerts: store.alerts || [], dismissedPatterns: store.dismissedPatterns || [], lastUpdated: store.lastUpdated };
  } catch {
    return { alerts: [], dismissedPatterns: [], lastUpdated: null };
  }
}

// Extract pattern from auto-alert ID for dismissal tracking
function getAutoAlertPattern(alertId: string): string | null {
  if (!alertId.startsWith('auto-')) return null;
  const parts = alertId.split('-');
  if (parts.length < 3) return null;
  if (/^\d+$/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join('-');
}

async function writeAlertsStore(store: AlertsStore): Promise<void> {
  store.lastUpdated = Date.now();
  await fs.writeFile(ALERTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// GET: Get a single alert by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const store = await readAlertsStore();
    const alert = store.alerts.find(a => a.id === id);
    
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    
    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 });
  }
}

// PATCH: Update an alert (mark resolved, update priority, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const store = await readAlertsStore();
    
    // Check if this is an auto-alert being resolved
    const autoPattern = getAutoAlertPattern(id);
    if (autoPattern && body.resolved === true) {
      // Dismiss the pattern so it won't re-appear
      if (!store.dismissedPatterns.includes(autoPattern)) {
        store.dismissedPatterns.push(autoPattern);
        await writeAlertsStore(store);
      }
      return NextResponse.json({ success: true, dismissedPattern: autoPattern });
    }
    
    // Regular persistent alert
    const alertIndex = store.alerts.findIndex(a => a.id === id);
    
    if (alertIndex === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    
    const alert = store.alerts[alertIndex];
    
    // Update allowed fields
    if (typeof body.resolved === 'boolean') {
      alert.resolved = body.resolved;
      if (body.resolved) {
        alert.resolvedAt = Date.now();
        alert.resolvedBy = body.resolvedBy || 'human';
      } else {
        delete alert.resolvedAt;
        delete alert.resolvedBy;
      }
    }
    
    if (body.priority && ['info', 'needs-input', 'blocked', 'urgent'].includes(body.priority)) {
      alert.priority = body.priority;
    }
    
    if (body.details !== undefined) {
      alert.details = body.details;
    }
    
    store.alerts[alertIndex] = alert;
    await writeAlertsStore(store);
    
    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// DELETE: Remove an alert entirely (or dismiss auto-alert pattern)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const store = await readAlertsStore();
    
    // Check if this is an auto-alert (pattern-based dismissal)
    const autoPattern = getAutoAlertPattern(id);
    if (autoPattern) {
      // Add pattern to dismissed list if not already there
      if (!store.dismissedPatterns.includes(autoPattern)) {
        store.dismissedPatterns.push(autoPattern);
        await writeAlertsStore(store);
      }
      return NextResponse.json({ success: true, dismissedPattern: autoPattern });
    }
    
    // Regular persistent alert - remove from array
    const alertIndex = store.alerts.findIndex(a => a.id === id);
    
    if (alertIndex === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    
    const removed = store.alerts.splice(alertIndex, 1)[0];
    await writeAlertsStore(store);
    
    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
