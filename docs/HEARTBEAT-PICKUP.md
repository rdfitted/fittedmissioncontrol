# Heartbeat Task Pickup Logic

This document explains how agents discover and claim tasks during their periodic heartbeats.

## Overview

Each agent receives heartbeat polls from Clawdbot at regular intervals. During heartbeats, agents scan the task board and pick up assigned work.

## Task Discovery

Agents read all task files from `squad/tasks/json/*.json` and look for:

1. **Direct assignment** — `assigned` field matches their name
2. **Participant role** — Their name is in `participants[]` array
3. **Subtask assignment** — A subtask has `assigned` matching their name

## Pickup Priority

When multiple tasks match, prioritize:

1. **Status:** `blocked` > `in-progress` > `review` > `ready` > `backlog`
2. **Priority:** `critical` > `high` > `medium` > `low`
3. **Age:** Older `updatedAt` timestamps first (stale work)

## Agent Roles

### Executor Agents (Scout, Aria, Vault)

Execute assigned work. On heartbeat:

1. Scan for tasks where `assigned = "{agent-name}"`
2. Check subtasks where `assigned = "{agent-name}"`
3. Do the work
4. Update subtask status
5. Comment on parent task with progress

### Manager Agents (Knox, Sterling)

Delegate and coordinate. On heartbeat:

1. Review tasks in their domain (dev vs marketing)
2. Assign subtasks to team members
3. Unblock stuck work
4. Move tasks through workflow

### Chief of Staff (Hex)

Strategic oversight. On heartbeat:

1. Review ALL tasks across domains
2. Add strategic perspective to active discussions
3. Flag blocked items > 24 hours
4. Prioritize and triage incoming work

## Claiming Work

When an agent picks up a task:

1. **Activate:** Move from `backlog` → `in-progress`
2. **Comment:** Add a chat message explaining the plan
3. **Subtasks:** Create subtasks if work is complex
4. **Delegate:** Assign subtasks to team members if applicable

## Progress Updates

During work, agents should:

1. Update subtask status as items complete
2. Add chat messages for significant progress
3. Set `blockedBy` if waiting on something
4. Update `files[]` if touching new files

## Completion

When work is done:

1. Move status → `review` (if needs review) or `completed`
2. Set `completedBy` to agent name
3. Set `deliverable` with link/description of output
4. Add final chat message summarizing what was done

## Blocked Items

If blocked:

1. Set `status: "blocked"`
2. Set `blockedBy` with human-readable reason
3. System auto-sets `blockedAt` timestamp
4. Alert manager or escalate if critical

When unblocked, move to `in-progress` — system clears blocked fields.

## Example: Scout Heartbeat Flow

```
1. Read all task files
2. Filter: assigned="scout" OR subtasks[].assigned="scout"
3. Sort by priority
4. For each task:
   a. If subtask assigned to me → work on it, update status
   b. If whole task assigned to me → work on it, update status
   c. Add comment with progress
5. Check if any blocked items need escalation
6. Reply HEARTBEAT_OK if nothing to report
```

## State Tracking

Agents track their heartbeat state in `memory/heartbeat-state.json`:

```json
{
  "lastBoardScan": 1738942560000,
  "lastChecks": {
    "tasks": 1738942560000,
    "email": 1738938960000
  }
}
```

This prevents duplicate work and helps agents pick up where they left off.

## Conflict Prevention

Before editing files:

1. Check `files[]` array on other active tasks
2. If conflict detected, coordinate with assigned agent
3. Use `.claude/coordination.json` for real-time locks

## Related Documentation

- [TASK-SCHEMA.md](./TASK-SCHEMA.md) — Full task field reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Local dev setup
- [../squad/AGENTS.md](../../AGENTS.md) — Agent responsibilities
