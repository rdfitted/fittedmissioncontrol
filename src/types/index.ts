// Re-export types from api-types for convenience
export type {
  AgentType,
  AgentStatus,
  AgentSession,
  AgentsResponse,
  AlertType,
  AlertSeverity,
  Alert,
  AlertsResponse,
  AgentTreeNode,
  StreamEvent,
} from '@/lib/api-types';

export { buildAgentTree } from '@/lib/api-types';

// Additional UI-specific types
export interface Task {
  id: string;
  title: string;
  assigned?: string;
  priority?: 'High' | 'Medium' | 'Low';
  description?: string;
  deliverable?: string;
  completedBy?: string;
  date?: string;
  summary?: string;
}

export interface ChatMessage {
  agent: string;
  message: string;
  date?: string;
  timestamp?: string;
}

export interface ActivityItem {
  type: 'file_change' | 'task_update' | 'chat_message' | 'agent_spawn' | 'agent_remove';
  description: string;
  timestamp: Date | string;
  file?: string;
  agentId?: string;
}
