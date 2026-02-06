'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { SQUAD_ROSTER, SquadMember } from '@/lib/squad-roster';
import { cn } from '@/lib/utils';

interface RosterNodeProps {
  member: SquadMember;
  depth?: number;
}

function RosterNode({ member, depth = 0 }: RosterNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = member.children && member.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer',
          'hover:bg-zinc-800/50 transition-colors'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/Collapse */}
        <span className={cn('w-4 h-4 flex items-center justify-center', !hasChildren && 'invisible')}>
          {hasChildren && (expanded ? (
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-zinc-500" />
          ))}
        </span>

        {/* Emoji */}
        <span className="text-sm">{member.emoji || '👤'}</span>

        {/* Name & Role */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-200">{member.name}</span>
          <span className="text-xs text-zinc-500 ml-2">{member.role}</span>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {member.children!.map((child) => (
            <RosterNode key={child.id} member={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SquadRoster() {
  return (
    <div className="space-y-1">
      {SQUAD_ROSTER.map((member) => (
        <RosterNode key={member.id} member={member} />
      ))}
    </div>
  );
}
