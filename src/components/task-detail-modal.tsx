'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskStatus, statusColors } from '@/hooks/use-tasks';
import {
  User,
  MessageSquare,
  Calendar,
  CheckSquare,
  Square,
  Plus,
  Send,
  AlertTriangle,
  Clock,
  FolderOpen,
} from 'lucide-react';

const priorityColors = {
  High: 'bg-red-500/20 text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'review', label: 'Review' },
  { value: 'ready', label: 'Ready' },
  { value: 'complete', label: 'Complete' },
];

interface Subtask {
  id: string;
  title: string;
  status: string;
  assignee?: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAddComment?: (taskId: string, comment: string) => void;
  onAddSubtask?: (taskId: string, subtask: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onAddComment,
  onAddSubtask,
  onToggleSubtask,
}: TaskDetailModalProps) {
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const handleStatusChange = useCallback(
    (newStatus: TaskStatus) => {
      if (task && onStatusChange) {
        onStatusChange(task.id, newStatus);
      }
    },
    [task, onStatusChange]
  );

  const handleAddComment = useCallback(() => {
    if (task && onAddComment && newComment.trim()) {
      onAddComment(task.id, newComment.trim());
      setNewComment('');
    }
  }, [task, onAddComment, newComment]);

  const handleAddSubtask = useCallback(() => {
    if (task && onAddSubtask && newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim());
      setNewSubtask('');
      setIsAddingSubtask(false);
    }
  }, [task, onAddSubtask, newSubtask]);

  const handleToggleSubtask = useCallback(
    (subtaskId: string) => {
      if (task && onToggleSubtask) {
        onToggleSubtask(task.id, subtaskId);
      }
    },
    [task, onToggleSubtask]
  );

  if (!task) return null;

  const colors = statusColors[task.status];
  const subtasks = (task as any).subtasks as Subtask[] | undefined;
  const activity = (task as any).activity as any[] | undefined;

  // Format date for display
  const formatDate = (dateStr?: string | number) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-1 self-stretch rounded-full ${colors.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-zinc-500">{task.id}</span>
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${priorityColors[task.priority]}`}
                  >
                    {task.priority}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-semibold text-zinc-100 leading-tight">
                {task.title}
              </DialogTitle>
              {task.description && (
                <DialogDescription className="mt-2 text-sm text-zinc-400">
                  {task.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
          {/* Status and Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status Selector */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                  ${colors.bg} ${colors.text} border-zinc-700 hover:border-zinc-600
                  bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">
                Assignee
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <User className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">
                  {task.assigned || (task as any).assignee || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Blocker Warning */}
          {task.status === 'blocked' && task.blockedBy && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-red-300">Blocked</span>
                <p className="text-sm text-red-200/80 mt-1">{task.blockedBy}</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(task as any).project && (
              <div className="flex items-center gap-2 text-zinc-400">
                <FolderOpen className="w-4 h-4 text-zinc-500" />
                <span>Project: <span className="text-zinc-300">{(task as any).project}</span></span>
              </div>
            )}
            {(task as any).created && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Created: <span className="text-zinc-300">{formatDate((task as any).created)}</span></span>
              </div>
            )}
            {(task as any).updated && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>Updated: <span className="text-zinc-300">{formatDate((task as any).updated)}</span></span>
              </div>
            )}
            {task.date && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>Due: <span className="text-zinc-300">{task.date}</span></span>
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-zinc-500" />
                Subtasks
                {subtasks && subtasks.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    ({subtasks.filter((s) => s.status === 'complete').length}/{subtasks.length})
                  </span>
                )}
              </h3>
              {onAddSubtask && !isAddingSubtask && (
                <button
                  onClick={() => setIsAddingSubtask(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>

            <div className="space-y-2">
              {subtasks && subtasks.length > 0 ? (
                subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <button
                      onClick={() => handleToggleSubtask(subtask.id)}
                      className="mt-0.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {subtask.status === 'complete' ? (
                        <CheckSquare className="w-4 h-4 text-green-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm ${
                          subtask.status === 'complete'
                            ? 'text-zinc-500 line-through'
                            : 'text-zinc-200'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      {subtask.assignee && (
                        <span className="ml-2 text-xs text-zinc-500">
                          → {subtask.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-600 italic">No subtasks</div>
              )}

              {/* Add subtask input */}
              {isAddingSubtask && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask();
                      if (e.key === 'Escape') {
                        setIsAddingSubtask(false);
                        setNewSubtask('');
                      }
                    }}
                    placeholder="New subtask..."
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 
                      text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddSubtask}
                    disabled={!newSubtask.trim()}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingSubtask(false);
                      setNewSubtask('');
                    }}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Chat/Comments Section */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
              Activity & Comments
              {task.messages && task.messages.length > 0 && (
                <span className="text-xs text-zinc-500">({task.messages.length})</span>
              )}
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {/* Activity log */}
              {activity &&
                activity.map((act, idx) => (
                  <div
                    key={`activity-${idx}`}
                    className="flex items-start gap-3 p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-zinc-400">
                        {act.agent?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-300">
                          {act.agent}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {act.action}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {formatDate(act.timestamp)}
                        </span>
                      </div>
                      {act.note && (
                        <p className="text-sm text-zinc-400 mt-1">{act.note}</p>
                      )}
                    </div>
                  </div>
                ))}

              {/* Messages */}
              {task.messages &&
                task.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-blue-400">
                        {msg.agent?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-200">
                          {msg.agent}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{msg.message}</p>
                    </div>
                  </div>
                ))}

              {(!task.messages || task.messages.length === 0) &&
                (!activity || activity.length === 0) && (
                  <div className="text-sm text-zinc-600 italic">No activity yet</div>
                )}
            </div>

            {/* Add comment input */}
            {onAddComment && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 
                    text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Deliverable */}
          {task.deliverable && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Deliverable</h3>
              <p className="text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                {task.deliverable}
              </p>
            </div>
          )}

          {/* Summary (for completed tasks) */}
          {task.summary && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Summary</h3>
              <p className="text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                {task.summary}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
