'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown } from 'lucide-react';
import { formatTimestamp } from '@/lib/format-timestamp';

interface ChatMessage {
  id: string;
  agent: string;
  message: string;
  timestamp: string; // ISO 8601
  date?: string;
}

// Agent name → color mapping (use actual names, not titles)
const agentColors: Record<string, string> = {
  'Hex': 'text-emerald-400',
  'Knox': 'text-blue-400',
  'Aria': 'text-cyan-400',
  'Vault': 'text-indigo-400',
  'Scout': 'text-lime-400',
  'Sterling': 'text-purple-400',
  'Pulse': 'text-pink-400',
  'Reach': 'text-orange-400',
  'Iris': 'text-amber-400',
  'Recon': 'text-violet-400',
  'Slate': 'text-teal-400',
  'Rigor': 'text-red-400',
  // Legacy fallbacks (titles) for older messages
  'Hex Prime': 'text-emerald-400',
  'Architect': 'text-blue-400',
  'Frontend': 'text-cyan-400',
  'Backend': 'text-indigo-400',
  'Social': 'text-pink-400',
  'Outreach': 'text-orange-400',
  'Inbound': 'text-amber-400',
  'Research': 'text-violet-400',
};

const agentBgColors: Record<string, string> = {
  'Hex': 'bg-emerald-500/20',
  'Knox': 'bg-blue-500/20',
  'Aria': 'bg-cyan-500/20',
  'Vault': 'bg-indigo-500/20',
  'Scout': 'bg-lime-500/20',
  'Sterling': 'bg-purple-500/20',
  'Pulse': 'bg-pink-500/20',
  'Reach': 'bg-orange-500/20',
  'Iris': 'bg-amber-500/20',
  'Recon': 'bg-violet-500/20',
  'Slate': 'bg-teal-500/20',
  'Rigor': 'bg-red-500/20',
  // Legacy fallbacks (titles) for older messages
  'Hex Prime': 'bg-emerald-500/20',
  'Architect': 'bg-blue-500/20',
  'Frontend': 'bg-cyan-500/20',
  'Backend': 'bg-indigo-500/20',
  'Social': 'bg-pink-500/20',
  'Outreach': 'bg-orange-500/20',
  'Inbound': 'bg-amber-500/20',
  'Research': 'bg-violet-500/20',
};

function ChatBubble({ message }: { message: ChatMessage }) {
  const agentColor = agentColors[message.agent] || 'text-zinc-400';
  const agentBg = agentBgColors[message.agent] || 'bg-zinc-800';
  const timestamp = formatTimestamp(message.timestamp);
  
  return (
    <div className="group flex gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-900/50 transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2">
      <div className={`w-8 h-8 rounded-full ${agentBg} flex items-center justify-center text-sm font-semibold shrink-0 transition-transform duration-200 group-hover:scale-105`}>
        <span className={agentColor}>{message.agent[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-sm ${agentColor} transition-colors`}>{message.agent}</span>
          <span 
            className="text-xs text-zinc-500 opacity-70 group-hover:opacity-100 transition-opacity cursor-help"
            title={timestamp.tooltip}
          >
            {timestamp.display}
          </span>
        </div>
        <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
      </div>
    </div>
  );
}

function NewMessagesPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs text-zinc-200 shadow-lg transition-all duration-200 hover:scale-105 animate-in fade-in slide-in-from-bottom-4"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      New messages
    </button>
  );
}

interface ChatFeedProps {
  fullHeight?: boolean;
}

export function ChatFeed({ fullHeight = false }: ChatFeedProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  // Check if user is near the bottom of the scroll area
  const checkIfNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const threshold = 100; // pixels from bottom
    const isNear = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = isNear;
    
    // Hide pill if we're at the bottom
    if (isNear) {
      setShowNewMessagesPill(false);
    }
    return isNear;
  }, []);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth'
    });
    setShowNewMessagesPill(false);
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      const newMessages = data.messages || [];
      
      setMessages(prev => {
        // Check if there are actually new messages
        const hasNewMessages = newMessages.length > prev.length;
        
        if (hasNewMessages && !isNearBottomRef.current) {
          // User has scrolled up - show the pill
          setShowNewMessagesPill(true);
        }
        
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      checkIfNearBottom();
    };
    
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [checkIfNearBottom]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Smart auto-scroll: only when user is near bottom
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    
    if (hasNewMessages && isNearBottomRef.current && scrollRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loading]);

  return (
    <Card className={`bg-zinc-950 border-zinc-800 ${fullHeight ? 'h-full flex flex-col' : 'h-full'}`}>
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-zinc-100">Squad Chat</CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`relative ${fullHeight ? 'flex-1 overflow-hidden' : ''}`}>
        <div 
          ref={scrollRef}
          className={`${fullHeight ? 'h-full' : 'h-[300px]'} overflow-y-auto scroll-smooth pr-2`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                Loading chat...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600">
              No messages yet
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
        {showNewMessagesPill && (
          <NewMessagesPill onClick={scrollToBottom} />
        )}
      </CardContent>
    </Card>
  );
}
