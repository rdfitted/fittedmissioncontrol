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
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/format-timestamp';
import ReactMarkdown from 'react-markdown';

// ============ Types ============

export interface EmailDraft {
  id: string;
  status: 'pending' | 'approved' | 'sent' | 'rejected';
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
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

// ============ Pending Draft Card ============

function PendingDraftCard({ 
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
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <Mail className="w-3 h-3 mr-1" />
              Pending
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
            Approve
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

// ============ Approved Draft Card ============

function ApprovedDraftCard({ 
  draft, 
  onSend,
  onClick,
}: { 
  draft: EmailDraft;
  onSend: (id: string) => void;
  onClick: (draft: EmailDraft) => void;
}) {
  const timestamp = formatTimestamp(draft.updatedAt);

  return (
    <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-950/20 hover:border-blue-500/50 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Approved
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
      <div className="mb-3 pl-4 border-l-2 border-blue-500/30">
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

      {/* Gmail Draft ID */}
      {draft.gmailDraftId && (
        <div className="mb-3 flex items-center gap-2 text-xs text-blue-400/70">
          <Mail className="w-3 h-3" />
          <span className="font-mono text-[10px]">Draft: {draft.gmailDraftId.substring(0, 12)}...</span>
          <a 
            href={`https://mail.google.com/mail/u/0/#drafts`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-blue-400 transition-colors"
          >
            View in Gmail
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Send Action */}
      <Button
        size="sm"
        onClick={() => onSend(draft.id)}
        className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-semibold"
      >
        <Send className="w-4 h-4 mr-1.5" />
        Send Now
      </Button>
    </div>
  );
}

// ============ Sent Draft Card ============

function SentDraftCard({ 
  draft,
  onClick,
}: { 
  draft: EmailDraft;
  onClick: (draft: EmailDraft) => void;
}) {
  const timestamp = formatTimestamp(draft.sentAt || draft.updatedAt);

  return (
    <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-900/30 hover:border-zinc-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Check className="w-3 h-3 mr-1" />
              Sent
            </Badge>
            <span 
              className="text-xs text-zinc-500 cursor-help"
              title={timestamp.tooltip}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              {timestamp.display}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-300">
            To: {draft.recipient.name}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{draft.recipient.email}</p>
        </div>
      </div>

      {/* Subject */}
      <div className="mb-3 pl-4 border-l-2 border-zinc-700">
        <p className="text-xs text-zinc-600 mb-0.5">Subject:</p>
        <p className="text-sm text-zinc-400 font-medium">{draft.subject}</p>
      </div>

      {/* Preview */}
      <div 
        onClick={() => onClick(draft)}
        className="p-3 bg-zinc-900/30 rounded text-xs text-zinc-500 max-h-20 overflow-hidden cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        <div className="line-clamp-3">{draft.draftBody}</div>
      </div>
    </div>
  );
}

// ============ Rejected Draft Card ============

function RejectedDraftCard({ 
  draft,
  onClick,
}: { 
  draft: EmailDraft;
  onClick: (draft: EmailDraft) => void;
}) {
  const timestamp = formatTimestamp(draft.updatedAt);

  return (
    <div className="p-4 rounded-lg border border-red-500/20 bg-red-950/10 hover:border-red-500/30 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
              <X className="w-3 h-3 mr-1" />
              Rejected
            </Badge>
            <span 
              className="text-xs text-zinc-500 cursor-help"
              title={timestamp.tooltip}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              {timestamp.display}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-400">
            To: {draft.recipient.name}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{draft.recipient.email}</p>
        </div>
      </div>

      {/* Subject */}
      <div className="mb-3 pl-4 border-l-2 border-red-500/20">
        <p className="text-xs text-zinc-600 mb-0.5">Subject:</p>
        <p className="text-sm text-zinc-400 font-medium">{draft.subject}</p>
      </div>

      {/* Rejection Reason */}
      {draft.rejectedReason && (
        <div className="mb-3 p-2 bg-red-950/20 rounded border border-red-500/20">
          <p className="text-[10px] text-red-400/70 mb-0.5 font-semibold">Reason:</p>
          <p className="text-xs text-red-300/60 italic">{draft.rejectedReason}</p>
        </div>
      )}

      {/* Preview */}
      <div 
        onClick={() => onClick(draft)}
        className="p-3 bg-zinc-900/30 rounded text-xs text-zinc-500 max-h-16 overflow-hidden cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        <div className="line-clamp-2">{draft.draftBody}</div>
      </div>
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

// ============ Draft Preview Modal ============

function DraftPreviewModal({
  draft,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onSend,
}: {
  draft: EmailDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onSend?: (id: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState('');

  if (!draft) return null;

  const timestamp = formatTimestamp(draft.createdAt);

  const getBadgeClass = () => {
    switch (draft.status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'approved': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'sent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const getBadgeLabel = () => {
    switch (draft.status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'sent': return 'Sent';
      case 'rejected': return 'Rejected';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={getBadgeClass()}>
              {getBadgeLabel()}
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

          {/* Gmail Draft ID for approved drafts */}
          {draft.status === 'approved' && draft.gmailDraftId && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Gmail Draft:</p>
              <div className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded">
                <code className="text-xs text-blue-400">{draft.gmailDraftId}</code>
                <a 
                  href={`https://mail.google.com/mail/u/0/#drafts`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  View in Gmail
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {draft.status === 'rejected' && draft.rejectedReason && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-300/70 italic p-2 bg-red-950/20 rounded border border-red-500/20">
                {draft.rejectedReason}
              </p>
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
          {draft.status === 'pending' && onApprove && onReject && (
            <>
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
                Approve
              </Button>
            </>
          )}
          {draft.status === 'approved' && onSend && (
            <Button
              onClick={() => {
                onSend(draft.id);
                onOpenChange(false);
              }}
              className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send Now
            </Button>
          )}
          {(draft.status === 'sent' || draft.status === 'rejected') && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full bg-zinc-800 border-zinc-700 text-zinc-300"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Email Tab ============

export function EmailTab() {
  const [pendingDrafts, setPendingDrafts] = useState<EmailDraft[]>([]);
  const [approvedDrafts, setApprovedDrafts] = useState<EmailDraft[]>([]);
  const [sentDrafts, setSentDrafts] = useState<EmailDraft[]>([]);
  const [rejectedDrafts, setRejectedDrafts] = useState<EmailDraft[]>([]);
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setApprovedDrafts(draftsData.approved || []);
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
        const data = await res.json();
        // Optimistic update
        const draft = pendingDrafts.find(d => d.id === id);
        if (draft) {
          setPendingDrafts(prev => prev.filter(d => d.id !== id));
          setApprovedDrafts(prev => [...prev, { 
            ...draft, 
            status: 'approved', 
            updatedAt: new Date().toISOString(),
            gmailDraftId: data.gmailDraftId || draft.gmailDraftId,
          }]);
        }
      } else {
        console.error('Failed to approve draft');
      }
    } catch (err) {
      console.error('Error approving draft:', err);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await fetch(`/api/emails/drafts/${id}/send`, {
        method: 'POST',
      });

      if (res.ok) {
        // Optimistic update
        const draft = approvedDrafts.find(d => d.id === id);
        if (draft) {
          setApprovedDrafts(prev => prev.filter(d => d.id !== id));
          setSentDrafts(prev => [...prev, { 
            ...draft, 
            status: 'sent', 
            updatedAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
          }]);
        }
      } else {
        console.error('Failed to send draft');
      }
    } catch (err) {
      console.error('Error sending draft:', err);
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
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {pendingDrafts.length} pending
                </Badge>
              )}
              {approvedDrafts.length > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {approvedDrafts.length} approved
                </Badge>
              )}
              {unreadCount > 0 && (
                <Badge className="bg-zinc-700 text-zinc-300 border-zinc-600">
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

        {/* Content Grid - 2x2 layout */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4 min-h-0">
          {/* Top Left: Pending Drafts */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                Pending
                {pendingDrafts.length > 0 && (
                  <Badge variant="outline" className="ml-auto bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
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
                      <PendingDraftCard
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

          {/* Top Right: Approved Drafts */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                Approved
                {approvedDrafts.length > 0 && (
                  <Badge variant="outline" className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {approvedDrafts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {loading && approvedDrafts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : approvedDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No approved drafts</p>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3 pb-4">
                    {approvedDrafts.map(draft => (
                      <ApprovedDraftCard
                        key={draft.id}
                        draft={draft}
                        onSend={handleSend}
                        onClick={handleDraftClick}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Bottom Left: Sent Drafts */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Sent
                {sentDrafts.length > 0 && (
                  <Badge variant="outline" className="ml-auto bg-zinc-800 text-zinc-400 border-zinc-700">
                    {sentDrafts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {loading && sentDrafts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : sentDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <Send className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No sent drafts</p>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3 pb-4">
                    {sentDrafts.map(draft => (
                      <SentDraftCard
                        key={draft.id}
                        draft={draft}
                        onClick={handleDraftClick}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Bottom Right: Rejected Drafts */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col min-h-0">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <X className="w-4 h-4 text-red-400" />
                Rejected
                {rejectedDrafts.length > 0 && (
                  <Badge variant="outline" className="ml-auto bg-zinc-800 text-zinc-400 border-zinc-700">
                    {rejectedDrafts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {loading && rejectedDrafts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : rejectedDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                  <X className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No rejected drafts</p>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3 pb-4">
                    {rejectedDrafts.map(draft => (
                      <RejectedDraftCard
                        key={draft.id}
                        draft={draft}
                        onClick={handleDraftClick}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inbox Section - Full width below the grid */}
        <Card className="bg-zinc-950 border-zinc-800 flex flex-col max-h-64">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-zinc-400" />
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
                <div className="grid grid-cols-2 gap-2 pb-4">
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

      {/* Draft Preview Modal */}
      <DraftPreviewModal
        draft={selectedDraft}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setTimeout(() => setSelectedDraft(null), 150);
        }}
        onApprove={selectedDraft?.status === 'pending' ? handleApprove : undefined}
        onReject={selectedDraft?.status === 'pending' ? handleReject : undefined}
        onSend={selectedDraft?.status === 'approved' ? handleSend : undefined}
      />
    </>
  );
}
