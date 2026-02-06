'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AgentSession,
  AgentsResponse,
  AgentTreeNode,
  buildAgentTree,
  Alert,
  AlertsResponse,
  StreamEvent,
} from '@/lib/api-types';

// ============================================================
// Lifecycle Event Types (for activity feed)
// ============================================================

export interface AgentLifecycleEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: 'spawned' | 'terminated' | 'status_change';
  timestamp: string;
  details?: string;
  parentId?: string;
  parentName?: string;
}

function generateLifecycleEvents(agents: AgentSession[]): AgentLifecycleEvent[] {
  const events: AgentLifecycleEvent[] = [];
  const agentMap = new Map(agents.map(a => [a.id, a]));
  
  agents.forEach(agent => {
    events.push({
      id: `${agent.id}-activity`,
      agentId: agent.id,
      agentName: agent.name,
      type: agent.status === 'active' ? 'spawned' : 
            agent.status === 'error' ? 'terminated' : 'status_change',
      timestamp: new Date(agent.updatedAt).toISOString(),
      details: agent.lastMessage?.slice(0, 80),
      parentId: agent.parent,
      parentName: agent.parent ? agentMap.get(agent.parent)?.name : undefined,
    });
  });
  
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, 20);
}

// ============================================================
// useAgents - Fetch agent list with auto-refresh
// ============================================================

export function useAgents(refreshInterval = 5000) {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const [tree, setTree] = useState<AgentTreeNode[]>([]);
  const [lifecycle, setLifecycle] = useState<AgentLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data: AgentsResponse = await res.json();
      
      const agentTree = buildAgentTree(data.agents);
      const lifecycleEvents = generateLifecycleEvents(data.agents);
      
      setAgents(data.agents);
      setTree(agentTree);
      setLifecycle(lifecycleEvents);
      setStats({ total: data.totalAgents, active: data.activeAgents });
      setConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAgents, refreshInterval]);

  return { agents, tree, lifecycle, loading, error, connected, stats, refresh: fetchAgents };
}

// ============================================================
// useAlerts - Fetch alerts with auto-refresh
// ============================================================

export function useAlerts(refreshInterval = 10000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: 0, critical: 0, high: 0 });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data: AlertsResponse = await res.json();
      setAlerts(data.alerts);
      setCounts({
        total: data.totalAlerts,
        critical: data.criticalCount ?? 0,
        high: data.highCount ?? 0,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAlerts, refreshInterval]);

  return { alerts, loading, error, counts, refresh: fetchAlerts };
}

// ============================================================
// useAgentStream - Real-time SSE stream
// ============================================================

interface UseAgentStreamOptions {
  onSpawn?: (data: { id: string; sessionId: string; model: string; timestamp: number }) => void;
  onRemove?: (data: { id: string; timestamp: number }) => void;
  onUpdate?: (data: { id: string; sessionId: string; updatedAt: number; status: string; statusChanged: boolean; timestamp: number }) => void;
  onTokenUsage?: (data: { id: string; totalTokens: number; delta: number; timestamp: number }) => void;
  onError?: (error: string) => void;
}

export function useAgentStream(options: UseAgentStreamOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Use refs to avoid stale closures - callbacks always get latest version
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      setConnected(true);
    });

    eventSource.addEventListener('heartbeat', (e) => {
      const data = JSON.parse(e.data);
      setLastHeartbeat(data.timestamp);
    });

    eventSource.addEventListener('agent_spawn', (e) => {
      const data = JSON.parse(e.data);
      optionsRef.current.onSpawn?.(data);
    });

    eventSource.addEventListener('agent_remove', (e) => {
      const data = JSON.parse(e.data);
      optionsRef.current.onRemove?.(data);
    });

    eventSource.addEventListener('agent_update', (e) => {
      const data = JSON.parse(e.data);
      optionsRef.current.onUpdate?.(data);
    });

    eventSource.addEventListener('token_usage', (e) => {
      const data = JSON.parse(e.data);
      optionsRef.current.onTokenUsage?.(data);
    });

    eventSource.addEventListener('error', (e) => {
      if (e instanceof MessageEvent) {
        const data = JSON.parse(e.data);
        optionsRef.current.onError?.(data.message);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, []);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    setConnected(false);
  }, []);

  return { connected, lastHeartbeat, disconnect };
}

// ============================================================
// useAgentsRealtime - Combined polling + streaming
// ============================================================

export function useAgentsRealtime() {
  const { agents, tree, lifecycle, loading, error, connected, stats, refresh } = useAgents(10000);
  const [realtimeAgents, setRealtimeAgents] = useState<AgentSession[]>([]);

  useEffect(() => {
    setRealtimeAgents(agents);
  }, [agents]);

  useAgentStream({
    onSpawn: () => refresh(),
    onRemove: (data) => {
      setRealtimeAgents((prev) => prev.filter((a) => a.id !== data.id));
    },
    onUpdate: () => refresh(),
  });

  return {
    agents: realtimeAgents,
    tree,
    lifecycle,
    loading,
    error,
    connected,
    stats,
    refresh,
  };
}
