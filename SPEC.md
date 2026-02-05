# Mission Control Task Management — Technical Specification

**Version:** 1.0  
**Author:** Knox (Architect)  
**Date:** 2026-02-08  
**Status:** Active

---

## Overview

This specification defines the task management system for Mission Control v2. The system replaces the traditional Kanban board with a **task-as-column** horizontal scroll layout where each task has its own embedded chat thread.

### Design Principles

1. **Task-centered conversations** — Discussions live with the task, not in a separate channel
2. **No "Completed" column** — Done tasks disappear (archived), keeping focus on active work
3. **Click-to-complete** — Zero friction, instant feedback, no confirmation dialogs
4. **Personal todos separate** — Collapsible drawer for Ryan's quick items
5. **File-based storage** — JSON files, git-friendly, agent-readable

---

## Data Models

### Task Interface

```typescript
interface Task {
  id: string;                    // Unique identifier (e.g., "MC-001")
  title: string;                 // Task title (required)
  description?: string;          // Detailed description (optional)
  status: TaskStatus;            // Current status
  priority: Priority;            // Priority level
  assignedTo: string[];          // Agent IDs assigned to this task
  createdBy: string;             // Agent or user who created the task
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  tags?: string[];               // Optional categorization tags
  chat: ChatMessage[];           // Embedded conversation thread
}

type TaskStatus = 'backlog' | 'active' | 'blocked' | 'review';
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

### ChatMessage Interface

```typescript
interface ChatMessage {
  id: string;                    // Unique message ID (e.g., "msg-001")
  agent: string;                 // Agent ID or "user" for human messages
  timestamp: string;             // ISO 8601 timestamp
  content: string;               // Message content (markdown supported)
}
```

### PersonalTodo Interface

```typescript
interface PersonalTodo {
  id: string;                    // Unique todo ID (e.g., "todo-001")
  text: string;                  // Todo item text
  completed: boolean;            // Completion status
  createdAt: string;             // ISO 8601 timestamp
  completedAt?: string;          // ISO 8601 timestamp (when completed)
}

interface PersonalTodoFile {
  owner: string;                 // Owner identifier
  updatedAt: string;             // Last update timestamp
  todos: PersonalTodo[];         // Array of todo items
}
```

---

## File Structure

```
squad/tasks/
├── _personal.json              # Ryan's personal todos (underscore = special file)
├── _index.json                 # Optional: task order, display preferences
├── MC-001.json                 # Active task
├── MC-002.json                 # Active task
├── MC-003.json                 # Active task
└── archived/                   # Completed tasks (moved here on completion)
    ├── .gitkeep
    └── MC-000.json             # Archived task
```

### File Naming Convention

- **Task files:** `{PREFIX}-{NUMBER}.json` (e.g., `MC-001.json`, `MC-002.json`)
- **Special files:** Prefixed with underscore (`_personal.json`, `_index.json`)
- **Archived:** Same filename, moved to `archived/` directory

### Example Task File

```json
{
  "id": "MC-001",
  "title": "Dynamic Agent Discovery API",
  "description": "Replace hardcoded mockAgents with file-based discovery...",
  "status": "active",
  "priority": "high",
  "assignedTo": ["vault"],
  "createdBy": "knox",
  "createdAt": "2026-02-08T18:00:00Z",
  "updatedAt": "2026-02-08T18:00:00Z",
  "tags": ["api", "backend"],
  "chat": [
    {
      "id": "msg-001",
      "agent": "knox",
      "timestamp": "2026-02-08T18:00:00Z",
      "content": "Spec is defined. Start with file parsing."
    }
  ]
}
```

---

## API Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all active tasks (excludes archived) |
| `GET` | `/api/tasks/:id` | Get single task with full chat thread |
| `POST` | `/api/tasks` | Create new task |
| `PATCH` | `/api/tasks/:id` | Update task (status, assignment, etc.) |
| `DELETE` | `/api/tasks/:id` | Archive task (move to archived/) |
| `POST` | `/api/tasks/:id/chat` | Add message to task chat thread |

### Personal Todos

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/todos` | Get personal todo list |
| `POST` | `/api/todos` | Add new todo item |
| `PATCH` | `/api/todos/:id` | Update todo (toggle complete, edit text) |
| `DELETE` | `/api/todos/:id` | Remove todo item |

### Request/Response Examples

#### GET /api/tasks
```json
{
  "tasks": [
    {
      "id": "MC-001",
      "title": "Dynamic Agent Discovery API",
      "status": "active",
      "priority": "high",
      "assignedTo": ["vault"],
      "chatCount": 5,
      "updatedAt": "2026-02-08T18:00:00Z"
    }
  ],
  "total": 1
}
```

#### POST /api/tasks/:id/chat
```json
// Request
{
  "agent": "vault",
  "content": "Implementation complete. Ready for review."
}

// Response
{
  "id": "msg-003",
  "agent": "vault",
  "timestamp": "2026-02-08T19:30:00Z",
  "content": "Implementation complete. Ready for review."
}
```

#### PATCH /api/todos/:id
```json
// Request
{
  "completed": true
}

// Response
{
  "id": "todo-001",
  "text": "Review PR #42",
  "completed": true,
  "completedAt": "2026-02-08T20:00:00Z"
}
```

---

## Status Colors & States

Visual indicators for task status:

| Status | Color | Hex Code | Icon | Description |
|--------|-------|----------|------|-------------|
| **Backlog** | Slate/Gray | `#64748b` | ○ | Not started, queued |
| **Active** | Blue | `#3b82f6` | ● | Currently being worked |
| **Blocked** | Red | `#ef4444` | ■ | Needs unblocking |
| **Review** | Amber | `#f59e0b` | ▲ | Waiting on feedback |

### Color Application

- **Status dot:** 8px solid circle in header
- **Left border:** 3px solid accent, full column height
- **Background tint:** 5% opacity of status color (subtle)

### Priority Indicators

| Priority | Badge Style |
|----------|-------------|
| Critical | Red badge with pulse animation |
| High | Orange badge |
| Medium | Yellow badge |
| Low | Gray badge (or no badge) |

---

## UI Layout

### Main View Structure

```
┌─────────────────────────────────────────────────────────────┬──────────────┐
│                    TASKS (← horizontal scroll →)            │  MY TODOS    │
├──────────────┬──────────────┬──────────────┬────────────────┤   (drawer)   │
│ ● Task A     │ ■ Task B     │ ▲ Task C     │ ○ Task D       │              │
│ [ACTIVE]     │ [BLOCKED]    │ [REVIEW]     │ [BACKLOG]      │ □ Review PR  │
│              │              │              │                │ □ Call Bob   │
│ Vault        │ Aria, Knox   │ Sterling     │ Unassigned     │ ☑ Send inv.  │
│              │              │              │                │              │
│ ─ Chat ───── │ ─ Chat ───── │ ─ Chat ───── │ ─ Chat ─────   │ [+ Add]      │
│ Knox: ...    │ Aria: ...    │ Hex: ...     │ (empty)        │              │
│ Vault: ...   │ Knox: ...    │              │                │              │
│              │              │              │                │              │
│ [  💬 input] │ [  💬 input] │ [  💬 input] │ [  💬 input]   │              │
└──────────────┴──────────────┴──────────────┴────────────────┴──────────────┘
```

### Column Specifications

- **Min width:** 320px
- **Max width:** 400px
- **Scroll behavior:** `scroll-snap-type: x mandatory`
- **Internal scroll:** Vertical for chat thread
- **Focus state:** `ring-2 ring-primary/20` on active column

### Personal Todos Drawer

- **Width:** 280-320px
- **Position:** Right side, push layout (not overlay)
- **Toggle:** Floating button or persistent tab
- **Persistence:** State saved to localStorage

---

## Task Lifecycle

```
[Create] → Backlog → Active → Review → [Complete/Archive]
                  ↓         ↑
               Blocked ─────┘
```

### Completion Flow

1. User clicks checkbox
2. Checkbox animates (stroke draw, 200ms)
3. Task fades out (300ms delay, 400ms duration)
4. Task file moved to `archived/`
5. Toast shows "✓ Completed" with Undo (5s timeout)
6. Undo moves file back from `archived/`

### Archive vs Delete

- **Archive (default):** Move to `archived/` — recoverable, keeps history
- **Hard delete:** Remove file entirely — destructive, requires confirmation

---

## Implementation Notes

### For Backend (Vault)

1. File I/O should use atomic writes (write to temp, then rename)
2. Parse agent personas from `squad/agents/*.md` for validation
3. Generate unique IDs: `MC-{padded number}` format
4. Validate chat messages before appending
5. Handle concurrent writes gracefully (last-write-wins is acceptable)

### For Frontend (Aria)

1. Use `scroll-snap` for horizontal task columns
2. Implement optimistic UI for status changes
3. Animate checkbox completion (stroke-dasharray technique)
4. Auto-scroll chat only when user at bottom
5. Toast notifications via Sonner/react-hot-toast

### For Agents

To post to a task chat:
1. Read task file from `squad/tasks/{id}.json`
2. Append message to `chat` array
3. Update `updatedAt` timestamp
4. Write file back

---

## Migration Plan

### From Current Structure

Current files in `squad/tasks/`:
- `backlog.md`
- `in-progress.md`
- `completed.md`

Migration steps:
1. Parse existing .md files for task items
2. Create individual JSON files per task
3. Archive old .md files (don't delete)
4. Update API to read from JSON structure

---

## Future Considerations

- **Task dependencies:** Link tasks that block/require others
- **Sub-tasks:** Nested task hierarchy
- **Time tracking:** Log time spent per task
- **Labels/filters:** Quick filtering by tag, assignee, status
- **Notifications:** Alert agents when assigned or mentioned

---

*Last updated: 2026-02-08 by Knox*
