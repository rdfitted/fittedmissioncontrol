'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  Mail,
  Send,
  X,
  Check,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/format-timestamp';
import ReactMarkdown from 'react-markdown';

// ============ Types ============

export interface EmailDraft {
  id: string;
  status: 'pending' | 'sent' | 'rejected';
  createdAt: string;
  updatedAt: string;
  query: string;
  recipient: {
    name: string;
    email: string;
    client?: string;
  };
  subject: string;
  originalThread?: string;
  contextUsed?: string[];
  draftBody: string;
  gmailDraftId?: string | null;
  rejectedReason?: string | null;
}

export interface InboxEmail {
  id: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  labels: string[];
}

// ============ Draft Card ============

function DraftCard({ 
  draft, 
  onApprove, 
  onReject,
  onClick,
}: { 
  draft: EmailDraft;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onClick: (draft: EmailDraft) => void;
}) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const timestamp = formatTimestamp(draft.createdAt);

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setShowRejectInput(true);
      return;
    }
    onReject(draft.id, rejectReason);
    setRejectReason('');
    setShowRejectInput(false);
  };

  return (
    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Mail className="w-3 h-3 mr-1" />
              Pending Approval
            </Badge>
            <span 
              className="text-xs text-zinc-500 cursor-help"
              title={timestamp.tooltip}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              {timestamp.display}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            To: {draft.recipient.name}
          </h3>
          <p className="text-xs text-zinc-400 truncate">{draft.recipient.email}</p>
        </div>
      </div>

      {/* Subject */}
      <div className="mb-3 pl-4 border-l-2 border-emerald-500/30">
        <p className="text-xs text-zinc-500 mb-0.5">Subject:</p>
        <p className="text-sm text-zinc-300 font-medium">{draft.subject}</p>
      </div>

      {/* Preview */}
      <div 
        onClick={() => onClick(draft)}
        className="mb-3 p-3 bg-zinc-900/50 rounded text-xs text-zinc-400 max-h-24 overflow-hidden cursor-pointer hover:bg-zinc-900/70 transition-colors"
      >
        <div className="line-clamp-4">{draft.draftBody}</div>
      </div>

      {/* Context badges */}
      {draft.contextUsed && draft.contextUsed.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {draft.contextUsed.slice(0, 3).map((ctx, i) => (
            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
              {ctx}
            </span>
          ))}
          {draft.contextUsed.length > 3 && (
            <span className="text-[10px] text-zinc-600">+{draft.contextUsed.length - 3}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {showRejectInput ? (
        <div className="flex gap-2">
          <input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReject()}
            placeholder="Rejection reason..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300"
            autoFocus
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
            className="bg-zinc-800 border-zinc-700 text-zinc-400"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onApprove(draft.id)}
            className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Approve & Create Draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectInput(true)}
            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============ Inbox Email Card ============

function InboxEmailCard({
  email,
  onDraftReply,
}: {
  email: InboxEmail;
  onDraftReply: (email: InboxEmail) => void;
}) {
  const timestamp = formatTimestamp(email.date);

  return (
    <div className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:border-zinc-600 ${
      email.unread 
        ? 'border-blue-500/30 bg-blue-950/10' 
        : 'border-zinc-800 bg-zinc-900/50'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm truncate ${email.unread ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>
              {email.from.name}
            </h4>
            {email.unread && (
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">{email.from.email}</p>
        </div>
        <span 
          className="text-[10px] text-zinc-500 shrink-0 cursor-help"
          title={timestamp.tooltip}
        >
          {timestamp.display}
        </span>
      </div>

      <p className={`text-sm mb-2 truncate ${email.unread ? 'font-medium text-zinc-200' : 'text-zinc-400'}`}>
        {email.subject}
      </p>

      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
        {email.snippet}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {email.labels.slice(0, 2).map((label, i) => (
            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
              {label}
            </span>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onDraftReply(email); }}
          className="h-6 text-xs bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
        >
          <Send className="w-3 h-3 mr-1" />
          Draft Reply
        </Button>
      </div>
    </div>
  );
}

// ============ History Item ============

function HistoryItem({ draft }: { draft: EmailDraft }) {
  const timestamp = formatTimestamp(draft.updatedAt);
  const isSent = draft.status === 'sent';

  return (
    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={
            isSent 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }>
            {isSent ? (
              <><Check className="w-3 h-3 mr-1" />Sent</>
            ) : (
              <><X className="w-3 h-3 mr-1" />Rejected</>
            )}
          </Badge>
          <span className="text-zinc-500">{draft.recipient.name}</span>
        </div>
        <span className="text-zinc-600" title={timestamp.tooltip}>
          {timestamp.display}
        </span>
      </div>
      <p className="text-zinc-400 truncate mb-1">{draft.subject}</p>
      {draft.rejectedReason && (
        <p className="text-red-400/70 text-[10px] italic mt-1">
          Reason: {draft.rejectedReason}
        </p>
      )}
    </div>
  );
}

// ============ Draft Preview Modal ============

function DraftPreviewModal({
  draft,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: {
  draft: EmailDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState('');

  if (!draft) return null;

  const timestamp = formatTimestamp(draft.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Pending Draft
            </Badge>
            <span className="text-xs text-zinc-500" title={timestamp.tooltip}>
              {timestamp.display}
            </span>
          </div>
          <DialogTitle className="text-xl text-zinc-100">
            Email Draft for {draft.recipient.name}
          </DialogTitle>
          <div className="text-sm text-zinc-400 mt-1">
            {draft.recipient.email}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject */}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Subject:</p>
            <p className="text-sm font-medium text-zinc-200 p-2 bg-zinc-900/50 rounded">
              {draft.subject}
            </p>
          </div>

          {/* Body */}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Message:</p>
            <ScrollArea className="h-64 p-3 bg-zinc-900/50 rounded border border-zinc-800">
              <div className="prose prose-invert prose-sm max-w-none
                prose-p:text-zinc-300 prose-p:leading-relaxed
                prose-strong:text-zinc-200
              ">
                <ReactMarkdown>{draft.draftBody}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>

          {/* Context */}
          {draft.contextUsed && draft.contextUsed.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Context Used:</p>
              <div className="flex gap-1.5 flex-wrap">
                {draft.contextUsed.map((ctx, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                    {ctx}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Original Thread Preview */}
          {draft.originalThread && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Original Thread (context):</p>
              <ScrollArea className="h-32 p-2 bg-zinc-900/30 rounded text-xs text-zinc-500">
                {draft.originalThread}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex-1">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (optional)..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onReject(draft.id, rejectReason || 'No reason provided');
              setRejectReason('');
              onOpenChange(false);
            }}
            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          >
            <X className="w-4 h-4 mr-1.5" />
            Reject
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onApprove(draft.id);
              onOpenChange(false);
            }}
            className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Approve & Create Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Email Tab ============

export function EmailTab() {
  const [pendingDrafts, setPendingDrafts] = useState<EmailDraft[]>([]);
  const [sentDrafts, setSentDrafts] = useState<EmailDraft[]>([]);
  const [rejectedDrafts, setRejectedDrafts] = useState<EmailDraft[]>([]);
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch drafts and inbox in parallel
      const [draftsRes, inboxRes] = await Promise.all([
        fetch('/api/emails/drafts'),
        fetch('/api/emails/inbox'),
      ]);

      const draftsData = await draftsRes.json();
      const inboxData = await inboxRes.json();

      if (draftsData.error) {
        setError(draftsData.error);
      } else {
        setPendingDrafts(draftsData.pending || []);
        setSentDrafts(draftsData.sent || []);
        setRejectedDrafts(draftsData.rejected || []);
        setError(null);
      }

      if (!inboxData.error) {
        setInbox(inboxData.emails || []);
      }
    } catch (err) {
      setError('Failed to fetch email data');
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/emails/drafts/${id}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        // Optimistic update
        const draft = pendingDrafts.find(d => d.id === id);
        if (draft) {
          setPendingDrafts(prev => prev.filter(d => d.id !== id));
          setSentDrafts(prev => [...prev, { ...draft, status: 'sent', updatedAt: new Date().toISOString() }]);
        }
      } else {
        console.error('Failed to approve draft');
      }
    } catch (err) {
      console.error('Error approving draft:', err);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/emails/drafts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        // Optimistic update
        const draft = pendingDrafts.find(d => d.id === id);
        if (draft) {
          setPendingDrafts(prev => prev.filter(d => d.id !== id));
          setRejectedDrafts(prev => [...prev, { 
            ...draft, 
            status: 'rejected', 
            rejectedReason: reason,
            updatedAt: new Date().toISOString() 
          }]);
        }
      } else {
        console.error('Failed to reject draft');
      }
    } catch (err) {
      console.error('Error rejecting draft:', err);
    }
  };

  const handleDraftReply = async (email: InboxEmail) => {
    try {
      const query = `reply to ${email.from.name}`;
      const res = await fetch('/api/emails/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        // Refresh to show new draft
        fetchData();
      } else {
        console.error('Failed to create draft');
      }
    } catch (err) {
      console.error('Error creating draft:', err);
    }
  };

  const handleDraftClick = (draft: EmailDraft) => {
    setSelectedDraft(draft);
    setModalOpen(true);
  };

  const unreadCount = useMemo(() => inbox.filter(e => e.unread).length, [inbox]);
  const historyItems = useMemo(() => 
    [...sentDrafts, ...rejectedDrafts].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    [sentDrafts, rejectedDrafts]
  );

  if (error) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 h-full">
        <CardContent className="flex items-center justify-center h-full text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-100">Email Workflow</h2>
            <div className="flex items-center gap-2">
              {pendingDrafts.length > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {pendingDrafts.length} pending
                </Badge>
              )}
              {unreadCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Left Column: Pending Drafts + Inbox */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Pending Drafts */}
            <Card className="bg-zinc-950 border-zinc-800 flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Pending Drafts
                  {pendingDrafts.length > 0 && (
                    <Badge variant="outline" className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {pendingDrafts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {loading && pendingDrafts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : pendingDrafts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <Mail className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No pending drafts</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3 pb-4">
                      {pendingDrafts.map(draft => (
                        <DraftCard
                          key={draft.id}
                          draft={draft}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onClick={handleDraftClick}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Recent Inbox */}
            <Card className="bg-zinc-950 border-zinc-800 flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-blue-400" />
                  Recent Inbox
                  {unreadCount > 0 && (
                    <Badge variant="outline" className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {unreadCount} unread
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                {loading && inbox.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <Inbox className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">No recent emails</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-2 pb-4">
                      {inbox.map(email => (
                        <InboxEmailCard
                          key={email.id}
                          email={email}
                          onDraftReply={handleDraftReply}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Draft History */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  Draft History
                  {historyItems.length > 0 && (
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                      {historyItems.length}
                    </Badge>
                  )}
                </CardTitle>
                {historyItems.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showHistory ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {!showHistory ? (
                <div className="flex items-center justify-center h-full text-zinc-600">
                  <p className="text-sm">Click to expand history</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <Clock className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No history yet</p>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-2 pb-4">
                    {historyItems.map(draft => (
                      <HistoryItem key={draft.id} draft={draft} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Draft Preview Modal */}
      <DraftPreviewModal
        draft={selectedDraft}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setTimeout(() => setSelectedDraft(null), 150);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}
