'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AgentHierarchy } from '@/components/agent-hierarchy';
import { AgentLifecycle } from '@/components/agent-lifecycle';
import { useAgentsRealtime, AgentLifecycleEvent } from '@/hooks/use-agents';
import type { AgentSession, AgentStatus } from '@/lib/api-types';
import { cn } from '@/lib/utils';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Crown,
  Users,
  Wrench,
  Clock,
  Loader2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

const typeIcons = {
  main: Crown,
  subagent: Users,
  cron: Clock,
  worker: Wrench,
};

const statusColors: Record<AgentStatus, string> = {
  active: 'bg-green-500',
  idle: 'bg-amber-500',
  stale: 'bg-zinc-600',
  error: 'bg-red-500',
};

const statusLabels: Record<AgentStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  stale: 'Stale',
  error: 'Error',
};

interface AgentPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface AgentDetailProps {
  agent: AgentSession;
  onClose: () => void;
}

function AgentDetail({ agent, onClose }: AgentDetailProps) {
  const IconComponent = typeIcons[agent.type] || Users;
  
  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-50">{agent.name}</h3>
            <p className="text-sm text-zinc-500">{agent.label || agent.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-1"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-sm text-zinc-400">
        {agent.lastMessage || `${agent.model} via ${agent.modelProvider}`}
      </p>
      
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={cn(
          'flex items-center gap-1',
          agent.status === 'active' && 'bg-green-500/20 text-green-400 border-green-500/30',
          agent.status === 'idle' && 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          agent.status === 'stale' && 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
          agent.status === 'error' && 'bg-red-500/20 text-red-400 border-red-500/30'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusColors[agent.status])} />
          {statusLabels[agent.status]}
        </Badge>
        
        <Badge variant="outline" className="bg-zinc-800/50 text-zinc-400 border-zinc-700">
          {agent.model}
        </Badge>
        
        {agent.channel && (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {agent.channel}
          </Badge>
        )}
      </div>
      
      {agent.needsHumanInput && (
        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 p-2 rounded text-sm">
          <AlertTriangle className="w-4 h-4" />
          Needs human input
        </div>
      )}
      
      <div className="text-xs space-y-1 text-zinc-500">
        <div>Session: <span className="text-zinc-400 font-mono">{agent.sessionId.slice(0, 8)}</span></div>
        <div>Tokens: <span className="text-zinc-400">{(agent.totalTokens / 1000).toFixed(1)}k</span></div>
        <div>Last active: <span className="text-zinc-400">{new Date(agent.updatedAt).toLocaleString()}</span></div>
      </div>
    </div>
  );
}

export function AgentPanel({ collapsed = false, onToggle }: AgentPanelProps) {
  const { agents, tree, lifecycle, loading, error, connected, stats, refresh } = useAgentsRealtime();
  const [selectedAgent, setSelectedAgent] = useState<AgentSession | null>(null);
  const [showLifecycle, setShowLifecycle] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Convert lifecycle events to the format expected by AgentLifecycle
  const lifecycleForComponent = lifecycle.map((evt): AgentLifecycleEvent => ({
    ...evt,
    type: evt.type as 'spawned' | 'terminated' | 'status_change',
  }));

  // Count agents by type
  const mainCount = agents.filter(a => a.type === 'main').length;
  const subagentCount = agents.filter(a => a.type === 'subagent').length;
  const cronCount = agents.filter(a => a.type === 'cron').length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Collapsed state - narrow vertical strip
  if (collapsed) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 w-14 min-h-[400px] transition-all duration-300">
        <div className="flex flex-col items-center py-4 gap-4">
          {/* Expand button at top */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Expand panel"
              title="Expand Agent Squad"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          
          {/* Connection status */}
          <div className="p-2" title={connected ? 'Connected' : 'Disconnected'}>
            {connected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          
          {/* Active count badge - vertical */}
          <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-md bg-green-500/20 border border-green-500/30">
            <span className="text-lg font-bold text-green-400">{stats.active}</span>
            <span className="text-[10px] text-green-400/70">active</span>
          </div>
          
          {/* Agent type indicators - vertical stack */}
          <div className="flex flex-col items-center gap-3 mt-2">
            <div className="flex flex-col items-center gap-1" title={`${mainCount} Main`}>
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-zinc-500">{mainCount}</span>
            </div>
            <div className="flex flex-col items-center gap-1" title={`${subagentCount} Subagents`}>
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-500">{subagentCount}</span>
            </div>
            <div className="flex flex-col items-center gap-1" title={`${cronCount} Cron`}>
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-500">{cronCount}</span>
            </div>
          </div>
          
          {/* Refresh button at bottom */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 mt-auto"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </Card>
    );
  }

  // Expanded state - full panel
  return (
    <Card className="bg-zinc-950 border-zinc-800 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-zinc-100">Agent Squad</CardTitle>
            {connected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              {stats.active}/{stats.total} Active
            </Badge>
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label="Collapse panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Type counts - always visible as summary */}
        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" />
            {mainCount} Main
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-400" />
            {subagentCount} Subagents
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" />
            {cronCount} Cron
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-4">
            Error: {error}
          </div>
        ) : (
          <>
            {/* Hierarchy Tree View */}
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                Hierarchy
              </h4>
              <AgentHierarchy
                tree={tree}
                onSelect={setSelectedAgent}
                selectedId={selectedAgent?.id}
              />
            </div>

            {/* Selected Agent Detail */}
            {selectedAgent && (
              <AgentDetail
                agent={selectedAgent}
                onClose={() => setSelectedAgent(null)}
              />
            )}

            <Separator className="bg-zinc-800" />

            {/* Lifecycle Events */}
            <div>
              <button
                onClick={() => setShowLifecycle(!showLifecycle)}
                className="flex items-center justify-between w-full text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 hover:text-zinc-400 transition-colors"
              >
                <span>Recent Activity</span>
                {showLifecycle ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showLifecycle && (
                <AgentLifecycle events={lifecycleForComponent} maxHeight="200px" />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
