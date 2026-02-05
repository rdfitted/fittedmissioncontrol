'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Task {
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

interface TasksData {
  backlog: Task[];
  inProgress: Task[];
  completed: Task[];
}

const priorityColors = {
  High: 'bg-red-500/20 text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-zinc-500">{task.id}</span>
        {task.priority && (
          <Badge variant="outline" className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors] || ''}`}>
            {task.priority}
          </Badge>
        )}
      </div>
      <h4 className="font-medium text-zinc-100 text-sm mb-1">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-zinc-500 line-clamp-2">{task.description}</p>
      )}
      {task.summary && (
        <p className="text-xs text-zinc-500 line-clamp-2">{task.summary}</p>
      )}
      {(task.assigned || task.completedBy) && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {task.completedBy ? `✓ ${task.completedBy}` : `→ ${task.assigned}`}
          </span>
          {task.date && <span className="text-xs text-zinc-600">{task.date}</span>}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ title, tasks, color }: { title: string; tasks: Task[]; color: string }) {
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="font-semibold text-zinc-200">{title}</h3>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-zinc-800 text-center text-zinc-600 text-sm">
              No tasks
            </div>
          ) : (
            tasks.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TaskKanban() {
  const [tasks, setTasks] = useState<TasksData>({ backlog: [], inProgress: [], completed: [] });
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-zinc-100">Task Board</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px] text-zinc-500">
            Loading tasks...
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto">
            <KanbanColumn title="Backlog" tasks={tasks.backlog} color="bg-zinc-500" />
            <KanbanColumn title="In Progress" tasks={tasks.inProgress} color="bg-blue-500" />
            <KanbanColumn title="Completed" tasks={tasks.completed} color="bg-green-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
