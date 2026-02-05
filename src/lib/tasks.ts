import fs from 'fs/promises';
import path from 'path';

// Base directory for task storage (relative to project root, up one level to squad/tasks)
export const TASKS_DIR = path.join(process.cwd(), '..', 'squad', 'tasks');
export const TASKS_JSON_DIR = path.join(TASKS_DIR, 'json');
export const ARCHIVED_DIR = path.join(TASKS_DIR, 'archived');
export const TODOS_FILE = path.join(TASKS_DIR, 'todos.json');

// ============ Types ============

export type TaskStatus = 'backlog' | 'in-progress' | 'completed' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ChatMessage {
  id: string;
  author: string;        // Agent name or "Ryan"
  content: string;
  timestamp: number;     // Unix ms
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigned?: string;     // Agent name
  deliverable?: string;
  createdAt: number;     // Unix ms
  updatedAt: number;     // Unix ms
  completedAt?: number;
  completedBy?: string;
  tags?: string[];
  chat: ChatMessage[];   // Embedded chat thread
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface TodoList {
  owner: string;         // "Ryan"
  todos: Todo[];
  updatedAt: number;
}

// ============ Helpers ============

export function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTodoId(): string {
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Ensure directories exist
export async function ensureDirs(): Promise<void> {
  await fs.mkdir(TASKS_JSON_DIR, { recursive: true });
  await fs.mkdir(ARCHIVED_DIR, { recursive: true });
}

// ============ Task CRUD ============

export async function getAllTasks(): Promise<Task[]> {
  await ensureDirs();
  
  try {
    const files = await fs.readdir(TASKS_JSON_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const tasks: Task[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(TASKS_JSON_DIR, file), 'utf-8');
        tasks.push(JSON.parse(content));
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by priority (critical first) then by updatedAt
    const priorityOrder: Record<Priority, number> = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3,
    };
    
    return tasks.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.updatedAt - a.updatedAt;
    });
  } catch {
    return [];
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  await ensureDirs();
  
  try {
    const filePath = path.join(TASKS_JSON_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Check archived
    try {
      const archivedPath = path.join(ARCHIVED_DIR, `${id}.json`);
      const content = await fs.readFile(archivedPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export async function createTask(data: {
  title: string;
  description?: string;
  priority?: Priority;
  assigned?: string;
  deliverable?: string;
  tags?: string[];
}): Promise<Task> {
  await ensureDirs();
  
  const now = Date.now();
  const task: Task = {
    id: generateId(),
    title: data.title,
    description: data.description,
    status: 'backlog',
    priority: data.priority || 'medium',
    assigned: data.assigned,
    deliverable: data.deliverable,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
    chat: [],
  };
  
  const filePath = path.join(TASKS_JSON_DIR, `${task.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(task, null, 2));
  
  return task;
}

export async function updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assigned' | 'deliverable' | 'tags' | 'completedBy'>>): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) return null;
  
  const now = Date.now();
  const updatedTask: Task = {
    ...task,
    ...updates,
    updatedAt: now,
  };
  
  // If marking as completed, set completedAt
  if (updates.status === 'completed' && task.status !== 'completed') {
    updatedTask.completedAt = now;
  }
  
  const filePath = path.join(TASKS_JSON_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(updatedTask, null, 2));
  
  return updatedTask;
}

export async function archiveTask(id: string): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) return null;
  
  const now = Date.now();
  const archivedTask: Task = {
    ...task,
    status: 'archived',
    updatedAt: now,
  };
  
  // Move to archived directory
  const sourcePath = path.join(TASKS_JSON_DIR, `${id}.json`);
  const destPath = path.join(ARCHIVED_DIR, `${id}.json`);
  
  await fs.writeFile(destPath, JSON.stringify(archivedTask, null, 2));
  
  try {
    await fs.unlink(sourcePath);
  } catch {
    // Source might not exist if already archived
  }
  
  return archivedTask;
}

export async function addChatMessage(taskId: string, author: string, content: string): Promise<ChatMessage | null> {
  const task = await getTaskById(taskId);
  if (!task) return null;
  
  const message: ChatMessage = {
    id: generateMessageId(),
    author,
    content,
    timestamp: Date.now(),
  };
  
  task.chat.push(message);
  task.updatedAt = Date.now();
  
  const filePath = path.join(TASKS_JSON_DIR, `${taskId}.json`);
  await fs.writeFile(filePath, JSON.stringify(task, null, 2));
  
  return message;
}

// ============ Todos CRUD ============

async function loadTodos(): Promise<TodoList> {
  await ensureDirs();
  
  try {
    const content = await fs.readFile(TODOS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Initialize with empty list
    const emptyList: TodoList = {
      owner: 'Ryan',
      todos: [],
      updatedAt: Date.now(),
    };
    await fs.writeFile(TODOS_FILE, JSON.stringify(emptyList, null, 2));
    return emptyList;
  }
}

async function saveTodos(list: TodoList): Promise<void> {
  await ensureDirs();
  list.updatedAt = Date.now();
  await fs.writeFile(TODOS_FILE, JSON.stringify(list, null, 2));
}

export async function getAllTodos(): Promise<Todo[]> {
  const list = await loadTodos();
  return list.todos;
}

export async function addTodo(text: string): Promise<Todo> {
  const list = await loadTodos();
  
  const todo: Todo = {
    id: generateTodoId(),
    text,
    completed: false,
    createdAt: Date.now(),
  };
  
  list.todos.push(todo);
  await saveTodos(list);
  
  return todo;
}

export async function toggleTodo(id: string): Promise<Todo | null> {
  const list = await loadTodos();
  
  const todo = list.todos.find(t => t.id === id);
  if (!todo) return null;
  
  todo.completed = !todo.completed;
  todo.completedAt = todo.completed ? Date.now() : undefined;
  
  await saveTodos(list);
  return todo;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const list = await loadTodos();
  
  const idx = list.todos.findIndex(t => t.id === id);
  if (idx === -1) return false;
  
  list.todos.splice(idx, 1);
  await saveTodos(list);
  
  return true;
}
