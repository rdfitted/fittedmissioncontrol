'use client';

import { useState, useEffect, useCallback } from 'react';

export type TaskStatus = 'backlog' | 'active' | 'blocked' | 'review' | 'ready';

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
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Status color configuration
export const statusColors: Record<TaskStatus, { bg: string; border: string; dot: string; text: string }> = {
  backlog: { bg: 'bg-slate-500/10', border: 'border-l-slate-500', dot: 'bg-slate-500', text: 'text-slate-400' },
  active: { bg: 'bg-blue-500/10', border: 'border-l-blue-500', dot: 'bg-blue-500', text: 'text-blue-400' },
  blocked: { bg: 'bg-red-500/10', border: 'border-l-red-500', dot: 'bg-red-500', text: 'text-red-400' },
  review: { bg: 'bg-amber-500/10', border: 'border-l-amber-500', dot: 'bg-amber-500', text: 'text-amber-400' },
  ready: { bg: 'bg-green-500/10', border: 'border-l-green-500', dot: 'bg-green-500', text: 'text-green-400' },
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
    'completed': 'ready',
    'ready': 'ready',
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
        // New API format - map status values
        transformedTasks = data.tasks.map((t: any) => ({
          ...t,
          status: mapStatus(t.status || 'backlog'),
          priority: t.priority as Task['priority'],
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

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
    // TODO: Persist to API when available
  }, []);

  const completeTask = useCallback((taskId: string) => {
    updateTaskStatus(taskId, 'ready');
  }, [updateTaskStatus]);

  return { 
    tasks, 
    loading, 
    error, 
    refresh: fetchTasks,
    updateTaskStatus,
    completeTask,
  };
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mission-control-todos');
      if (stored) {
        setTodos(JSON.parse(stored));
      }
    } catch {
      console.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('mission-control-todos', JSON.stringify(todos));
    }
  }, [todos, loading]);

  const addTodo = useCallback((text: string) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [newTodo, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  return { todos, loading, addTodo, toggleTodo, removeTodo };
}
