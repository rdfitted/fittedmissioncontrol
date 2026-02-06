# Task Schema Reference

Task files are stored as JSON in `squad/tasks/json/*.json`. Each file represents one task.

## Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier (e.g., `task-1738856160000-abc123`) |
| `title` | string | ✅ | Human-readable task title |
| `description` | string | | Detailed description (supports markdown) |
| `status` | TaskStatus | ✅ | Current workflow state |
| `priority` | Priority | ✅ | Importance level |
| `assigned` | string | | Agent name responsible for task |
| `category` | TaskCategory | | Filter category (`dev`, `marketing`, `both`) |
| `createdAt` | number | ✅ | Unix timestamp (ms) when created |
| `updatedAt` | number | ✅ | Unix timestamp (ms) of last update |

## Status Values (TaskStatus)

```typescript
type TaskStatus = 
  | 'backlog'      // Not started
  | 'in-progress'  // Actively being worked
  | 'blocked'      // Waiting on something
  | 'review'       // Ready for review
  | 'ready'        // Approved, waiting for implementation
  | 'completed'    // Done
  | 'archived';    // Removed from active view
```

### Status Workflow

```
backlog → in-progress → review → ready → completed → archived
              ↓           ↓
           blocked     blocked
```

**Blocked:** Can occur from `in-progress` or `review`. Requires `blockedBy` reason.

**Ready Gate:** Moving to `ready` requires participant approval (see Workflow Enforcement below).

## Priority Values

```typescript
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

Display order: critical → high → medium → low

## Completion Fields

| Field | Type | Description |
|-------|------|-------------|
| `completedAt` | number | Unix timestamp (ms) when status became `completed` |
| `completedBy` | string | Agent who completed the task |
| `deliverable` | string | Link or description of final deliverable |

## Blocked Fields

| Field | Type | Description |
|-------|------|-------------|
| `blockedBy` | string | Human-readable reason for block |
| `blockedAt` | number | Unix timestamp (ms) when block started |

## Chat Thread

Every task has an embedded chat thread for discussion:

```typescript
interface ChatMessage {
  id: string;        // e.g., "msg-1738856160000-xyz789"
  author: string;    // Agent name or "Ryan"
  content: string;   // Message text (supports markdown)
  timestamp: number; // Unix ms
}
```

**Field:** `chat: ChatMessage[]`

## Subtasks

Tasks can have nested subtasks:

```typescript
interface Subtask {
  id: string;           // e.g., "sub-001"
  title: string;        // Subtask description
  status: 'backlog' | 'active' | 'complete';
  assigned?: string;    // Agent responsible
  delegatedBy?: string; // Who assigned it
  delegatedAt?: number; // When assigned (Unix ms)
}
```

**Field:** `subtasks?: Subtask[]`

## Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Categorization tags (e.g., `["mission-control", "bug"]`) |
| `files` | string[] | File paths this task touches (for conflict detection) |
| `position` | number | Sort order within Kanban column (lower = higher) |
| `source` | string | Where this task came from (e.g., "Weekly Planning 2026-02-06") |

## Workflow Enforcement (mc-002)

### Participants

**Field:** `participants?: string[]`

List of agents/humans who have contributed to discussion. Used for `ready` gate validation.

### Ready Eligibility

To move a task to `ready` status, it must have:
1. **Ryan** and **Hex** as participants
2. At least one manager (**Knox** or **Sterling**)
3. Minimum 4 total participants

### Emergency Override

Ryan can bypass the `ready` gate for urgent items:

```typescript
interface EmergencyOverride {
  authorizedBy: string;  // Must be "ryan"
  reason: string;        // Required explanation
  timestamp: number;     // When override was authorized
  bypassedState?: string; // Which gate was skipped
}
```

**Field:** `emergencyOverride?: EmergencyOverride`

### State History

Audit trail of all status changes:

```typescript
interface StateHistoryEntry {
  state: string;     // The new status
  timestamp: number; // When changed
  actor: string;     // Who triggered change
}
```

**Field:** `stateHistory?: StateHistoryEntry[]`

## Example Task File

```json
{
  "id": "gvb-230-sendgrid-notifications",
  "title": "GVB: Implement SendGrid email notifications",
  "description": "Set up transactional emails for booking confirmations.",
  "status": "in-progress",
  "priority": "high",
  "assigned": "vault",
  "category": "dev",
  "createdAt": 1738856160000,
  "updatedAt": 1738942560000,
  "tags": ["gvb", "email", "notifications"],
  "files": ["src/lib/email.ts", "src/api/bookings/route.ts"],
  "participants": ["ryan", "hex", "knox", "vault"],
  "chat": [
    {
      "id": "msg-001",
      "author": "knox",
      "content": "@vault — You're up. API key is in Railway env vars.",
      "timestamp": 1738860000000
    }
  ],
  "subtasks": [
    {
      "id": "sub-001",
      "title": "Set up SendGrid client",
      "status": "complete",
      "assigned": "vault"
    },
    {
      "id": "sub-002",
      "title": "Create email templates",
      "status": "active",
      "assigned": "vault"
    }
  ]
}
```

## File Naming Convention

Task files should follow the pattern: `{project}-{issue#}-{slug}.json`

Examples:
- `gvb-230-sendgrid-notifications.json`
- `mc-011-task-state-consolidation.json`
- `ubs-124-apprentice-attribution.json`

For tasks without a linked issue, use descriptive slugs:
- `research-ar-automation.json`
- `content-315k-article.json`
