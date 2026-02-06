'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  FileText,
  MessageCircle,
  Search,
  Mail,
  Filter,
  Eye,
  Check,
  X,
  User,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/format-timestamp';

// Content types (matches API)
export type ContentType = 'blog' | 'social' | 'research' | 'outreach' | 'content';
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  author: string;
  date: string;
  status: ContentStatus;
  preview: string;
  content?: string;  // Full content loaded on demand
  filePath: string;
}

// Type icons and colors
const typeConfig: Record<ContentType, { icon: typeof FileText; label: string; color: string }> = {
  blog: { icon: FileText, label: 'Blog', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  social: { icon: MessageCircle, label: 'Social', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  research: { icon: Search, label: 'Research', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  outreach: { icon: Mail, label: 'Outreach', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  content: { icon: FileText, label: 'Content', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

// Status colors
const statusConfig: Record<ContentStatus, { label: string; color: string; dot: string }> = {
  draft: { label: 'Draft', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500' },
  review: { label: 'In Review', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-500' },
  published: { label: 'Published', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-500' },
};

// Content Card Component
function ContentCard({ 
  item, 
  onClick 
}: { 
  item: ContentItem; 
  onClick: (item: ContentItem) => void;
}) {
  const TypeIcon = typeConfig[item.type].icon;
  const timestamp = formatTimestamp(item.date);
  
  return (
    <div
      onClick={() => onClick(item)}
      className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1.5 ${typeConfig[item.type].color}`}>
            <TypeIcon className="w-3 h-3" />
            {typeConfig[item.type].label}
          </Badge>
          <Badge variant="outline" className={statusConfig[item.status].color}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[item.status].dot} mr-1.5`} />
            {statusConfig[item.status].label}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-medium text-zinc-200 mb-2 line-clamp-2">
        {item.title}
      </h3>

      {/* Preview */}
      <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
        {item.preview}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {item.author}
          </span>
          <span 
            className="flex items-center gap-1 cursor-help"
            title={timestamp.tooltip}
          >
            <Calendar className="w-3 h-3" />
            {timestamp.display}
          </span>
        </div>
        <Eye className="w-4 h-4 text-zinc-600" />
      </div>
    </div>
  );
}

// Filter Dropdown Component
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
      >
        <Filter className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-zinc-400">{label}:</span>
        <span className="text-zinc-200">{selectedOption?.label || 'All'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-md shadow-xl min-w-[120px]">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors first:rounded-t-md last:rounded-b-md ${
                  value === option.value ? 'text-emerald-400 bg-zinc-800/50' : 'text-zinc-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Content Preview Modal
function ContentPreviewModal({
  item,
  open,
  onOpenChange,
  onStatusChange,
}: {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
}) {
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch full content when modal opens
  useEffect(() => {
    if (open && item && !item.content) {
      setLoadingContent(true);
      fetch(`/api/content/${item.id}`)
        .then(res => res.json())
        .then(data => {
          setFullContent(data.content || null);
        })
        .catch(err => {
          console.error('Error fetching content:', err);
          setFullContent(null);
        })
        .finally(() => setLoadingContent(false));
    } else if (item?.content) {
      setFullContent(item.content);
    }
  }, [open, item]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setFullContent(null);
    }
  }, [open]);

  if (!item) return null;

  const TypeIcon = typeConfig[item.type].icon;
  const timestamp = formatTimestamp(item.date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`gap-1.5 ${typeConfig[item.type].color}`}>
              <TypeIcon className="w-3 h-3" />
              {typeConfig[item.type].label}
            </Badge>
            <Badge variant="outline" className={statusConfig[item.status].color}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[item.status].dot} mr-1.5`} />
              {statusConfig[item.status].label}
            </Badge>
          </div>
          <DialogTitle className="text-xl text-zinc-100">
            {item.title}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {item.author}
            </span>
            <span 
              className="flex items-center gap-1 cursor-help"
              title={timestamp.tooltip}
            >
              <Calendar className="w-3.5 h-3.5" />
              {timestamp.display}
            </span>
            <span className="text-zinc-600 text-xs font-mono">
              {item.filePath}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 my-4 pr-4">
          {loadingContent ? (
            <div className="flex items-center justify-center h-32 text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading content...
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none overflow-hidden">
              <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed break-words overflow-x-hidden">
                {fullContent || item.preview}
              </pre>
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <DialogFooter className="shrink-0 border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-3 w-full justify-between">
            <span className="text-xs text-zinc-500">
              Review actions:
            </span>
            <div className="flex items-center gap-2">
              {item.status === 'draft' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(item.id, 'review')}
                  className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                >
                  Submit for Review
                </Button>
              )}
              {item.status === 'review' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(item.id, 'draft')}
                    className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(item.id, 'approved')}
                    className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </>
              )}
              {item.status === 'approved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(item.id, 'published')}
                  className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                >
                  Mark Published
                </Button>
              )}
              {item.status === 'published' && (
                <span className="text-xs text-purple-400">
                  ✓ Content is live
                </span>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Status Legend
function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      {Object.entries(statusConfig).map(([status, config]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="text-zinc-500">{config.label}</span>
        </div>
      ))}
    </div>
  );
}

// Main Content Tab Component
export function ContentTab() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/content');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setContent(data.content || []);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch content');
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
    const interval = setInterval(fetchContent, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter content
  const filteredContent = useMemo(() => {
    let filtered = content;
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    return filtered;
  }, [content, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: content.length,
      draft: content.filter(c => c.status === 'draft').length,
      review: content.filter(c => c.status === 'review').length,
      approved: content.filter(c => c.status === 'approved').length,
      published: content.filter(c => c.status === 'published').length,
    };
  }, [content]);

  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setTimeout(() => setSelectedItem(null), 150);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ContentStatus) => {
    try {
      const res = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      if (res.ok) {
        // Optimistic update
        setContent(prev => prev.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
        ));
        if (selectedItem?.id === id) {
          setSelectedItem({ ...selectedItem, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'blog', label: 'Blog' },
    { value: 'social', label: 'Social' },
    { value: 'research', label: 'Research' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'content', label: 'Other Content' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'published', label: 'Published' },
  ];

  if (error) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 h-full">
        <CardContent className="flex items-center justify-center h-full text-red-400">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-semibold text-zinc-100">Content Review</CardTitle>
              <StatusLegend />
            </div>
            <div className="flex items-center gap-3">
              {/* Stats badges */}
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                  {stats.draft} drafts
                </span>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {stats.review} reviewing
                </span>
              </div>
              <button
                onClick={fetchContent}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3 mt-3">
            <FilterDropdown
              label="Type"
              value={typeFilter}
              options={typeOptions}
              onChange={setTypeFilter}
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
            />
            <span className="text-xs text-zinc-500 ml-auto">
              {filteredContent.length} items
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {loading && content.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading content...
              </div>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No content found</p>
              <p className="text-xs text-zinc-700 mt-1">
                Content will appear here once agents create drafts
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="grid gap-3 pb-4">
                {filteredContent.map(item => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onClick={handleItemClick}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <ContentPreviewModal
        item={selectedItem}
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
