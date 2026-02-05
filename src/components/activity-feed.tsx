'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
  type: 'file_change' | 'task_update' | 'chat_message';
  description: string;
  timestamp: string;
  file: string;
}

const typeIcons: Record<ActivityItem['type'], { icon: string; color: string }> = {
  file_change: { icon: '📄', color: 'text-zinc-400' },
  task_update: { icon: '✓', color: 'text-blue-400' },
  chat_message: { icon: '💬', color: 'text-green-400' },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const { icon, color } = typeIcons[activity.type];
  
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900/50 transition-colors">
      <span className={`text-lg ${color}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300">{activity.description}</p>
        <p className="text-xs text-zinc-600 truncate">{activity.file}</p>
      </div>
      <span className="text-xs text-zinc-600 shrink-0">{formatTimeAgo(activity.timestamp)}</span>
    </div>
  );
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-zinc-950 border-zinc-800 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-zinc-100">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-600">
              No recent activity
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((activity, idx) => (
                <ActivityRow key={idx} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
