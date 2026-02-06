'use client';

import { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerContent?: ReactNode;
  collapsedContent?: ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  title,
  collapsed,
  onToggle,
  children,
  headerContent,
  collapsedContent,
  className,
}: CollapsiblePanelProps) {
  return (
    <Card className={cn('bg-zinc-950 border-zinc-800 transition-all duration-300', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-zinc-100">{title}</CardTitle>
            {headerContent}
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-2 shrink-0"
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
        {collapsed && collapsedContent && (
          <div className="mt-2">{collapsedContent}</div>
        )}
      </CardHeader>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        )}
      >
        <CardContent className="pt-0">{children}</CardContent>
      </div>
    </Card>
  );
}
