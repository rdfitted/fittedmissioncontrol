'use client';

import { AgentPanel } from '@/components/agent-panel';
import { TaskBoard } from '@/components/task-board';
import { TodoDrawer } from '@/components/todo-drawer';
import { ChatFeed } from '@/components/chat-feed';
import { ActivityFeed } from '@/components/activity-feed';
import { usePanelCollapse } from '@/hooks/use-panel-collapse';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { collapsed, toggle, setPanel, isHydrated } = usePanelCollapse();

  // Calculate right padding based on todo drawer state
  const rightPadding = collapsed.todoDrawer ? 'pr-12' : 'pr-[320px]';
  
  // Grid columns based on agent panel state
  const gridCols = collapsed.agentPanel 
    ? 'grid-cols-1' 
    : 'grid-cols-1 xl:grid-cols-4';
  
  const contentCols = collapsed.agentPanel 
    ? 'xl:col-span-1' 
    : 'xl:col-span-3';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
              ⬡
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mission Control</h1>
              <p className="text-xs text-zinc-500">Fitted Automation • Agent Squad</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>System Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - with dynamic right padding for todo drawer */}
      <main className={cn('p-6 transition-all duration-300', rightPadding)}>
        <div className={cn('grid gap-6 transition-all duration-300', gridCols)}>
          {/* Left Column - Agents (collapsible) */}
          <div className={cn(
            'transition-all duration-300',
            collapsed.agentPanel ? 'xl:col-span-1' : 'xl:col-span-1'
          )}>
            <AgentPanel 
              collapsed={collapsed.agentPanel} 
              onToggle={() => toggle('agentPanel')} 
            />
          </div>

          {/* Center/Right - Tasks & Activity */}
          <div className={cn('space-y-6 transition-all duration-300', contentCols)}>
            {/* Task Board - always visible */}
            <TaskBoard />

            {/* Bottom Row - Chat & Activity */}
            <div className={cn(
              'grid gap-6 transition-all duration-300',
              collapsed.activityFeed ? 'grid-cols-1 lg:grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
            )}>
              <ChatFeed />
              {!collapsed.activityFeed && (
                <ActivityFeed 
                  collapsed={collapsed.activityFeed} 
                  onToggle={() => toggle('activityFeed')} 
                />
              )}
            </div>
            
            {/* Collapsed Activity Feed - show as minimal bar */}
            {collapsed.activityFeed && (
              <ActivityFeed 
                collapsed={collapsed.activityFeed} 
                onToggle={() => toggle('activityFeed')} 
              />
            )}
          </div>
        </div>
      </main>

      {/* Todo Drawer - Fixed right panel */}
      <TodoDrawer 
        defaultOpen={!collapsed.todoDrawer}
        onToggleChange={(isOpen) => setPanel('todoDrawer', !isOpen)}
      />

      {/* Footer - with dynamic right padding */}
      <footer className={cn(
        'border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600 transition-all duration-300',
        rightPadding
      )}>
        Mission Control v1.0 • Auto-refreshing every 5-15s
      </footer>
    </div>
  );
}
