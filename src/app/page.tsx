'use client';

import { AgentPanel } from '@/components/agent-panel';
import { KanbanBoard } from '@/components/kanban-board';
import { TodoDrawer } from '@/components/todo-drawer';
import { ChatFeed } from '@/components/chat-feed';
import { ActivityFeed } from '@/components/activity-feed';
import { AlertsPanel } from '@/components/alerts-panel';
import { usePanelCollapse } from '@/hooks/use-panel-collapse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { LayoutGrid, MessageSquare, Activity, Calendar, FileText, Database } from 'lucide-react';
import { PlanningTab } from '@/components/planning-tab';
import { ContentTab } from '@/components/content-tab';
import { CrmHub } from '@/components/crm-hub';

export default function Dashboard() {
  const { collapsed, toggle, setPanel, isHydrated } = usePanelCollapse();

  // Calculate right padding based on todo drawer state
  const rightPadding = collapsed.todoDrawer ? 'pr-12' : 'pr-[320px]';

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header - fixed height */}
      <header className="border-b border-zinc-800 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-lg font-bold">
              ⬡
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">The Squad</h1>
              <p className="text-xs text-zinc-500">Fitted Automation • Agent Squad</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AlertsPanel />
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>System Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - fills remaining height */}
      <main className={cn('flex-1 flex overflow-hidden transition-all duration-300', rightPadding)}>
        {/* Left Column - Agent Panel (fixed, never scrolls away) */}
        <div className={cn(
          'shrink-0 border-r border-zinc-800 transition-all duration-300',
          collapsed.agentPanel ? 'w-14' : 'w-72'
        )}>
          <AgentPanel 
            collapsed={collapsed.agentPanel} 
            onToggle={() => toggle('agentPanel')} 
          />
        </div>

        {/* Right Column - Content with tabs (scrollable independently) */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <Tabs defaultValue="board" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-fit bg-zinc-900 border border-zinc-800 shrink-0 mb-4">
              <TabsTrigger 
                value="board" 
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Team Board
              </TabsTrigger>
              <TabsTrigger 
                value="crm"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <Database className="w-4 h-4" />
                CRM
              </TabsTrigger>
              <TabsTrigger 
                value="content"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <FileText className="w-4 h-4" />
                Content
              </TabsTrigger>
              <TabsTrigger 
                value="planning"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <Calendar className="w-4 h-4" />
                Planning
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Squad Chat
              </TabsTrigger>
              <TabsTrigger 
                value="activity"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-2"
              >
                <Activity className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Team Board Tab - Kanban takes full vertical space */}
            <TabsContent 
              value="board" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <KanbanBoard />
              </div>
            </TabsContent>

            {/* CRM Tab */}
            <TabsContent 
              value="crm" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <CrmHub />
              </div>
            </TabsContent>

            {/* Planning Tab - Weekly planning sessions */}
            <TabsContent 
              value="planning" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <PlanningTab />
              </div>
            </TabsContent>

            {/* Squad Chat Tab - full height chat */}
            <TabsContent 
              value="chat" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <ChatFeedFull />
              </div>
            </TabsContent>

            {/* Activity Tab - dedicated activity feed */}
            <TabsContent 
              value="activity" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <ActivityFeed fullHeight />
              </div>
            </TabsContent>

            {/* Content Tab - CMS content review */}
            <TabsContent 
              value="content" 
              className="flex-1 mt-0 overflow-hidden"
            >
              <div className="h-full">
                <ContentTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Todo Drawer - Fixed right panel */}
      <TodoDrawer 
        defaultOpen={!collapsed.todoDrawer}
        onToggleChange={(isOpen) => setPanel('todoDrawer', !isOpen)}
      />
    </div>
  );
}

// Full-height version of ChatFeed for dedicated tab
function ChatFeedFull() {
  return (
    <div className="h-full">
      <ChatFeed fullHeight />
    </div>
  );
}
