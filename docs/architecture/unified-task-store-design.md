# Unified Task Store Design

**Designed by:** Knox  
**Date:** 2026-02-06  
**Task:** mc-011-task-state-consolidation (sub-002)

---

## Problem Statement

Scout's audit identified three state management patterns causing potential divergence:
1. `useTasks` hook (primary store)
2. `kanban-board.tsx` local state (DnD operations)
3. `task-column.tsx` local message state (orphaned)

During drag operations, the KanbanBoard maintains separate `localTasks` state that can diverge from the hook's canonical `tasks` array. If an API poll fires mid-drag, behavior becomes unpredictable.

---

## Design Decision: Extend useTasks Hook

**Chosen approach:** Lift drag state into `useTasks` hook.

**Rejected alternatives:**
- ❌ Zustand store — adds dependency, overkill for this scale
- ❌ React Context + useReducer — more boilerplate, same end result
- ❌ Keep current pattern with better sync — just patches symptoms

**Rationale:** The hook is already the source of truth for tasks. Moving drag orchestration into it creates a single state owner with clear, predictable behavior.

---

## New Hook Interface

```typescript
// hooks/use-tasks.ts

interface DragState {
  activeTaskId: string | null;
  originalColumn: TaskStatus | null;
  originalPosition: number | null;
}

interface UseTasks {
  // Existing
  tasks: Task[];
  loading: boolean;
  error: string | null;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  reorderTasks: (updates: TaskUpdate[]) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string, assignee?: string) => Promise<void>;
  refresh: () => Promise<void>;
  
  // NEW: Drag operations
  dragState: DragState;
  startDrag: (taskId: string) => void;
  moveDuringDrag: (targetStatus: TaskStatus, targetPosition: number) => void;
  endDrag: () => Promise<void>;  // persists to API
  cancelDrag: () => void;        // reverts to pre-drag state
  
  // NEW: Derived
  isDragging: boolean;           // convenience: dragState.activeTaskId !== null
  getTasksForColumn: (status: TaskStatus) => Task[];  // memoized getter
}
```

---

## State Flow

### Before (dual state)
```
KanbanBoard                    useTasks hook
┌─────────────────┐           ┌─────────────────┐
│ localTasks      │ ← sync ←  │ tasks           │
│ activeTask      │           │                 │
│ handleDragOver  │           │ updateTaskStatus│
└─────────────────┘           └─────────────────┘
     ↓                              ↑
  DnD events                   API persistence
```

### After (single state owner)
```
KanbanBoard                    useTasks hook
┌─────────────────┐           ┌─────────────────┐
│ (stateless)     │ ────────→ │ tasks           │
│ renders tasks   │           │ dragState       │
│ calls hook      │           │ startDrag()     │
└─────────────────┘           │ moveDuringDrag()│
                              │ endDrag()       │
                              └─────────────────┘
                                    ↑
                              API persistence
                              (on endDrag only)
```

---

## Implementation Details

### 1. Internal State Structure

```typescript
const [tasks, setTasks] = useState<Task[]>([]);
const [dragState, setDragState] = useState<DragState>({
  activeTaskId: null,
  originalColumn: null,
  originalPosition: null,
});

// Snapshot for revert on cancel
const preDragSnapshot = useRef<Task[] | null>(null);
```

### 2. startDrag(taskId)

```typescript
const startDrag = useCallback((taskId: string) => {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  preDragSnapshot.current = [...tasks];
  setDragState({
    activeTaskId: taskId,
    originalColumn: task.status,
    originalPosition: task.position ?? 0,
  });
}, [tasks]);
```

### 3. moveDuringDrag(targetStatus, targetPosition)

Optimistically updates `tasks` array. No API call.

```typescript
const moveDuringDrag = useCallback((targetStatus: TaskStatus, targetPosition: number) => {
  if (!dragState.activeTaskId) return;
  
  setTasks(prev => {
    const updated = [...prev];
    const taskIndex = updated.findIndex(t => t.id === dragState.activeTaskId);
    if (taskIndex === -1) return prev;
    
    // Update task status and position
    updated[taskIndex] = {
      ...updated[taskIndex],
      status: targetStatus,
      position: targetPosition,
    };
    
    // Reposition other tasks in target column
    return recomputePositions(updated, targetStatus);
  });
}, [dragState.activeTaskId]);
```

### 4. endDrag()

Persists to API, clears drag state.

```typescript
const endDrag = useCallback(async () => {
  if (!dragState.activeTaskId) return;
  
  const task = tasks.find(t => t.id === dragState.activeTaskId);
  if (!task) return;
  
  // Collect all position changes in affected columns
  const updates = collectPositionUpdates(tasks, preDragSnapshot.current);
  
  try {
    await reorderTasks(updates);
    preDragSnapshot.current = null;
    setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
  } catch (error) {
    // Revert on failure
    if (preDragSnapshot.current) {
      setTasks(preDragSnapshot.current);
    }
    preDragSnapshot.current = null;
    setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
    throw error;
  }
}, [dragState.activeTaskId, tasks]);
```

### 5. cancelDrag()

```typescript
const cancelDrag = useCallback(() => {
  if (preDragSnapshot.current) {
    setTasks(preDragSnapshot.current);
  }
  preDragSnapshot.current = null;
  setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
}, []);
```

---

## KanbanBoard Simplification

Before: ~300 lines with local state management  
After: ~150 lines, stateless rendering + hook calls

```tsx
export function KanbanBoard({ tasks, category }: Props) {
  const {
    getTasksForColumn,
    isDragging,
    startDrag,
    moveDuringDrag,
    endDrag,
    cancelDrag,
  } = useTasks();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => startDrag(e.active.id as string)}
      onDragOver={(e) => {
        const targetColumn = getColumnFromDroppable(e.over);
        const targetPosition = getPositionFromDroppable(e.over);
        if (targetColumn) moveDuringDrag(targetColumn, targetPosition);
      }}
      onDragEnd={() => endDrag()}
      onDragCancel={() => cancelDrag()}
    >
      {COLUMNS.map(column => (
        <KanbanColumn
          key={column}
          status={column}
          tasks={getTasksForColumn(column)}
        />
      ))}
    </DndContext>
  );
}
```

---

## TaskColumn Message State

**Decision:** Remove the local message input.

The chat feature exists in `TaskDetailModal` and works properly there. The inline input in TaskColumn:
- Was never connected to API
- Has a 3-year-old TODO
- Creates false UX expectations

**Action:** Delete the input, keep the message display (read-only from task.chat).

---

## Legacy task-kanban.tsx

**Decision:** Delete the file.

It's a 3-column legacy view (backlog/inProgress/completed) that doesn't match current workflow (6 columns). No active routes reference it.

---

## Migration Plan

### Phase 1: Hook Changes (Aria - sub-003)
1. Add drag state and methods to `useTasks`
2. Export `isDragging`, `getTasksForColumn`
3. No breaking changes to existing interface

### Phase 2: KanbanBoard Refactor (Aria - sub-003)
1. Remove `localTasks` state
2. Replace local handlers with hook calls
3. Fix `useMemo` → `useEffect` issue (becomes moot with new pattern)

### Phase 3: Cleanup (Aria - sub-003)
1. Remove message input from TaskColumn
2. Delete task-kanban.tsx
3. Update any remaining direct state mutations

---

## Acceptance Criteria

- [ ] Single source of truth for tasks (useTasks hook only)
- [ ] Drag operations work without state divergence
- [ ] API polls mid-drag don't cause glitches
- [ ] No local state in kanban-board.tsx
- [ ] Message input removed from TaskColumn
- [ ] task-kanban.tsx deleted
- [ ] All existing tests pass
- [ ] New tests for drag state management

---

## Files to Change

| File | Action |
|------|--------|
| `src/hooks/use-tasks.ts` | Extend with drag state + methods |
| `src/components/kanban-board.tsx` | Refactor to use hook |
| `src/components/task-column.tsx` | Remove message input |
| `src/components/task-kanban.tsx` | Delete |

---

**Next:** Aria implements per this design (sub-003).
