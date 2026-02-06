'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, AlertTriangle, Info, HelpCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/format-timestamp';

interface Alert {
  id: string;
  from: string;
  message: string;
  priority: 'info' | 'needs-input' | 'blocked' | 'urgent';
  createdAt: string;
  resolved?: boolean;
}

const priorityConfig = {
  info: {
    color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    icon: Info,
    label: 'Info',
    dot: 'bg-zinc-400',
  },
  'needs-input': {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: HelpCircle,
    label: 'Needs Input',
    dot: 'bg-blue-400',
  },
  blocked: {
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Ban,
    label: 'Blocked',
    dot: 'bg-amber-400',
  },
  urgent: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: AlertTriangle,
    label: 'Urgent',
    dot: 'bg-red-500 animate-pulse',
  },
};

function AlertRow({ alert, onResolve, onDelete }: { 
  alert: Alert; 
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = priorityConfig[alert.priority];
  const IconComponent = config.icon;
  const timestamp = formatTimestamp(alert.createdAt);

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900'
    )}>
      <div className={cn('p-1.5 rounded-md', config.color)}>
        <IconComponent className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-200">{alert.from}</span>
          <Badge variant="outline" className={cn('text-xs py-0', config.color)}>
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-zinc-400 break-words">{alert.message}</p>
        <span 
          className="text-xs text-zinc-600 mt-1 inline-block cursor-help"
          title={timestamp.tooltip}
        >
          {timestamp.display}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onResolve(alert.id)}
          className="p-1.5 rounded-md hover:bg-green-500/20 text-zinc-500 hover:text-green-400 transition-colors"
          title="Mark resolved"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(alert.id)}
          className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  // Fetch on mount and poll every 10s
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pendingCount = alerts.length;
  const hasUrgent = alerts.some(a => a.priority === 'urgent');

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button with Badge */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
          open && 'bg-zinc-800 text-zinc-200'
        )}
        aria-label={`${pendingCount} alerts`}
      >
        <Bell className={cn('w-5 h-5', hasUrgent && 'text-red-400')} />
        
        {pendingCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full',
            'flex items-center justify-center text-xs font-bold',
            'bg-red-500 text-white',
            hasUrgent && 'animate-pulse'
          )}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className={cn(
          'absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)]',
          'bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl',
          'z-50 overflow-hidden'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-100">Alerts</h3>
              <Badge variant="outline" className="bg-zinc-800/50 text-zinc-400 border-zinc-700">
                {pendingCount} pending
              </Badge>
            </div>
          </div>

          {/* Alerts List */}
          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-zinc-500">
                  Loading alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                  <Bell className="w-8 h-8 mb-2 opacity-50" />
                  <p>No pending alerts</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onResolve={resolveAlert}
                    onDelete={deleteAlert}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
