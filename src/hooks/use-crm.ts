'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============ Types (client-side mirror of lib/crm) ============

export type LeadStage = 'new' | 'researching' | 'qualified' | 'outreach' | 'engaged' | 'meeting' | 'proposal' | 'won' | 'lost' | 'nurture';
export type LeadPriority = 'high' | 'medium' | 'low';
export type TouchpointType = 'email' | 'call' | 'linkedin' | 'meeting' | 'whatsapp' | 'social_dm' | 'referral_intro' | 'form' | 'upwork' | 'other';
export type LeadSource = 'podio' | 'upwork' | 'referral' | 'inbound' | 'mno' | 'organic' | 'other';

export interface Contact {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
}

export interface Touchpoint {
  date: string;
  type: TouchpointType;
  note: string;
  by: string;
}

export interface StageChange {
  from: string;
  to: string;
  at: string;
}

export interface Lead {
  id: string;
  company: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  contacts: Contact[];
  source: LeadSource;
  stage: LeadStage;
  priority: LeadPriority;
  assigned: string | null;
  touchpoints: Touchpoint[];
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  stageHistory: StageChange[];
  dealValue: number | null;
  nextFollowUp: string | null;
  lostReason: string | null;
  score: number | null;
  podioId: string | null;
}

export const STAGES: { key: LeadStage; label: string; color: string; dot: string }[] = [
  { key: 'new', label: 'New', color: 'text-zinc-400', dot: 'bg-zinc-400' },
  { key: 'researching', label: 'Researching', color: 'text-blue-400', dot: 'bg-blue-400' },
  { key: 'qualified', label: 'Qualified', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  { key: 'outreach', label: 'Outreach', color: 'text-violet-400', dot: 'bg-violet-400' },
  { key: 'engaged', label: 'Engaged', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  { key: 'meeting', label: 'Meeting', color: 'text-orange-400', dot: 'bg-orange-400' },
  { key: 'proposal', label: 'Proposal', color: 'text-pink-400', dot: 'bg-pink-400' },
  { key: 'won', label: 'Won', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  { key: 'lost', label: 'Lost', color: 'text-red-400', dot: 'bg-red-400' },
  { key: 'nurture', label: 'Nurture', color: 'text-teal-400', dot: 'bg-teal-400' },
];

export interface CrmFilters {
  search: string;
  stage: LeadStage | null;
  priority: LeadPriority | null;
  source: LeadSource | null;
  assigned: string | null;
  tag: string | null;
}

export interface CrmStats {
  total: number;
  byStage: Record<LeadStage, number>;
  newThisWeek: number;
  stale: number; // no touch > 7 days
  conversionRate: number;
}

function computeStats(leads: Lead[]): CrmStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const byStage = {} as Record<LeadStage, number>;
  STAGES.forEach(s => byStage[s.key] = 0);

  let newThisWeek = 0;
  let stale = 0;
  let wonCount = 0;
  let totalExclNurture = 0;

  for (const lead of leads) {
    byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;

    if (new Date(lead.createdAt).getTime() > weekAgo) newThisWeek++;
    if (lead.stage !== 'nurture') totalExclNurture++;
    if (lead.stage === 'won') wonCount++;

    const lastTouch = lead.touchpoints.length
      ? new Date(lead.touchpoints[lead.touchpoints.length - 1].date).getTime()
      : new Date(lead.createdAt).getTime();
    if (now - lastTouch > 7 * 24 * 60 * 60 * 1000 && !['won', 'lost'].includes(lead.stage)) {
      stale++;
    }
  }

  return {
    total: leads.length,
    byStage,
    newThisWeek,
    stale,
    conversionRate: totalExclNurture > 0 ? Math.round((wonCount / totalExclNurture) * 100) : 0,
  };
}

export function useCrm() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CrmFilters>({
    search: '', stage: null, priority: null, source: null, assigned: null, tag: null,
  });

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Client-side filtering
  const filteredLeads = useMemo(() => {
    let result = leads;
    const { search, stage, priority, source, assigned, tag } = filters;

    if (stage) result = result.filter(l => l.stage === stage);
    if (priority) result = result.filter(l => l.priority === priority);
    if (source) result = result.filter(l => l.source === source);
    if (assigned) result = result.filter(l => l.assigned?.toLowerCase() === assigned.toLowerCase());
    if (tag) result = result.filter(l => l.tags.includes(tag));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const hay = [l.company, l.notes, l.industry, ...l.tags, ...l.contacts.map(c => `${c.name} ${c.email} ${c.role}`)].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }, [leads, filters]);

  const stats = useMemo(() => computeStats(leads), [leads]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const res = await fetch('/api/crm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { lead } = await res.json();
    setLeads(prev => prev.map(l => l.id === id ? lead : l));
    return lead;
  }, []);

  const addTouchpoint = useCallback(async (leadId: string, tp: Omit<Touchpoint, 'date'> & { date?: string }) => {
    const touchpoint = { ...tp, date: tp.date || new Date().toISOString() };
    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'touchpoint', leadId, touchpoint }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { lead } = await res.json();
    setLeads(prev => prev.map(l => l.id === leadId ? lead : l));
    return lead;
  }, []);

  const bulkUpdate = useCallback(async (ids: string[], updates: Partial<Pick<Lead, 'stage' | 'assigned' | 'tags' | 'priority'>>) => {
    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk', ids, updates }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fetchLeads(); // refresh all
  }, [fetchLeads]);

  const moveToStage = useCallback(async (leadId: string, stage: LeadStage) => {
    return updateLead(leadId, { stage });
  }, [updateLead]);

  return {
    leads: filteredLeads,
    allLeads: leads,
    loading,
    error,
    stats,
    filters,
    setFilters,
    refresh: fetchLeads,
    updateLead,
    addTouchpoint,
    bulkUpdate,
    moveToStage,
  };
}
