'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCrm, Lead, LeadStage, STAGES, CrmFilters, TouchpointType } from '@/hooks/use-crm';
import {
  RefreshCw, Search, ChevronLeft, ChevronRight, Building2, User, Phone,
  Mail, Calendar, Tag, DollarSign, Clock, Plus, X, Filter, Users,
  TrendingUp, AlertTriangle, Zap, GripVertical, ExternalLink, MessageSquare,
} from 'lucide-react';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============ Stage colors ============

const stageColors: Record<LeadStage, { bg: string; border: string; text: string; dot: string }> = {
  new:         { bg: 'bg-zinc-900/50',   border: 'border-b-zinc-500',    text: 'text-zinc-300',    dot: 'bg-zinc-400' },
  researching: { bg: 'bg-blue-950/30',   border: 'border-b-blue-500',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  qualified:   { bg: 'bg-cyan-950/30',   border: 'border-b-cyan-500',    text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  outreach:    { bg: 'bg-violet-950/30', border: 'border-b-violet-500',  text: 'text-violet-300',  dot: 'bg-violet-400' },
  engaged:     { bg: 'bg-yellow-950/30', border: 'border-b-yellow-500',  text: 'text-yellow-300',  dot: 'bg-yellow-400' },
  meeting:     { bg: 'bg-orange-950/30', border: 'border-b-orange-500',  text: 'text-orange-300',  dot: 'bg-orange-400' },
  proposal:    { bg: 'bg-pink-950/30',   border: 'border-b-pink-500',    text: 'text-pink-300',    dot: 'bg-pink-400' },
  won:         { bg: 'bg-emerald-950/30',border: 'border-b-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  lost:        { bg: 'bg-red-950/30',    border: 'border-b-red-500',     text: 'text-red-300',     dot: 'bg-red-400' },
  nurture:     { bg: 'bg-teal-950/30',   border: 'border-b-teal-500',    text: 'text-teal-300',    dot: 'bg-teal-400' },
};

const priorityIndicator: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

// ============ Helpers ============

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function lastTouchDate(lead: Lead): string | null {
  if (!lead.touchpoints.length) return null;
  return lead.touchpoints[lead.touchpoints.length - 1].date;
}

function formatDaysAgo(days: number): string {
  if (days === Infinity) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function formatCurrency(val: number | null): string {
  if (val === null) return '';
  return '$' + val.toLocaleString();
}

// ============ Summary Bar ============

function SummaryBar({ stats }: { stats: ReturnType<typeof useCrm>['stats'] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs">
      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
        <Users className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-300 font-medium">{stats.total}</span>
        <span className="text-zinc-500">total</span>
      </div>
      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-zinc-300 font-medium">{stats.newThisWeek}</span>
        <span className="text-zinc-500">new this week</span>
      </div>
      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span className="text-zinc-300 font-medium">{stats.stale}</span>
        <span className="text-zinc-500">stale</span>
      </div>
      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-zinc-300 font-medium">{stats.conversionRate}%</span>
        <span className="text-zinc-500">won</span>
      </div>
      {/* mini stage counts */}
      <div className="flex items-center gap-2 ml-auto">
        {STAGES.map(s => (
          <div key={s.key} className="flex items-center gap-1" title={s.label}>
            <div className={`w-1.5 h-1.5 rounded-full ${stageColors[s.key].dot}`} />
            <span className="text-zinc-500">{stats.byStage[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Lead Card ============

interface LeadCardContentProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

function LeadCardContent({ lead, onClick, isDragging, isOverlay, selected, onSelect }: LeadCardContentProps) {
  const contact = lead.contacts[0];
  const staleDays = daysSince(lastTouchDate(lead) || lead.createdAt);
  const isStale = staleDays > 7 && !['won', 'lost'].includes(lead.stage);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if ((e.target as HTMLElement).closest('[data-drag-handle]')) return;
        if ((e.target as HTMLElement).closest('input[type=checkbox]')) return;
        onClick?.(lead);
      }}
      className={`
        p-3 rounded-lg border border-zinc-800 bg-zinc-900/70
        hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200
        cursor-pointer relative
        ${isStale ? 'ring-1 ring-red-500/20' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isOverlay ? 'shadow-2xl ring-2 ring-emerald-500/50 rotate-2' : ''}
        ${selected ? 'ring-2 ring-blue-500/50' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-1.5">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(lead.id)}
            className="mt-1 accent-blue-500"
          />
        )}
        <div
          data-drag-handle
          className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 mt-0.5"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{priorityIndicator[lead.priority]}</span>
            <h4 className="text-sm font-semibold text-zinc-200 truncate">{lead.company}</h4>
          </div>
        </div>
        {lead.dealValue !== null && (
          <span className="text-[10px] font-mono text-emerald-400 shrink-0">
            {formatCurrency(lead.dealValue)}
          </span>
        )}
      </div>

      {/* Contact */}
      {contact && (
        <div className="text-xs text-zinc-400 truncate mb-1.5 pl-6">
          {contact.name}{contact.role ? ` · ${contact.role}` : ''}
        </div>
      )}

      {/* Source + Last touch */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-2 pl-6">
        <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{lead.source}</span>
        <span title="Days since last touch" className={isStale ? 'text-red-400' : ''}>
          <Clock className="w-3 h-3 inline mr-0.5" />
          {formatDaysAgo(staleDays)}
        </span>
        {lead.touchpoints.length > 0 && (
          <span className="text-zinc-600">
            {lead.touchpoints[lead.touchpoints.length - 1].type}
          </span>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap pl-6 mb-2">
          {lead.tags.slice(0, 2).map(t => (
            <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-[10px] text-zinc-600">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/50 pl-6">
        {lead.assigned && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <User className="w-3 h-3" />
            <span>{lead.assigned}</span>
          </div>
        )}
        {lead.nextFollowUp && (
          <div className="flex items-center gap-1 text-[10px] text-blue-400" title="Next follow-up">
            <Calendar className="w-3 h-3" />
            <span>{new Date(lead.nextFollowUp).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Sortable Card ============

function SortableLeadCard(props: Omit<LeadCardContentProps, 'isDragging' | 'isOverlay'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.lead.id,
    data: { type: 'lead', lead: props.lead },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCardContent {...props} isDragging={isDragging} />
    </div>
  );
}

// ============ Column ============

interface CrmColumnProps {
  stage: LeadStage;
  label: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  bulkMode: boolean;
}

function CrmColumn({ stage, label, leads, onLeadClick, selectedIds, onSelect, bulkMode }: CrmColumnProps) {
  const colors = stageColors[stage];
  const ids = useMemo(() => leads.map(l => l.id), [leads]);

  return (
    <div className="flex flex-col w-[280px] min-w-[280px] h-full">
      <div className={`flex items-center justify-between p-3 rounded-t-lg ${colors.bg} border-b-2 ${colors.border}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
        </div>
        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">
          {leads.length}
        </span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          data-column={stage}
          className="flex-1 p-2 space-y-2 overflow-y-auto bg-zinc-950/50 rounded-b-lg border border-t-0 border-zinc-800 min-h-[100px]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-zinc-600 border-2 border-dashed border-zinc-800 rounded-lg">
              Drop here
            </div>
          ) : (
            leads.map(lead => (
              <SortableLeadCard
                key={lead.id}
                lead={lead}
                onClick={onLeadClick}
                selected={selectedIds.has(lead.id)}
                onSelect={bulkMode ? onSelect : undefined}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ============ Lead Detail Panel ============

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<Lead>;
  onAddTouchpoint: (leadId: string, tp: { type: TouchpointType; note: string; by: string }) => Promise<Lead>;
}

function LeadDetailPanel({ lead, onClose, onUpdate, onAddTouchpoint }: LeadDetailProps) {
  const [tpType, setTpType] = useState<TouchpointType>('email');
  const [tpNote, setTpNote] = useState('');
  const [tpBy, setTpBy] = useState('Ryan');
  const [notes, setNotes] = useState(lead.notes);
  const [saving, setSaving] = useState(false);
  const staleDays = daysSince(lastTouchDate(lead) || lead.createdAt);

  const handleSaveNotes = async () => {
    if (notes === lead.notes) return;
    setSaving(true);
    await onUpdate(lead.id, { notes });
    setSaving(false);
  };

  const handleAddTouchpoint = async () => {
    if (!tpNote.trim()) return;
    setSaving(true);
    await onAddTouchpoint(lead.id, { type: tpType, note: tpNote, by: tpBy });
    setTpNote('');
    setSaving(false);
  };

  const quickLog = async (type: TouchpointType) => {
    await onAddTouchpoint(lead.id, { type, note: `Quick log: ${type}`, by: 'Ryan' });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{lead.company}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
            <span>{priorityIndicator[lead.priority]} {lead.priority}</span>
            <span>·</span>
            <span className={stageColors[lead.stage].text}>{lead.stage}</span>
            <span>·</span>
            <span>{lead.source}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Company Info */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Company</h3>
          <div className="space-y-1 text-sm">
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener" className="text-blue-400 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{lead.website}
              </a>
            )}
            {lead.industry && <div className="text-zinc-400">Industry: {lead.industry}</div>}
            {lead.size && <div className="text-zinc-400">Size: {lead.size}</div>}
            {lead.dealValue !== null && <div className="text-emerald-400">Deal: {formatCurrency(lead.dealValue)}</div>}
          </div>
        </section>

        {/* Contacts */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Contacts</h3>
          <div className="space-y-2">
            {lead.contacts.map((c, i) => (
              <div key={i} className="bg-zinc-900 rounded-lg p-3 text-sm">
                <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  {c.name}
                  {c.role && <span className="text-zinc-500 font-normal">· {c.role}</span>}
                </div>
                {c.email && (
                  <div className="text-zinc-400 mt-1 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />{c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />{c.phone}
                  </div>
                )}
              </div>
            ))}
            {lead.contacts.length === 0 && (
              <div className="text-xs text-zinc-600">No contacts</div>
            )}
          </div>
        </section>

        {/* Quick Log */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Quick Log</h3>
          <div className="flex gap-1.5 flex-wrap">
            {(['email', 'call', 'linkedin', 'meeting', 'whatsapp'] as TouchpointType[]).map(t => (
              <button
                key={t}
                onClick={() => quickLog(t)}
                className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Add Touchpoint */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Add Touchpoint</h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={tpType}
                onChange={e => setTpType(e.target.value as TouchpointType)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 flex-1"
              >
                {['email','call','linkedin','meeting','whatsapp','social_dm','referral_intro','form','upwork','other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                value={tpBy}
                onChange={e => setTpBy(e.target.value)}
                placeholder="By"
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 w-20"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={tpNote}
                onChange={e => setTpNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTouchpoint()}
                placeholder="Note..."
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 flex-1"
              />
              <button
                onClick={handleAddTouchpoint}
                disabled={!tpNote.trim() || saving}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Touchpoint History */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Touchpoints ({lead.touchpoints.length})
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {[...lead.touchpoints].reverse().map((tp, i) => (
              <div key={i} className="bg-zinc-900 rounded p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">{tp.type}</span>
                  <span className="text-zinc-600">{new Date(tp.date).toLocaleDateString()}</span>
                </div>
                <div className="text-zinc-400 mt-0.5">{tp.note}</div>
                <div className="text-zinc-600 mt-0.5">by {tp.by}</div>
              </div>
            ))}
            {lead.touchpoints.length === 0 && (
              <div className="text-xs text-zinc-600">No touchpoints yet</div>
            )}
          </div>
        </section>

        {/* Stage History */}
        {lead.stageHistory.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Stage History</h3>
            <div className="space-y-1">
              {[...lead.stageHistory].reverse().map((sh, i) => (
                <div key={i} className="text-xs text-zinc-500">
                  <span className={stageColors[sh.from as LeadStage]?.text || 'text-zinc-400'}>{sh.from}</span>
                  {' → '}
                  <span className={stageColors[sh.to as LeadStage]?.text || 'text-zinc-400'}>{sh.to}</span>
                  <span className="text-zinc-600 ml-2">{new Date(sh.at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Notes</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-xs text-zinc-300 resize-none"
            placeholder="Free-text notes..."
          />
        </section>

        {/* Tags */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Tags</h3>
          <div className="flex gap-1.5 flex-wrap">
            {lead.tags.map(t => (
              <span key={t} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded flex items-center gap-1">
                <Tag className="w-3 h-3" />{t}
              </span>
            ))}
            {lead.tags.length === 0 && <span className="text-xs text-zinc-600">No tags</span>}
          </div>
        </section>

        {/* Meta */}
        <section className="text-[10px] text-zinc-600 space-y-0.5 border-t border-zinc-800 pt-3">
          <div>Created: {new Date(lead.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(lead.updatedAt).toLocaleString()}</div>
          <div>Staleness: {formatDaysAgo(staleDays)}</div>
          {lead.podioId && <div>Podio: {lead.podioId}</div>}
        </section>
      </div>
    </div>
  );
}

// ============ Filter Bar ============

function FilterBar({
  filters, setFilters, onBulkModeToggle, bulkMode, selectedCount, onBulkAction
}: {
  filters: CrmFilters;
  setFilters: (f: CrmFilters) => void;
  onBulkModeToggle: () => void;
  bulkMode: boolean;
  selectedCount: number;
  onBulkAction: (action: string, value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search leads..."
          className="bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 w-48 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Stage filter */}
      <select
        value={filters.stage || ''}
        onChange={e => setFilters({ ...filters, stage: (e.target.value || null) as LeadStage | null })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
      >
        <option value="">All stages</option>
        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>

      {/* Priority filter */}
      <select
        value={filters.priority || ''}
        onChange={e => setFilters({ ...filters, priority: (e.target.value || null) as any })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
      >
        <option value="">All priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {/* Assigned filter */}
      <select
        value={filters.assigned || ''}
        onChange={e => setFilters({ ...filters, assigned: e.target.value || null })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
      >
        <option value="">All agents</option>
        {['Iris', 'Reach', 'Sterling', 'Pulse', 'Ryan'].map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Clear filters */}
      {(filters.search || filters.stage || filters.priority || filters.assigned) && (
        <button
          onClick={() => setFilters({ search: '', stage: null, priority: null, source: null, assigned: null, tag: null })}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
        >
          Clear
        </button>
      )}

      <div className="flex-1" />

      {/* Bulk mode */}
      <button
        onClick={onBulkModeToggle}
        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
          bulkMode ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {bulkMode ? `${selectedCount} selected` : 'Bulk'}
      </button>

      {bulkMode && selectedCount > 0 && (
        <>
          <select
            onChange={e => { if (e.target.value) { onBulkAction('stage', e.target.value); e.target.value = ''; } }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
            defaultValue=""
          >
            <option value="" disabled>Move to...</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select
            onChange={e => { if (e.target.value) { onBulkAction('assign', e.target.value); e.target.value = ''; } }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
            defaultValue=""
          >
            <option value="" disabled>Assign to...</option>
            {['Iris', 'Reach', 'Sterling', 'Pulse', 'Ryan'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

// ============ Main CRM Tab ============

export function CrmTab() {
  const {
    leads, loading, error, stats, filters, setFilters,
    refresh, updateLead, addTouchpoint, bulkUpdate, moveToStage,
  } = useCrm();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<LeadStage, Lead[]> = {
      new: [], researching: [], qualified: [], outreach: [],
      engaged: [], meeting: [], proposal: [], won: [], lost: [], nurture: [],
    };
    leads.forEach(l => {
      if (grouped[l.stage]) grouped[l.stage].push(l);
    });
    return grouped;
  }, [leads]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const lead = leads.find(l => l.id === e.active.id);
    setDraggedLead(lead || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggedLead(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = active.id as string;
    // figure out target stage from over
    const overData = over.data.current as any;
    const overLead = leads.find(l => l.id === over.id);
    const targetStage = overLead?.stage || overData?.sortable?.containerId as LeadStage;

    if (targetStage) {
      const currentLead = leads.find(l => l.id === leadId);
      if (currentLead && currentLead.stage !== targetStage) {
        moveToStage(leadId, targetStage);
      }
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(async (action: string, value: string) => {
    const ids = Array.from(selectedIds);
    if (action === 'stage') {
      await bulkUpdate(ids, { stage: value as LeadStage });
    } else if (action === 'assign') {
      await bulkUpdate(ids, { assigned: value });
    }
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate]);

  // Keep selectedLead synced
  const activeLead = useMemo(() => {
    if (!selectedLead) return null;
    return leads.find(l => l.id === selectedLead.id) || selectedLead;
  }, [leads, selectedLead]);

  if (error) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 h-full">
        <CardContent className="flex items-center justify-center h-full text-red-400">
          Error loading CRM: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg font-semibold text-zinc-100">CRM Pipeline</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                {leads.length} leads
              </span>
              <button
                onClick={() => refresh()}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <SummaryBar stats={stats} />

          <div className="mt-3">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              bulkMode={bulkMode}
              onBulkModeToggle={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
              selectedCount={selectedIds.size}
              onBulkAction={handleBulkAction}
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 relative overflow-hidden p-0">
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading leads...
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all shadow-lg backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div
                ref={scrollRef}
                className="h-full overflow-x-auto overflow-y-hidden px-10 py-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
              >
                <div className="flex gap-4 h-full min-w-max">
                  {STAGES.map(s => (
                    <CrmColumn
                      key={s.key}
                      stage={s.key}
                      label={s.label}
                      leads={leadsByStage[s.key]}
                      onLeadClick={setSelectedLead}
                      selectedIds={selectedIds}
                      onSelect={toggleSelect}
                      bulkMode={bulkMode}
                    />
                  ))}
                </div>
              </div>

              <DragOverlay>
                {draggedLead && <LeadCardContent lead={draggedLead} isOverlay />}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Slide-out */}
      {activeLead && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedLead(null)}
          />
          <LeadDetailPanel
            lead={activeLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={updateLead}
            onAddTouchpoint={addTouchpoint}
          />
        </>
      )}
    </>
  );
}
