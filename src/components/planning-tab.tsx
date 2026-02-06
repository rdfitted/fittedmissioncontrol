'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePlanningSessions, usePlanningSession } from '@/hooks/use-planning';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

export function PlanningTab() {
  const { sessions, loading: sessionsLoading } = usePlanningSessions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { session, navigation, loading: sessionLoading } = usePlanningSession(selectedDate);

  // Auto-select the most recent session when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !selectedDate) {
      setSelectedDate(sessions[0].date);
    }
  }, [sessions, selectedDate]);

  if (sessionsLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading planning sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
        <Calendar className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No planning sessions yet</p>
        <p className="text-sm mt-1">Sessions will appear here after the first Friday planning meeting</p>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4">
      {/* Session List Sidebar */}
      <div className="w-56 shrink-0 border-r border-zinc-800 pr-4">
        <div className="flex items-center gap-2 mb-4 text-zinc-400">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">Sessions</span>
        </div>
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="space-y-1">
            {sessions.map((s) => (
              <button
                key={s.date}
                onClick={() => setSelectedDate(s.date)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg transition-colors',
                  'hover:bg-zinc-800/50',
                  selectedDate === s.date 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-400'
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {formatShortDate(s.date)}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {s.date}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={!navigation.prev}
            onClick={() => navigation.prev && setSelectedDate(navigation.prev)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="text-center">
            {selectedDate && (
              <h2 className="text-lg font-semibold text-zinc-100">
                {formatDate(selectedDate)}
              </h2>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            disabled={!navigation.next}
            onClick={() => navigation.next && setSelectedDate(navigation.next)}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Session Content */}
        <ScrollArea className="flex-1">
          {sessionLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading session...
            </div>
          ) : session ? (
            <article className="prose prose-invert prose-zinc max-w-none pr-4">
              <ReactMarkdown
                components={{
                  // Custom heading styles
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-zinc-200 mt-8 mb-3">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium text-zinc-300 mt-6 mb-2">
                      {children}
                    </h3>
                  ),
                  // Style tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-zinc-800 px-4 py-2 text-left text-sm font-medium text-zinc-300 border-b border-zinc-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-zinc-400 border-b border-zinc-800">
                      {children}
                    </td>
                  ),
                  // Style lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 my-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 text-zinc-400 my-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-zinc-400">{children}</li>
                  ),
                  // Style checkboxes in task lists
                  input: (props) => (
                    <input
                      {...props}
                      disabled
                      className="mr-2 accent-emerald-500"
                    />
                  ),
                  // Style code blocks
                  code: ({ className, children }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-400 text-sm">
                        {children}
                      </code>
                    ) : (
                      <code className={cn('block bg-zinc-900 p-4 rounded-lg overflow-x-auto', className)}>
                        {children}
                      </code>
                    );
                  },
                  // Style blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-500/50 pl-4 italic text-zinc-400 my-4">
                      {children}
                    </blockquote>
                  ),
                  // Style paragraphs
                  p: ({ children }) => (
                    <p className="text-zinc-400 my-2 leading-relaxed">
                      {children}
                    </p>
                  ),
                  // Style links
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      className="text-emerald-400 hover:text-emerald-300 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  // Style horizontal rules
                  hr: () => (
                    <hr className="border-zinc-800 my-6" />
                  ),
                  // Style strong/bold
                  strong: ({ children }) => (
                    <strong className="font-semibold text-zinc-200">{children}</strong>
                  ),
                }}
              >
                {session.content}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              Select a session to view
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
