# Mission Control API

Backend APIs for the Mission Control dashboard, providing real-time agent monitoring and alerts.

## Endpoints

### GET `/api/agents`

Returns the current list of all Clawdbot agents with their status and hierarchy.

**Response:**
```typescript
interface AgentsResponse {
  agents: AgentSession[];
  totalAgents: number;
  activeAgents: number;
  timestamp: number;
}

interface AgentSession {
  id: string;              // Session key (e.g., "agent:main:main")
  sessionId: string;       // UUID of the session
  name: string;            // Human-readable name
  type: 'main' | 'subagent' | 'cron';
  status: 'active' | 'idle' | 'stale' | 'error';
  model: string;           // Model ID (e.g., "claude-opus-4-5")
  modelProvider: string;   // Provider (e.g., "anthropic")
  parent?: string;         // Parent session key
  children: string[];      // Child session keys
  updatedAt: number;       // Unix timestamp (ms)
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  channel?: string;        // Communication channel (e.g., "whatsapp")
  label?: string;          // Custom label
  lastMessage?: string;    // Last ~200 chars of assistant message
  errorState?: boolean;    // True if errors detected
  needsHumanInput?: boolean; // True if help patterns detected
}
```

**Status determination:**
- `active`: Updated within last 5 minutes
- `idle`: Updated within last hour
- `stale`: Not updated for over an hour
- `error`: Errors detected in transcript

---

### GET `/api/alerts`

Returns alerts for agents needing human intervention.

**Response:**
```typescript
interface AlertsResponse {
  alerts: Alert[];
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  timestamp: number;
}

interface Alert {
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
```

**Alert types:**
- `error`: Errors detected in transcript (tool failures, exceptions)
- `stuck`: Agent idle for 30+ minutes
- `help_needed`: Patterns like "I need help", "stuck", "cannot proceed"
- `high_token_usage`: Over 100k tokens consumed
- `long_running`: (Reserved for future use)

---

### GET `/api/stream` (Server-Sent Events)

Real-time event stream for agent updates.

**Connection:**
```typescript
const eventSource = new EventSource('/api/stream');

eventSource.addEventListener('connected', (e) => {
  console.log('Connected:', JSON.parse(e.data));
});

eventSource.addEventListener('agent_spawn', (e) => {
  const data = JSON.parse(e.data);
  // { id, sessionId, model, timestamp }
});

eventSource.addEventListener('agent_remove', (e) => {
  const data = JSON.parse(e.data);
  // { id, timestamp }
});

eventSource.addEventListener('agent_update', (e) => {
  const data = JSON.parse(e.data);
  // { id, sessionId, updatedAt, status, statusChanged, timestamp }
});

eventSource.addEventListener('token_usage', (e) => {
  const data = JSON.parse(e.data);
  // { id, totalTokens, delta, timestamp }
});

eventSource.addEventListener('heartbeat', (e) => {
  // { timestamp } - sent every 30 seconds
});

eventSource.addEventListener('error', (e) => {
  // { message, error, timestamp }
});
```

**Polling interval:** 2 seconds
**Heartbeat interval:** 30 seconds

---

## Task Management

### GET `/api/tasks`

List all active tasks from `squad/tasks/json/*.json`.

**Query Parameters:**
- `status`: Filter by status (`backlog`, `in-progress`, `completed`)
- `assigned`: Filter by assigned agent
- `priority`: Filter by priority (`low`, `medium`, `high`, `critical`)

**Response:**
```typescript
interface TasksResponse {
  tasks: Task[];
  grouped: {
    backlog: Task[];
    inProgress: Task[];
    completed: Task[];
  };
  total: number;
  timestamp: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'in-progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned?: string;
  deliverable?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  completedBy?: string;
  tags?: string[];
  chat: ChatMessage[];
}

interface ChatMessage {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}
```

---

### POST `/api/tasks`

Create a new task.

**Request Body:**
```json
{
  "title": "Task title (required)",
  "description": "Task description",
  "priority": "high",
  "assigned": "Backend",
  "deliverable": "What the output should be",
  "tags": ["api", "urgent"]
}
```

---

### GET `/api/tasks/[id]`

Get a single task with its full chat thread.

---

### PATCH `/api/tasks/[id]`

Update a task's status, assignment, or other fields.

**Request Body (all optional):**
```json
{
  "status": "in-progress",
  "priority": "high",
  "assigned": "Frontend",
  "completedBy": "Backend"
}
```

---

### DELETE `/api/tasks/[id]`

Archive a task (soft delete — moves to `archived/` directory).

---

### GET `/api/tasks/[id]/chat`

Get the chat thread for a task.

---

### POST `/api/tasks/[id]/chat`

Add a message to the task chat thread.

**Request Body:**
```json
{
  "author": "Backend",
  "content": "API is ready for testing"
}
```

---

## Personal Todos

### GET `/api/todos`

Get Ryan's personal todo list.

**Response:**
```typescript
interface TodosResponse {
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

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}
```

---

### POST `/api/todos`

Add a new todo item.

**Request Body:**
```json
{
  "text": "Review API contracts"
}
```

---

### PATCH `/api/todos/[id]`

Toggle todo completion (zero-token operation — no body required).

---

### DELETE `/api/todos/[id]`

Delete a todo permanently.

---

## Data Sources

All data is read from Clawdbot's session files:

- **Session metadata:** `~/.clawdbot/agents/main/sessions/sessions.json`
- **Transcripts:** `~/.clawdbot/agents/main/sessions/{sessionId}.jsonl`

The APIs parse JSONL transcript files to detect:
- Error states (tool failures, error messages)
- Help patterns in assistant messages
- Activity timestamps

---

## React Hooks

The `src/hooks/use-agents.ts` file provides ready-to-use hooks:

```typescript
// Basic polling (5s interval)
const { agents, tree, lifecycle, loading, error, connected, stats, refresh } = useAgents();

// Alerts polling (10s interval)
const { alerts, loading, error, counts, refresh } = useAlerts();

// Real-time SSE stream
const { connected, lastHeartbeat, disconnect } = useAgentStream({
  onSpawn: (data) => {},
  onRemove: (data) => {},
  onUpdate: (data) => {},
  onTokenUsage: (data) => {},
  onError: (error) => {},
});

// Combined polling + streaming
const { agents, tree, lifecycle, loading, error, connected, stats, refresh } = useAgentsRealtime();
```

---

## Types

All types are exported from `src/lib/api-types.ts`:

```typescript
import {
  AgentSession,
  AgentTreeNode,
  AgentsResponse,
  Alert,
  AlertsResponse,
  buildAgentTree, // Utility to build hierarchy tree
} from '@/lib/api-types';
```
