'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Crown, Users, Wrench, Clock, Zap } from 'lucide-react';
import type { AgentTreeNode, AgentSession, AgentType, AgentStatus } from '@/lib/api-types';
import { cn } from '@/lib/utils';

const typeIcons: Record<AgentType, React.ReactNode> = {
  main: <Crown className="w-4 h-4 text-amber-400" />,
  subagent: <Users className="w-4 h-4 text-blue-400" />,
  cron: <Clock className="w-4 h-4 text-purple-400" />,
};

const typeLabels: Record<AgentType, string> = {
  main: 'Queen',
  subagent: 'Agent',
  cron: 'Cron',
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

interface TreeNodeProps {
  node: AgentTreeNode;
  onSelect?: (agent: AgentSession) => void;
  selectedId?: string;
}

function TreeNodeComponent({ node, onSelect, selectedId }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const { agent, depth } = node;
  const isSelected = selectedId === agent.id;

  // Determine label-based role icon
  const getRoleIcon = () => {
    if (agent.type === 'main') return typeIcons.main;
    if (agent.label === 'planner') return <Users className="w-4 h-4 text-blue-400" />;
    if (agent.label === 'worker') return <Wrench className="w-4 h-4 text-zinc-400" />;
    return typeIcons[agent.type];
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all',
          'hover:bg-zinc-800/50',
          isSelected && 'bg-zinc-800 ring-1 ring-zinc-700'
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => onSelect?.(agent)}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {/* Role Icon */}
        <div className="flex-shrink-0">
          {getRoleIcon()}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-zinc-50">{agent.name}</span>
            {agent.status === 'active' && (
              <Zap className="w-3.5 h-3.5 text-green-400" />
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {agent.label || typeLabels[agent.type]}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div 
            className={cn(
              'w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950',
              statusColors[agent.status]
            )} 
            title={statusLabels[agent.status]}
          />
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative">
          {/* Vertical connecting line */}
          <div 
            className="absolute left-[26px] top-0 bottom-4 w-px bg-zinc-800"
            style={{ marginLeft: `${depth * 20}px` }}
          />
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.agent.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentHierarchyProps {
  tree: AgentTreeNode[];
  onSelect?: (agent: AgentSession) => void;
  selectedId?: string;
}

export function AgentHierarchy({ tree, onSelect, selectedId }: AgentHierarchyProps) {
  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No agents in hierarchy
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map((node) => (
        <TreeNodeComponent
          key={node.agent.id}
          node={node}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
