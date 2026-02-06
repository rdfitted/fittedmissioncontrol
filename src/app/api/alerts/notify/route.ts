import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || path.join(os.homedir(), 'Code Projects');
const ALERTS_FILE = path.join(WORKSPACE_PATH, 'squad', 'alerts', 'alerts.json');
const PENDING_NOTIFICATIONS_FILE = path.join(WORKSPACE_PATH, 'squad', 'alerts', 'pending-notifications.json');

// This endpoint creates an alert AND queues urgent ones for WhatsApp dispatch
// Designed to be called by agents via HTTP or internal tooling

interface AlertRequest {
  agent: string;
  message: string;
  priority?: 'info' | 'needs-input' | 'blocked' | 'urgent';
  details?: string;
  taskId?: string;
  taskTitle?: string;
  targetAgent?: string;
}

interface Alert {
  id: string;
  priority: 'info' | 'needs-input' | 'blocked' | 'urgent';
  agent: string;
  targetAgent: string;
  message: string;
  details?: string;
  taskId?: string;
  taskTitle?: string;
  timestamp: number;
  resolved: boolean;
  notificationQueued?: boolean;
}

interface PendingNotification {
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
}

interface AlertsStore {
  alerts: Alert[];
  lastUpdated: number | null;
}

async function readAlertsStore(): Promise<AlertsStore> {
  try {
    const content = await fs.readFile(ALERTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { alerts: [], lastUpdated: null };
  }
}

async function writeAlertsStore(store: AlertsStore): Promise<void> {
  store.lastUpdated = Date.now();
  await fs.writeFile(ALERTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// Queue notification for WhatsApp dispatch by cron job
async function queueWhatsAppNotification(alert: Alert): Promise<boolean> {
  try {
    let pending: PendingNotification[] = [];
    try {
      const content = await fs.readFile(PENDING_NOTIFICATIONS_FILE, 'utf-8');
      pending = JSON.parse(content);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
    
    // Format the notification for WhatsApp
    const notification: PendingNotification = {
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

export async function POST(request: NextRequest) {
  try {
    const body: AlertRequest = await request.json();
    
    if (!body.agent || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, message' },
        { status: 400 }
      );
    }
    
    const priority = body.priority && ['info', 'needs-input', 'blocked', 'urgent'].includes(body.priority)
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
    
    // Save to persistent store
    const store = await readAlertsStore();
    store.alerts.push(alert);
    await writeAlertsStore(store);
    
    // Queue WhatsApp notification for urgent alerts targeting Ryan
    let notificationQueued = false;
    if (priority === 'urgent' && (alert.targetAgent === 'ryan' || !alert.targetAgent)) {
      notificationQueued = await queueWhatsAppNotification(alert);
      alert.notificationQueued = notificationQueued;
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

// GET: Check pending notifications (for dispatch cron to read)
export async function GET() {
  try {
    let pending: PendingNotification[] = [];
    try {
      const content = await fs.readFile(PENDING_NOTIFICATIONS_FILE, 'utf-8');
      pending = JSON.parse(content);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
    
    return NextResponse.json({
      pending,
      count: pending.length,
    });
  } catch (error) {
    console.error('Error reading pending notifications:', error);
    return NextResponse.json({ error: 'Failed to read pending notifications' }, { status: 500 });
  }
}

// DELETE: Clear pending notifications after dispatch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];
    
    if (ids.length === 0) {
      // Clear all
      await fs.writeFile(PENDING_NOTIFICATIONS_FILE, '[]', 'utf-8');
      return NextResponse.json({ success: true, cleared: 'all' });
    }
    
    // Remove specific IDs
    let pending: PendingNotification[] = [];
    try {
      const content = await fs.readFile(PENDING_NOTIFICATIONS_FILE, 'utf-8');
      pending = JSON.parse(content);
      if (!Array.isArray(pending)) pending = [];
    } catch {
      pending = [];
    }
    
    const remaining = pending.filter(n => !ids.includes(n.id));
    await fs.writeFile(PENDING_NOTIFICATIONS_FILE, JSON.stringify(remaining, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true, 
      cleared: ids.length,
      remaining: remaining.length,
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
