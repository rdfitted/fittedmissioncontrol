'use client';

import { Zap, XCircle, RefreshCw, ClipboardList } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AgentLifecycleEvent } from '@/hooks/use-agents';
import { cn } from '@/lib/utils';

const eventConfig: Record<AgentLifecycleEvent['type'], { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  spawned: {
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Active',
  },
  terminated: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Error',
  },
  status_change: {
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Updated',
  },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

interface LifecycleEventCardProps {
  event: AgentLifecycleEvent;
  isLast?: boolean;
}

function LifecycleEventCard({ event, isLast }: LifecycleEventCardProps) {
  const config = eventConfig[event.type];

  return (
    <div className="relative flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center',
          config.bgColor,
          config.color
        )}>
          {config.icon}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-zinc-800 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-zinc-100">{event.agentName}</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              config.bgColor,
              config.color
            )}>
              {config.label}
            </span>
          </div>
          <span className="text-xs text-zinc-500">{formatTimeAgo(event.timestamp)}</span>
        </div>
        
        {event.details && (
          <p className="text-xs text-zinc-400 mt-1 truncate">{event.details}</p>
        )}
        
        {event.parentName && event.type === 'spawned' && (
          <p className="text-xs text-zinc-500 mt-1">
            Parent: <span className="text-zinc-400">{event.parentName}</span>
          </p>
        )}
        
        <p className="text-[10px] text-zinc-600 mt-1">{formatTime(event.timestamp)}</p>
      </div>
    </div>
  );
}

interface AgentLifecycleProps {
  events: AgentLifecycleEvent[];
  maxHeight?: string;
}

export function AgentLifecycle({ events, maxHeight = '300px' }: AgentLifecycleProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No lifecycle events
      </div>
    );
  }

  return (
    <ScrollArea className="pr-4" style={{ height: maxHeight }}>
      <div className="space-y-0">
        {events.map((event, idx) => (
          <LifecycleEventCard
            key={event.id}
            event={event}
            isLast={idx === events.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// Compact inline indicator for spawn/terminate
interface SpawnIndicatorProps {
  status: 'spawning' | 'terminating' | 'spawned' | 'terminated';
}

export function SpawnIndicator({ status }: SpawnIndicatorProps) {
  const configs = {
    spawning: { color: 'text-green-400 bg-green-500/20', text: 'Spawning...' },
    terminating: { color: 'text-red-400 bg-red-500/20', text: 'Terminating...' },
    spawned: { color: 'text-green-400 bg-green-500/20', text: 'Just spawned' },
    terminated: { color: 'text-red-400 bg-red-500/20', text: 'Terminated' },
  };

  const config = configs[status];

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
      config.color,
      (status === 'spawning' || status === 'terminating') && 'animate-pulse'
    )}>
      {status === 'spawning' && <Zap className="w-3 h-3" />}
      {status === 'terminating' && <XCircle className="w-3 h-3" />}
      {config.text}
    </span>
  );
}
