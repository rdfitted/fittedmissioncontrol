'use client';

import { useState, useEffect, useCallback } from 'react';

export type TaskStatus = 'backlog' | 'active' | 'blocked' | 'review' | 'ready' | 'complete';
export type TaskCategory = 'dev' | 'marketing' | 'both';

export interface TaskMessage {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
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
  // Position for ordering within columns (lower = higher priority = top)
  position?: number;
  // Category for filtering (dev, marketing, or both)
  category?: TaskCategory;
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

interface LegacyTask {
  id: string;
  title: string;
  assigned?: string;
  priority?: string;
  description?: string;
  deliverable?: string;
  completedBy?: string;
  date?: string;
  summary?: string;
}

interface LegacyTasksData {
  backlog: LegacyTask[];
  inProgress: LegacyTask[];
  completed: LegacyTask[];
}

export function useTasks(refreshInterval = 10000) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      
      // Handle new API format: { tasks, grouped, total } or legacy format
      let transformedTasks: Task[] = [];
      
      if (data.tasks && Array.isArray(data.tasks)) {
        // New API format - map status values and chat field names
        transformedTasks = data.tasks.map((t: any) => ({
          ...t,
          status: mapStatus(t.status || 'backlog'),
          priority: t.priority as Task['priority'],
          // Map chat messages: author→agent, content→message
          messages: (t.chat || []).map((msg: any) => ({
            id: msg.id,
            agent: msg.author || msg.agent || 'Unknown',
            message: msg.content || msg.message || '',
            timestamp: typeof msg.timestamp === 'number' 
              ? new Date(msg.timestamp).toISOString() 
              : msg.timestamp,
          })),
        }));
      } else if (data.grouped) {
        // New API format with grouped object
        const grouped = data.grouped;
        transformedTasks = [
          ...(grouped.backlog || []).map((t: any) => ({ ...t, status: 'backlog' as TaskStatus, priority: t.priority as Task['priority'] })),
          ...(grouped.inProgress || []).map((t: any) => ({ ...t, status: 'active' as TaskStatus, priority: t.priority as Task['priority'] })),
          ...(grouped.completed || []).map((t: any) => ({ ...t, status: 'ready' as TaskStatus, priority: t.priority as Task['priority'] })),
        ];
      } else if (data.backlog || data.inProgress || data.completed) {
        // Legacy format
        transformedTasks = [
          ...(data.backlog || []).map((t: any) => ({ ...t, status: 'backlog' as TaskStatus, priority: t.priority as Task['priority'] })),
          ...(data.inProgress || []).map((t: any) => ({ ...t, status: 'active' as TaskStatus, priority: t.priority as Task['priority'] })),
          ...(data.completed || []).map((t: any) => ({ ...t, status: 'ready' as TaskStatus, priority: t.priority as Task['priority'] })),
        ];
      }
      
      setTasks(transformedTasks);
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
      'complete': 'complete',
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
      'complete': 'complete',
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

  return { 
    tasks, 
    loading, 
    error, 
    refresh: fetchTasks,
    updateTaskStatus,
    completeTask,
    reorderTasks,
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
