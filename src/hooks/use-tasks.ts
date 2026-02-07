'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export type TaskStatus = 'backlog' | 'active' | 'blocked' | 'review' | 'ready' | 'complete';
export type TaskCategory = 'dev' | 'marketing' | 'both';

// Drag state for unified state management
export interface DragState {
  activeTaskId: string | null;
  originalColumn: TaskStatus | null;
  originalPosition: number | null;
}

export interface TaskMessage {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
}

export type SubtaskStatus = 'backlog' | 'active' | 'complete';

export interface Subtask {
  id: string;
  title: string;
  status: SubtaskStatus;
  assigned?: string;
  assignee?: string;  // Alternative field name from task files
  delegatedBy?: string;
  delegatedAt?: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assigned?: string;
  priority?: 'High' | 'Medium' | 'Low';
  description?: string;
  deliverable?: string;
  completedBy?: string;
  date?: string;
  summary?: string;
  messages?: TaskMessage[];
  // Blocked status fields
  blockedBy?: string;      // Blocker reason (matches backend)
  blockedAt?: number;      // Unix ms timestamp (matches backend)
  // Subtasks
  subtasks?: Subtask[];
  // Position for ordering within columns (lower = higher priority = top)
  position?: number;
  // Category for filtering (dev, marketing, or both)
  category?: TaskCategory;
  // Timestamps for sorting
  created?: string;        // ISO timestamp or date string
  updated?: string;        // ISO timestamp or date string
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Status color configuration
export const statusColors: Record<TaskStatus, { bg: string; border: string; dot: string; text: string; accent?: string }> = {
  backlog: { bg: 'bg-slate-500/10', border: 'border-l-slate-500', dot: 'bg-slate-500', text: 'text-slate-400' },
  active: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', dot: 'bg-blue-500', text: 'text-blue-400' },
  blocked: { 
    bg: 'bg-red-500/15', 
    border: 'border-l-red-500', 
    dot: 'bg-red-500', 
    text: 'text-red-400',
    accent: 'ring-red-500/30 ring-1'  // Extra visual emphasis for blocked
  },
  review: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', dot: 'bg-amber-500', text: 'text-amber-400' },
  ready: { bg: 'bg-green-500/10', border: 'border-l-green-500', dot: 'bg-green-500', text: 'text-green-400' },
  complete: { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' },
};

// Map legacy status names to new ones
function mapStatus(legacyStatus: string): TaskStatus {
  const mapping: Record<string, TaskStatus> = {
    'backlog': 'backlog',
    'inProgress': 'active',
    'in-progress': 'active',
    'active': 'active',
    'blocked': 'blocked',
    'review': 'review',
    'ready': 'ready',
    'complete': 'complete',
    'completed': 'complete',
    'done': 'complete',
  };
  return mapping[legacyStatus] || 'backlog';
}

// API response types (replacing 'any' in fetch handlers)
interface ApiChatMessage {
  id: string;
  author?: string;
  agent?: string;
  content?: string;
  message?: string;
  timestamp: number | string;
}

interface ApiSubtask {
  id?: string;
  title: string;
  status?: SubtaskStatus;
  assigned?: string;
  assignee?: string;
  delegatedBy?: string;
  delegatedAt?: number;
}

interface ApiTask {
  id: string;
  title: string;
  status?: string;
  assigned?: string;
  priority?: 'High' | 'Medium' | 'Low';
  description?: string;
  deliverable?: string;
  completedBy?: string;
  date?: string;
  summary?: string;
  chat?: ApiChatMessage[];
  subtasks?: ApiSubtask[];
  blockedBy?: string;
  blockedAt?: number;
  position?: number;
  category?: TaskCategory;
  created?: string;
  updated?: string;
}

interface ApiTasksResponse {
  tasks?: ApiTask[];
  grouped?: {
    backlog?: ApiTask[];
    inProgress?: ApiTask[];
    completed?: ApiTask[];
  };
  // Legacy format fields
  backlog?: ApiTask[];
  inProgress?: ApiTask[];
  completed?: ApiTask[];
}

export function useTasks(refreshInterval = 10000) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Drag state (unified - no more separate local state in KanbanBoard)
  const [dragState, setDragState] = useState<DragState>({
    activeTaskId: null,
    originalColumn: null,
    originalPosition: null,
  });
  
  // Snapshot for revert on cancel
  const preDragSnapshot = useRef<Task[] | null>(null);
  
  // Ref to track drag state for polling guard (avoids stale closure)
  const isDraggingRef = useRef(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data: ApiTasksResponse = await res.json();
      
      // Helper to transform API task to Task
      const transformApiTask = (t: ApiTask): Task => ({
        ...t,
        status: mapStatus(t.status || 'backlog'),
        priority: t.priority,
        // Map chat messages: author→agent, content→message
        messages: (t.chat || []).map((msg: ApiChatMessage) => ({
          id: msg.id,
          agent: msg.author || msg.agent || 'Unknown',
          message: msg.content || msg.message || '',
          timestamp: typeof msg.timestamp === 'number' 
            ? new Date(msg.timestamp).toISOString() 
            : msg.timestamp,
        })),
        // Map subtasks (normalize assignee/assigned)
        subtasks: (t.subtasks || []).map((sub: ApiSubtask, index: number) => ({
          id: sub.id || `${t.id}-sub-${index}`,
          title: sub.title,
          status: sub.status || 'backlog',
          assigned: sub.assigned || sub.assignee,
          delegatedBy: sub.delegatedBy,
          delegatedAt: sub.delegatedAt,
        })),
      });
      
      // Handle new API format: { tasks, grouped, total } or legacy format
      let transformedTasks: Task[] = [];
      
      if (data.tasks && Array.isArray(data.tasks)) {
        // New API format - map status values and chat field names
        transformedTasks = data.tasks.map(transformApiTask);
      } else if (data.grouped) {
        // New API format with grouped object
        const grouped = data.grouped;
        transformedTasks = [
          ...(grouped.backlog || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'backlog' as TaskStatus })),
          ...(grouped.inProgress || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'active' as TaskStatus })),
          ...(grouped.completed || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'ready' as TaskStatus })),
        ];
      } else if (data.backlog || data.inProgress || data.completed) {
        // Legacy format
        transformedTasks = [
          ...(data.backlog || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'backlog' as TaskStatus })),
          ...(data.inProgress || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'active' as TaskStatus })),
          ...(data.completed || []).map((t: ApiTask) => ({ ...transformApiTask(t), status: 'ready' as TaskStatus })),
        ];
      }
      
      // Guard: don't overwrite state during drag (would reset optimistic positions)
      if (!isDraggingRef.current) {
        setTasks(transformedTasks);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTasks, refreshInterval]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
    
    // Map frontend status to backend status
    const backendStatusMap: Record<TaskStatus, string> = {
      'backlog': 'backlog',
      'active': 'in-progress',
      'blocked': 'blocked',
      'review': 'review',
      'ready': 'ready',
      'complete': 'completed',
    };
    const backendStatus = backendStatusMap[newStatus] || newStatus;
    
    // Persist to API
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backendStatus }),
      });
      if (!res.ok) {
        console.error('Failed to update task status:', await res.text());
        // Revert on failure
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on failure
      fetchTasks();
    }
  }, [fetchTasks]);

  const completeTask = useCallback((taskId: string) => {
    updateTaskStatus(taskId, 'ready');
  }, [updateTaskStatus]);

  // Reorder tasks - updates position and optionally status for multiple tasks
  const reorderTasks = useCallback(async (updates: Array<{ id: string; status: TaskStatus; position: number }>) => {
    // Map frontend status to backend status
    const backendStatusMap: Record<TaskStatus, string> = {
      'backlog': 'backlog',
      'active': 'in-progress',
      'blocked': 'blocked',
      'review': 'review',
      'ready': 'ready',
      'complete': 'completed',
    };

    // Optimistic update
    setTasks(prev => {
      const updated = [...prev];
      updates.forEach(({ id, status, position }) => {
        const idx = updated.findIndex(t => t.id === id);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], status, position };
        }
      });
      return updated;
    });

    // Persist each update to API (could batch this in future)
    try {
      await Promise.all(updates.map(({ id, status, position }) =>
        fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: backendStatusMap[status] || status,
            position 
          }),
        })
      ));
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      // Revert on failure
      fetchTasks();
    }
  }, [fetchTasks]);

  // Toggle a subtask's completion status
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (!t.subtasks) return t;
      return {
        ...t,
        subtasks: t.subtasks.map(s => 
          s.id === subtaskId 
            ? { ...s, status: s.status === 'complete' ? 'backlog' as SubtaskStatus : 'complete' as SubtaskStatus }
            : s
        ),
      };
    }));
    
    // Persist to API
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtask`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId }),
      });
      if (!res.ok) {
        console.error('Failed to toggle subtask:', await res.text());
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      fetchTasks();
    }
  }, [fetchTasks]);

  // Add a new subtask
  const addSubtask = useCallback(async (taskId: string, title: string, assigned?: string) => {
    // Persist to API first (need the generated ID)
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assigned }),
      });
      if (!res.ok) {
        console.error('Failed to add subtask:', await res.text());
        return;
      }
      // Refresh to get the new subtask with proper ID
      fetchTasks();
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  }, [fetchTasks]);

  // === DRAG OPERATIONS (unified state management) ===
  
  // Start a drag operation - captures pre-drag snapshot
  const startDrag = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    isDraggingRef.current = true;
    preDragSnapshot.current = [...tasks];
    setDragState({
      activeTaskId: taskId,
      originalColumn: task.status,
      originalPosition: task.position ?? 0,
    });
  }, [tasks]);

  // Move during drag - optimistic UI update, no API call
  const moveDuringDrag = useCallback((targetStatus: TaskStatus, targetPosition: number) => {
    if (!dragState.activeTaskId) return;
    
    setTasks(prev => {
      const updated = [...prev];
      const taskIndex = updated.findIndex(t => t.id === dragState.activeTaskId);
      if (taskIndex === -1) return prev;
      
      const movingTask = updated[taskIndex];
      const oldStatus = movingTask.status;
      
      // Update the dragged task's status and position
      updated[taskIndex] = {
        ...movingTask,
        status: targetStatus,
        position: targetPosition,
      };
      
      // Recompute sibling positions in affected columns
      const affectedStatuses = new Set<TaskStatus>([targetStatus]);
      if (oldStatus !== targetStatus) {
        affectedStatuses.add(oldStatus);
      }
      
      affectedStatuses.forEach(status => {
        // Get all tasks in this column, excluding the moving task
        const columnTasks = updated
          .map((t, i) => ({ task: t, index: i }))
          .filter(({ task }) => task.status === status && task.id !== dragState.activeTaskId)
          .sort((a, b) => (a.task.position ?? 999999) - (b.task.position ?? 999999));
        
        // Reassign sequential positions, leaving gap for dragged task
        let pos = 0;
        columnTasks.forEach(({ task, index }) => {
          // Skip position where dragged task will go
          if (status === targetStatus && pos === targetPosition) {
            pos++;
          }
          updated[index] = { ...task, position: pos };
          pos++;
        });
      });
      
      return updated;
    });
  }, [dragState.activeTaskId]);

  // End drag - persists to API, clears drag state
  // Optional: pass targetTaskId and targetStatus from DragEndEvent for accurate final position
  const endDrag = useCallback(async (targetTaskId?: string, targetStatus?: TaskStatus) => {
    if (!dragState.activeTaskId) {
      isDraggingRef.current = false;
      return;
    }
    
    const task = tasks.find(t => t.id === dragState.activeTaskId);
    if (!task) {
      isDraggingRef.current = false;
      preDragSnapshot.current = null;
      setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
      return;
    }
    
    // If target provided from DragEndEvent, apply final position
    const finalStatus = targetStatus || task.status;
    
    // Collect all position changes in affected columns
    const affectedStatuses = new Set<TaskStatus>();
    affectedStatuses.add(finalStatus);
    if (dragState.originalColumn && dragState.originalColumn !== finalStatus) {
      affectedStatuses.add(dragState.originalColumn);
    }
    
    const updates: Array<{ id: string; status: TaskStatus; position: number }> = [];
    
    // Update positions for all affected columns
    affectedStatuses.forEach(status => {
      const statusTasks = tasks.filter(t => t.status === status);
      statusTasks.forEach((t, index) => {
        updates.push({
          id: t.id,
          status: status,
          position: index,
        });
      });
    });
    
    try {
      if (updates.length > 0) {
        await reorderTasks(updates);
      }
    } catch (error) {
      // Revert on failure - log but don't re-throw (caller doesn't catch)
      console.error('Failed to persist drag reorder:', error);
      if (preDragSnapshot.current) {
        setTasks(preDragSnapshot.current);
      }
    } finally {
      // Always clear drag state
      isDraggingRef.current = false;
      preDragSnapshot.current = null;
      setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
    }
  }, [dragState.activeTaskId, dragState.originalColumn, tasks, reorderTasks]);

  // Cancel drag - reverts to pre-drag state
  const cancelDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (preDragSnapshot.current) {
      setTasks(preDragSnapshot.current);
    }
    preDragSnapshot.current = null;
    setDragState({ activeTaskId: null, originalColumn: null, originalPosition: null });
  }, []);

  // Convenience: is a drag in progress?
  const isDragging = dragState.activeTaskId !== null;

  // Get the active task being dragged
  const activeTask = useMemo(() => {
    if (!dragState.activeTaskId) return null;
    return tasks.find(t => t.id === dragState.activeTaskId) || null;
  }, [dragState.activeTaskId, tasks]);

  // Memoized getter for tasks in a specific column
  const getTasksForColumn = useCallback((status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  return { 
    tasks, 
    loading, 
    error, 
    refresh: fetchTasks,
    updateTaskStatus,
    completeTask,
    reorderTasks,
    toggleSubtask,
    addSubtask,
    // Drag operations (unified state)
    dragState,
    startDrag,
    moveDuringDrag,
    endDrag,
    cancelDrag,
    isDragging,
    activeTask,
    getTasksForColumn,
  };
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data.items || data.todos || []);
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
      // Fallback to localStorage if API fails
      try {
        const stored = localStorage.getItem('mission-control-todos');
        if (stored) {
          setTodos(JSON.parse(stored));
        }
      } catch {
        console.error('Failed to load from localStorage');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = useCallback(async (text: string) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    // Optimistic update
    setTodos(prev => [newTodo, ...prev]);
    // Persist to API
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
    // Persist to API
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle: true }),
      });
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  }, []);

  const removeTodo = useCallback(async (id: string) => {
    // Optimistic update
    setTodos(prev => prev.filter(t => t.id !== id));
    // Persist to API
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to remove todo:', err);
    }
  }, []);

  return { todos, loading, addTodo, toggleTodo, removeTodo, refresh: fetchTodos };
}
