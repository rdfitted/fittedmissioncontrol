import { AgentPanel } from '@/components/agent-panel';
import { TaskBoard } from '@/components/task-board';
import { TodoDrawer } from '@/components/todo-drawer';
import { ChatFeed } from '@/components/chat-feed';
import { ActivityFeed } from '@/components/activity-feed';

export default function Dashboard() {
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

      {/* Main Content - with right padding for todo drawer */}
      <main className="p-6 pr-[320px]">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Agents */}
          <div className="xl:col-span-1">
            <AgentPanel />
          </div>

          {/* Center/Right - Tasks & Activity */}
          <div className="xl:col-span-3 space-y-6">
            {/* New Task Board with horizontal scroll */}
            <TaskBoard />

            {/* Bottom Row - Chat & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChatFeed />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>

      {/* Todo Drawer - Fixed right panel */}
      <TodoDrawer defaultOpen={true} />

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-600 pr-[320px]">
        Mission Control v1.0 • Auto-refreshing every 5-15s
      </footer>
    </div>
  );
}
