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
