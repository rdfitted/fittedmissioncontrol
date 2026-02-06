'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, User, MessageSquare, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task, TaskStatus, statusColors, TaskMessage, Subtask, SubtaskStatus } from '@/hooks/use-tasks';
import { formatTimestamp } from '@/lib/format-timestamp';

interface TaskColumnProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  messages?: TaskMessage[];
  subtasks?: Subtask[];
}

const priorityColors = {
  High: 'bg-red-500/20 text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const agentColors: Record<string, string> = {
  'Hex Prime': 'text-emerald-400',
  'Architect': 'text-blue-400',
  'Frontend': 'text-cyan-400',
  'Backend': 'text-indigo-400',
  'Social': 'text-pink-400',
  'Outreach': 'text-orange-400',
  'Inbound': 'text-amber-400',
  'Research': 'text-violet-400',
};

function formatBlockedDuration(blockedAt: number): { text: string; isUrgent: boolean } {
  const date = new Date(blockedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return { text: 'Blocked <1h', isUrgent: false };
  if (diffHours < 24) return { text: `Blocked ${diffHours}h`, isUrgent: false };
  if (diffDays === 1) return { text: 'Blocked 1 day', isUrgent: false };
  return { text: `Blocked ${diffDays} days`, isUrgent: diffDays > 3 };
}

function CheckboxAnimated({ 
  checked, 
  onChange 
}: { 
  checked: boolean; 
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`
        w-5 h-5 rounded border-2 flex items-center justify-center
        transition-all duration-300 ease-out
        ${checked 
          ? 'bg-green-500 border-green-500 scale-110' 
          : 'border-zinc-600 hover:border-zinc-400 hover:scale-105'
        }
      `}
    >
      <Check 
        className={`
          w-3 h-3 text-white transition-all duration-300
          ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
        `}
        strokeWidth={3}
      />
    </button>
  );
}

function ChatMessage({ message }: { message: TaskMessage }) {
  const agentColor = agentColors[message.agent] || 'text-zinc-400';
  const timestamp = formatTimestamp(message.timestamp);
  
  return (
    <div className="flex gap-2 py-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className={`w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold shrink-0 ${agentColor}`}>
        {message.agent[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xs font-medium ${agentColor}`}>{message.agent}</span>
          <span 
            className="text-[10px] text-zinc-600 cursor-help"
            title={timestamp.tooltip}
          >
            {timestamp.display}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
          {message.message}
        </p>
      </div>
    </div>
  );
}

function BlockerSection({ reason, blockedAt }: { reason: string; blockedAt?: number }) {
  const duration = blockedAt ? formatBlockedDuration(blockedAt) : null;
  
  return (
    <div className="mx-4 mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              Blocked by
            </span>
          </div>
          <p className="text-sm text-amber-200/90 leading-relaxed">
            "{reason}"
          </p>
          {duration && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${duration.isUrgent ? 'text-red-400' : 'text-amber-400/70'}`}>
              <Clock className="w-3 h-3" />
              <span>{duration.text}</span>
              {duration.isUrgent && <span className="text-red-400 font-medium">⚠️ Needs attention</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subtask status colors
const subtaskStatusColors: Record<SubtaskStatus, { dot: string; text: string }> = {
  backlog: { dot: 'bg-slate-500', text: 'text-slate-400' },
  active: { dot: 'bg-blue-500', text: 'text-blue-400' },
  complete: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
};

function SubtaskItem({ subtask }: { subtask: Subtask }) {
  const colors = subtaskStatusColors[subtask.status];
  const assignee = subtask.assigned || subtask.assignee;
  
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-800/50 transition-colors">
      <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
      <span className={`text-xs flex-1 min-w-0 truncate ${subtask.status === 'complete' ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
        {subtask.title}
      </span>
      {assignee && (
        <span className="text-[10px] text-zinc-500 shrink-0">{assignee}</span>
      )}
    </div>
  );
}

function SubtaskList({ subtasks }: { subtasks: Subtask[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!subtasks || subtasks.length === 0) return null;
  
  const completedCount = subtasks.filter(s => s.status === 'complete').length;
  const totalCount = subtasks.length;
  const progressPercent = (completedCount / totalCount) * 100;
  
  return (
    <div className="mx-4 mb-3">
      {/* Collapse trigger with progress */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full py-2 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
        )}
        <span className="text-xs text-zinc-400">
          <span className="text-emerald-400 font-medium">✓ {completedCount}</span>
          <span className="text-zinc-500">/{totalCount}</span>
          <span className="text-zinc-500 ml-1">subtasks</span>
        </span>
        {/* Mini progress bar */}
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-2">
          <div 
            className="h-full bg-emerald-500/70 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </button>
      
      {/* Expanded subtask list */}
      {isExpanded && (
        <div className="mt-1 ml-2 border-l border-zinc-700/50 pl-2 space-y-0.5 max-h-32 overflow-y-auto">
          {subtasks.map((subtask, idx) => (
            <SubtaskItem key={subtask.id || idx} subtask={subtask} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskColumn({ task, onComplete, messages = [], subtasks }: TaskColumnProps) {
  const [isCompleted, setIsCompleted] = useState(task.status === 'ready');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const colors = statusColors[task.status];
  const isBlocked = task.status === 'blocked';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleComplete = () => {
    setIsCompleted(!isCompleted);
    if (!isCompleted && onComplete) {
      onComplete(task.id);
    }
  };

  return (
    <div 
      className={`
        w-[360px] min-w-[360px] h-full flex flex-col
        bg-zinc-900/50 rounded-lg border border-zinc-800
        border-l-4 ${colors.border}
        scroll-snap-align-start
        transition-all duration-200 hover:border-zinc-700
        ${isBlocked ? 'ring-1 ring-red-500/30 bg-red-500/5' : ''}
      `}
    >
      {/* Task Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-start gap-3">
          <CheckboxAnimated checked={isCompleted} onChange={handleComplete} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-zinc-500">{task.id}</span>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${colors.bg} ${isBlocked ? 'ring-1 ring-red-500/50' : ''}`}>
                <div className={`rounded-full ${colors.dot} ${isBlocked ? 'w-2 h-2 animate-pulse' : 'w-1.5 h-1.5'}`} />
                {isBlocked && <AlertTriangle className="w-3 h-3 text-red-400" />}
                <span className={`${colors.text} ${isBlocked ? 'font-semibold uppercase' : ''}`}>{task.status}</span>
              </div>
            </div>
            <h3 className={`font-medium text-sm ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>
        
        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {task.priority && (
            <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
          )}
          {task.assigned && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <User className="w-3 h-3" />
              <span>{task.assigned}</span>
            </div>
          )}
        </div>
      </div>

      {/* Blocker Section - shown only for blocked tasks */}
      {isBlocked && task.blockedBy && (
        <BlockerSection reason={task.blockedBy} blockedAt={task.blockedAt} />
      )}

      {/* Subtasks Section */}
      <SubtaskList subtasks={subtasks || task.subtasks || []} />

      {/* Chat Thread (read-only - editing happens in TaskDetailModal) */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No messages yet</span>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
      </div>
    </div>
  );
}
