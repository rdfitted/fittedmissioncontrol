# Task State Update Paths Audit

**Audited by:** Scout  
**Date:** 2026-02-06  
**Task:** mc-011-task-state-consolidation (sub-001)

---

## Executive Summary

Found **3 different patterns** for updating task state in Mission Control:

1. **Primary:** `useTasks` hook with optimistic updates + API sync
2. **Secondary:** Local state in `KanbanBoard` for drag-and-drop
3. **Legacy:** `TaskKanban` component with direct fetch/setState

The main issue: DnD uses a separate `localTasks` state that can diverge from the hook's `tasks` state. Also, `TaskColumn` has local message state that never syncs to API.

---

## Detailed Findings

### 1. `src/hooks/use-tasks.ts` — PRIMARY STORE

The central hook. All components should go through this.

| Line | Call | Description |
|------|------|-------------|
| 90 | `setTasks(transformedTasks)` | Initial load from `/api/tasks` |
| 102-104 | `setTasks(prev => prev.map(...))` | Optimistic status update in `updateTaskStatus()` |
| 113 | `fetchTasks()` | Revert on API failure |
| 126-132 | `setTasks(prev => {...})` | Optimistic position+status update in `reorderTasks()` |
| 145-155 | `setTasks(prev => prev.map(...))` | Optimistic subtask toggle in `toggleSubtask()` |
| 169 | `fetchTasks()` | Refresh after `addSubtask()` (no optimistic) |

**Pattern:** Optimistic update → API call → revert on failure

---

### 2. `src/components/kanban-board.tsx` — DND LOCAL STATE

Uses a **separate** `localTasks` state during drag operations. This creates potential divergence.

| Line | Call | Description |
|------|------|-------------|
| 127 | `setLocalTasks(tasks)` | Sync from `useTasks` when not dragging |
| 176-181 | `setLocalTasks(prev => prev.map(...))` | Update task status during `handleDragOver` |
| 184-196 | `setLocalTasks(prev => {...})` | Reorder tasks during `handleDragOver` |
| 211 | `setLocalTasks([])` | Clear on drag cancel (fall back to `tasks`) |
| 218 | `setLocalTasks([])` | Clear on no-op drag end |
| ~250 | `reorderTasks(updates)` | Persist via hook after drag end |

**Problem:** During a drag, `localTasks` and `tasks` can diverge. If an API poll happens mid-drag, behavior may be unpredictable.

**Sync Logic (line 122-129):**
```tsx
useMemo(() => {
  if (!activeTask) {
    setLocalTasks(tasks);
  }
}, [tasks, activeTask]);
```

This only syncs when NOT dragging. But `useMemo` is wrong here — should be `useEffect`.

---

### 3. `src/components/task-column.tsx` — LOCAL MESSAGE STATE

| Line | Call | Description |
|------|------|-------------|
| 89 | `setLocalMessages(prev => [...prev, newMessage])` | Add message locally |

**Problem:** Messages added here are **never sent to API**. There's a `// TODO: Send to API when available` comment at line 90. This is dead code that creates false expectations.

---

### 4. `src/components/task-kanban.tsx` — LEGACY COMPONENT

Appears to be an older version of the kanban board, still in codebase.

| Line | Call | Description |
|------|------|-------------|
| 67 | `setTasks(data)` | Direct setState from fetch response |

**Pattern:** No hook, direct fetch → setState. Only handles 3 columns (backlog/inProgress/completed), not the full 6-column workflow.

**Status:** Likely deprecated. Should be removed or clearly marked legacy.

---

### 5. `src/components/task-board.tsx` — CLEAN

Uses `useTasks` hook exclusively. No direct state manipulation. ✓

---

### 6. Server-Side (`src/lib/tasks.ts`)

All file writes go through these functions:

| Function | Description |
|----------|-------------|
| `updateTask()` | Main update, writes JSON, tracks state history |
| `archiveTask()` | Moves to archived/, updates status |
| `toggleSubtask()` | Toggles subtask status in parent JSON |
| `addSubtask()` | Adds subtask to parent JSON |

API routes (`/api/tasks/[id]`) call these. No issues here — single source of truth for file ops.

---

## Recommendations for Knox

### High Priority

1. **Fix `useMemo` → `useEffect`** in kanban-board.tsx line 122-129  
   `useMemo` is for computed values, not side effects. This sync logic should be `useEffect`.

2. **Remove or wire up TaskColumn message input**  
   Either connect to API or remove the input entirely. Current state is confusing.

3. **Deprecate or remove task-kanban.tsx**  
   It's the old 3-column view. If still needed, mark it clearly. If not, delete.

### Medium Priority

4. **Consider unified store pattern**  
   Options:
   - Zustand store (simple, good for this scale)
   - Lift `localTasks` into `useTasks` hook with `isDragging` flag
   - Use React Context with reducer

5. **Consolidate DnD state into hook**  
   `kanban-board.tsx` currently owns drag state. Moving this into `useTasks` (or a new `useKanbanDnd` hook) would eliminate the dual-state issue.

### Low Priority

6. **Add comment persistence**  
   TaskColumn's comment feature is half-built. Either finish it (POST to `/api/tasks/[id]/chat`) or remove the UI.

---

## File Reference

| File | Lines | State Updates |
|------|-------|---------------|
| `hooks/use-tasks.ts` | 90, 102-104, 113, 126-132, 145-155, 169 | 6 |
| `components/kanban-board.tsx` | 127, 176-181, 184-196, 211, 218 | 5 |
| `components/task-column.tsx` | 89 | 1 (local only) |
| `components/task-kanban.tsx` | 67 | 1 (legacy) |
| `components/task-board.tsx` | — | 0 (uses hook) |

---

**Next Step:** Knox to design unified store pattern (sub-002), then Aria implements (sub-003).
