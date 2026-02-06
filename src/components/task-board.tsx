'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskColumn } from '@/components/task-column';
import { useTasks, Task, TaskStatus, statusColors } from '@/hooks/use-tasks';
import { ChevronLeft, ChevronRight, RefreshCw, Filter, Eye, EyeOff } from 'lucide-react';

interface TaskBoardProps {
  filterStatus?: TaskStatus[];
  title?: string;
}

type FilterOption = 'all' | TaskStatus;

function StatusLegend() {
  const statuses: TaskStatus[] = ['backlog', 'active', 'blocked', 'review', 'ready'];
  
  return (
    <div className="flex items-center gap-3 text-xs">
      {statuses.map(status => {
        const colors = statusColors[status];
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-zinc-500 capitalize">{status}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TaskBoard({ filterStatus, title = 'Team Board' }: TaskBoardProps) {
  const { tasks, loading, error, refresh, completeTask } = useTasks();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  // Filter tasks: prop filter > local filter, then apply completed visibility
  let filteredTasks = filterStatus 
    ? tasks.filter(t => filterStatus.includes(t.status))
    : statusFilter === 'all'
      ? tasks
      : tasks.filter(t => t.status === statusFilter);
  
  // Auto-hide completed (ready) tasks unless toggled on
  if (!showCompleted && statusFilter !== 'ready') {
    filteredTasks = filteredTasks.filter(t => t.status !== 'ready');
  }

  // Sort by status priority: active > blocked > review > backlog > ready > complete
  const statusOrder: Record<TaskStatus, number> = {
    active: 0,
    blocked: 1,
    review: 2,
    backlog: 3,
    ready: 4,
    complete: 5,
  };
  
  const sortedTasks = [...filteredTasks].sort((a, b) => 
    statusOrder[a.status] - statusOrder[b.status]
  );

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  // Get messages from task (real data, not mock)
  const getTaskMessages = (task: Task) => {
    return task.messages || [];
  };

  if (error) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="flex items-center justify-center h-[500px] text-red-400">
          Error loading tasks: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg font-semibold text-zinc-100">{title}</CardTitle>
            <StatusLegend />
          </div>
          <div className="flex items-center gap-3">
            {/* Status filter dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterOption)}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="backlog">Backlog</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="ready">Done</option>
              </select>
            </div>
            
            {/* Show completed toggle */}
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                showCompleted 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
              }`}
              title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
            >
              {showCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Done</span>
            </button>
            
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
              {sortedTasks.length} tasks
            </span>
            <button
              onClick={() => refresh()}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        {loading && sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-[500px] text-zinc-500">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading tasks...
            </div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-[500px] text-zinc-600">
            No tasks found
          </div>
        ) : (
          <>
            {/* Scroll buttons */}
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Scrollable container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-4 px-8 scroll-smooth snap-x snap-mandatory"
              style={{ 
                scrollbarWidth: 'thin', 
                scrollbarColor: '#3f3f46 transparent',
                height: '520px',
              }}
            >
              {sortedTasks.map(task => (
                <TaskColumn
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  messages={getTaskMessages(task)}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
