/**
 * API Types for Mission Control Dashboard
 * 
 * These types mirror the API responses for type-safe frontend consumption.
 */

// ============================================================
// Agent Types
// ============================================================

export type AgentType = 'main' | 'subagent' | 'cron';
export type AgentStatus = 'active' | 'idle' | 'stale' | 'error';

export interface AgentSession {
  id: string;
  sessionId: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  model: string;
  modelProvider: string;
  parent?: string;
  children: string[];
  updatedAt: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  channel?: string;
  label?: string;
  lastMessage?: string;
  errorState?: boolean;
  needsHumanInput?: boolean;
}

export interface AgentsResponse {
  agents: AgentSession[];
  totalAgents: number;
  activeAgents: number;
  timestamp: number;
}

// ============================================================
// Alert Types
// ============================================================

// New priority-based model per agent-communication-v2 spec
export type AlertPriority = 'info' | 'needs-input' | 'blocked' | 'urgent';

// Legacy types for auto-detected alerts
export type AlertType = 'error' | 'stuck' | 'help_needed' | 'long_running' | 'high_token_usage';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  priority: AlertPriority;
  agent: string;              // Agent name/id who created the alert
  targetAgent: string;        // Target agent for this alert (default: "ryan")
  message: string;            // Human-readable message
  details?: string;           // Optional additional context
  taskId?: string;            // Optional link to related task
  taskTitle?: string;         // Optional task title for display
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  // Legacy fields for auto-detected alerts
  type?: AlertType;
  severity?: AlertSeverity;
  sessionId?: string;
  // Deprecated - use 'agent' instead
  agentId?: string;
  agentName?: string;
  // Deprecated - use 'resolved' instead
  acknowledged?: boolean;
}

export interface AlertsResponse {
  alerts: Alert[];
  totalAlerts: number;
  urgentCount: number;
  blockedCount: number;
  needsInputCount: number;
  // Legacy fields
  criticalCount?: number;
  highCount?: number;
  timestamp: number;
}

// ============================================================
// Stream Event Types
// ============================================================

export interface StreamEventBase {
  timestamp: number;
}

export interface ConnectedEvent extends StreamEventBase {
  message: string;
}

export interface AgentSpawnEvent extends StreamEventBase {
  id: string;
  sessionId: string;
  model: string;
}

export interface AgentRemoveEvent extends StreamEventBase {
  id: string;
}

export interface AgentUpdateEvent extends StreamEventBase {
  id: string;
  sessionId: string;
  updatedAt: number;
  status: AgentStatus;
  statusChanged: boolean;
}

export interface TokenUsageEvent extends StreamEventBase {
  id: string;
  totalTokens: number;
  delta: number;
}

export interface HeartbeatEvent extends StreamEventBase {}

export interface ErrorEvent extends StreamEventBase {
  message: string;
  error: string;
}

export type StreamEvent =
  | { type: 'connected'; data: ConnectedEvent }
  | { type: 'agent_spawn'; data: AgentSpawnEvent }
  | { type: 'agent_remove'; data: AgentRemoveEvent }
  | { type: 'agent_update'; data: AgentUpdateEvent }
  | { type: 'token_usage'; data: TokenUsageEvent }
  | { type: 'heartbeat'; data: HeartbeatEvent }
  | { type: 'error'; data: ErrorEvent };

// ============================================================
// Task Types
// ============================================================

export type TaskStatus = 'backlog' | 'in-progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned?: string;
  deliverable?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  completedBy?: string;
  tags?: string[];
  chat: ChatMessage[];
}

export interface TasksResponse {
  tasks: Task[];
  grouped: {
    backlog: Task[];
    inProgress: Task[];
    completed: Task[];
  };
  total: number;
  timestamp: number;
}

// ============================================================
// Todo Types
// ============================================================

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface TodosResponse {
  todos: Todo[];
  active: Todo[];
  completed: Todo[];
  counts: {
    total: number;
    active: number;
    completed: number;
  };
  timestamp: number;
}

// ============================================================
// Hierarchy Tree Types (for visualization)
// ============================================================

export interface AgentTreeNode {
  agent: AgentSession;
  children: AgentTreeNode[];
  depth: number;
}

export function buildAgentTree(agents: AgentSession[]): AgentTreeNode[] {
  const agentMap = new Map<string, AgentSession>();
  agents.forEach(a => agentMap.set(a.id, a));
  
  const roots: AgentTreeNode[] = [];
  const nodeMap = new Map<string, AgentTreeNode>();
  
  // Create nodes
  agents.forEach(agent => {
    nodeMap.set(agent.id, {
      agent,
      children: [],
      depth: 0,
    });
  });
  
  // Build tree
  agents.forEach(agent => {
    const node = nodeMap.get(agent.id)!;
    
    if (agent.parent && nodeMap.has(agent.parent)) {
      const parentNode = nodeMap.get(agent.parent)!;
      parentNode.children.push(node);
      node.depth = parentNode.depth + 1;
    } else if (!agent.parent || agent.type === 'main') {
      roots.push(node);
    }
  });
  
  // Sort children by updatedAt
  const sortChildren = (node: AgentTreeNode) => {
    node.children.sort((a, b) => b.agent.updatedAt - a.agent.updatedAt);
    node.children.forEach(sortChildren);
  };
  
  roots.forEach(sortChildren);
  roots.sort((a, b) => {
    // Main agent always first
    if (a.agent.type === 'main') return -1;
    if (b.agent.type === 'main') return 1;
    return b.agent.updatedAt - a.agent.updatedAt;
  });
  
  return roots;
}
