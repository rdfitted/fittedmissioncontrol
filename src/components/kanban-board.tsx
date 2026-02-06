'use client';

import { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks, Task, TaskStatus, statusColors } from '@/hooks/use-tasks';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Check, User, MessageSquare, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TaskDetailModal } from '@/components/task-detail-modal';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Column configuration
const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'active', label: 'Active' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'review', label: 'Review' },
  { status: 'ready', label: 'Ready' },
  { status: 'complete', label: 'Complete' },
];

const priorityColors = {
  High: 'bg-red-500/20 text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function TaskCardContent({ task, onComplete, onClick, isDragging, isOverlay }: TaskCardProps) {
  const isBlocked = task.status === 'blocked';
  const messageCount = task.messages?.length || 0;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
    onClick?.(task);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-3 rounded-lg border border-zinc-800 bg-zinc-900/70
        hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200
        cursor-pointer
        ${isBlocked ? 'ring-1 ring-red-500/30' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isOverlay ? 'shadow-2xl ring-2 ring-emerald-500/50 rotate-2' : ''}
      `}
    >
      {/* Header with drag handle */}
      <div className="flex items-start gap-2 mb-2">
        <div 
          data-drag-handle
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 mt-0.5"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-mono text-zinc-600 shrink-0">{task.id}</span>
        {task.priority && (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
            {task.priority}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-zinc-200 line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{task.description}</p>
      )}

      {/* Blocker warning */}
      {isBlocked && task.blockedBy && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-red-500/10 border border-red-500/20 mb-2">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
          <span className="text-xs text-red-300 line-clamp-2">{task.blockedBy}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          {task.assigned && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <User className="w-3 h-3" />
              <span>{task.assigned}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messageCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <MessageSquare className="w-3 h-3" />
              <span>{messageCount}</span>
            </div>
          )}
          {task.status !== 'complete' && task.status !== 'ready' && onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-green-400 transition-colors"
              title="Mark complete"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Sortable task card wrapper
function SortableTaskCard({ task, onComplete, onClick }: Omit<TaskCardProps, 'isDragging' | 'isOverlay'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardContent 
        task={task} 
        onComplete={onComplete} 
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onComplete?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
}

function KanbanColumn({ status, label, tasks, onComplete, onTaskClick }: KanbanColumnProps) {
  const colors = statusColors[status];
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  return (
    <div className="flex flex-col w-[280px] min-w-[280px] h-full">
      {/* Column Header */}
      <div className={`flex items-center justify-between p-3 rounded-t-lg ${colors.bg} border-b-2 ${colors.border.replace('border-l-', 'border-b-')}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
        </div>
        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">
          {tasks.length}
        </span>
      </div>

      {/* Task List - Droppable area */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          data-column={status}
          className="flex-1 p-2 space-y-2 overflow-y-auto bg-zinc-950/50 rounded-b-lg border border-t-0 border-zinc-800 min-h-[100px]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-zinc-600 border-2 border-dashed border-zinc-800 rounded-lg">
              Drop here
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard 
                key={task.id} 
                task={task} 
                onComplete={onComplete}
                onClick={onTaskClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      {KANBAN_COLUMNS.map(({ status, label }) => {
        const colors = statusColors[status];
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-zinc-500">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function KanbanBoard() {
  const { tasks, loading, error, refresh, completeTask, updateTaskStatus, reorderTasks } = useTasks();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Local state for optimistic UI during drag
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const displayTasks = localTasks.length > 0 ? localTasks : tasks;

  // Update local tasks when API tasks change (but not during drag)
  useMemo(() => {
    if (!activeTask) {
      setLocalTasks(tasks);
    }
  }, [tasks, activeTask]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status with position-based sorting
  const tasksByStatus: Record<TaskStatus, Task[]> = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      active: [],
      blocked: [],
      review: [],
      ready: [],
      complete: [],
    };

    displayTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort each column by position (lower = higher priority = top)
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => {
        const posA = a.position ?? 999999;
        const posB = b.position ?? 999999;
        return posA - posB;
      });
    });

    return grouped;
  }, [displayTasks]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setTimeout(() => setSelectedTask(null), 150);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus(taskId, newStatus);
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = displayTasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
      setLocalTasks([...displayTasks]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = localTasks.find(t => t.id === activeId);
    const overTask = localTasks.find(t => t.id === overId);

    if (!activeTask) return;

    // Determine target column
    let targetStatus: TaskStatus;
    
    if (overTask) {
      // Dropping on another task
      targetStatus = overTask.status;
    } else {
      // Dropping on empty column - check data attribute
      const columnStatus = (over.data.current as any)?.sortable?.containerId;
      if (columnStatus && KANBAN_COLUMNS.some(c => c.status === columnStatus)) {
        targetStatus = columnStatus as TaskStatus;
      } else {
        return;
      }
    }

    // If moving to a different column, update the task's status
    if (activeTask.status !== targetStatus) {
      setLocalTasks(prev => {
        return prev.map(t => 
          t.id === activeId ? { ...t, status: targetStatus } : t
        );
      });
    }

    // Handle reordering within/across columns
    if (overTask && activeId !== overId) {
      setLocalTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        const overIndex = prev.findIndex(t => t.id === overId);
        
        if (activeIndex === -1 || overIndex === -1) return prev;

        const newTasks = [...prev];
        const [removed] = newTasks.splice(activeIndex, 1);
        removed.status = targetStatus;
        newTasks.splice(overIndex, 0, removed);
        
        return newTasks;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);

    if (!over) {
      setLocalTasks([]);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeTask = localTasks.find(t => t.id === activeId);
    if (!activeTask) {
      setLocalTasks([]);
      return;
    }

    // Determine final status
    let targetStatus = activeTask.status;
    const overTask = localTasks.find(t => t.id === overId);
    if (overTask && overTask.id !== activeId) {
      targetStatus = overTask.status;
    }

    // Get the column tasks in order after the move
    const columnTasks = localTasks.filter(t => t.status === targetStatus);
    
    // Calculate new positions for all tasks in affected columns
    const updates: Array<{ id: string; status: TaskStatus; position: number }> = [];
    
    // Get unique statuses that were affected
    const affectedStatuses = new Set<TaskStatus>();
    affectedStatuses.add(targetStatus);
    const originalTask = tasks.find(t => t.id === activeId);
    if (originalTask && originalTask.status !== targetStatus) {
      affectedStatuses.add(originalTask.status);
    }

    // Update positions for all affected columns
    affectedStatuses.forEach(status => {
      const statusTasks = localTasks.filter(t => t.status === status);
      statusTasks.forEach((task, index) => {
        updates.push({
          id: task.id,
          status: status,
          position: index,
        });
      });
    });

    // Persist the changes
    if (updates.length > 0) {
      reorderTasks(updates);
    }

    // Keep local tasks until API confirms
    // (useTasks will update when it refetches)
  };

  if (error) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 h-full">
        <CardContent className="flex items-center justify-center h-full text-red-400">
          Error loading tasks: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-semibold text-zinc-100">Team Board</CardTitle>
              <StatusLegend />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                {tasks.length} tasks
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

        <CardContent className="flex-1 relative overflow-hidden p-0">
          {loading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading tasks...
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Scroll buttons */}
              <button
                onClick={scrollLeft}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Horizontally scrollable container */}
              <div
                ref={scrollContainerRef}
                className="h-full overflow-x-auto overflow-y-hidden px-10 py-4"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#3f3f46 transparent',
                }}
              >
                <div className="flex gap-4 h-full min-w-max">
                  {KANBAN_COLUMNS.map(({ status, label }) => (
                    <KanbanColumn
                      key={status}
                      status={status}
                      label={label}
                      tasks={tasksByStatus[status]}
                      onComplete={completeTask}
                      onTaskClick={handleTaskClick}
                    />
                  ))}
                </div>
              </div>

              {/* Drag overlay for visual feedback */}
              <DragOverlay>
                {activeTask ? (
                  <TaskCardContent 
                    task={activeTask} 
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
