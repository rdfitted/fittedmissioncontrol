import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Data file path
export const CRM_DIR = path.join(process.cwd(), '..', 'squad', 'crm');
export const CRM_FILE = path.join(CRM_DIR, 'leads.json');

// ============ Types ============

export type LeadStage = 'new' | 'researching' | 'qualified' | 'outreach' | 'engaged' | 'meeting' | 'proposal' | 'won' | 'lost' | 'nurture';
export type LeadPriority = 'high' | 'medium' | 'low';
export type TouchpointType = 'email' | 'call' | 'linkedin' | 'meeting' | 'whatsapp' | 'social_dm' | 'referral_intro' | 'form' | 'upwork' | 'other';
export type LeadSource = 'podio' | 'upwork' | 'referral' | 'inbound' | 'mno' | 'organic' | 'other';
export type LostReason = 'cold' | 'declined' | 'competitor' | 'budget' | 'other';

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
  lostReason: LostReason | null;
  score: number | null;
  podioId: string | null;
}

export interface CrmData {
  leads: Lead[];
}

export const STAGES: { key: LeadStage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'researching', label: 'Researching' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'engaged', label: 'Engaged' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'nurture', label: 'Nurture' },
];

// ============ File I/O ============

async function ensureDir() {
  await fs.mkdir(CRM_DIR, { recursive: true });
}

export async function readCrmData(): Promise<CrmData> {
  try {
    const raw = await fs.readFile(CRM_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { leads: [] };
  }
}

export async function writeCrmData(data: CrmData): Promise<void> {
  await ensureDir();
  await fs.writeFile(CRM_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ CRUD ============

export async function getAllLeads(): Promise<Lead[]> {
  const data = await readCrmData();
  return data.leads;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const data = await readCrmData();
  return data.leads.find(l => l.id === id) || null;
}

export async function createLead(input: Partial<Lead>): Promise<Lead> {
  const data = await readCrmData();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: randomUUID(),
    company: input.company || 'Unknown',
    website: input.website || null,
    industry: input.industry || null,
    size: input.size || null,
    contacts: input.contacts || [],
    source: input.source || 'other',
    stage: input.stage || 'new',
    priority: input.priority || 'medium',
    assigned: input.assigned || null,
    touchpoints: input.touchpoints || [],
    notes: input.notes || '',
    tags: input.tags || [],
    createdAt: input.createdAt || now,
    updatedAt: now,
    stageHistory: input.stageHistory || [],
    dealValue: input.dealValue ?? null,
    nextFollowUp: input.nextFollowUp || null,
    lostReason: input.lostReason || null,
    score: input.score ?? null,
    podioId: input.podioId || null,
  };
  data.leads.push(lead);
  await writeCrmData(data);
  return lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const data = await readCrmData();
  const idx = data.leads.findIndex(l => l.id === id);
  if (idx === -1) return null;

  const existing = data.leads[idx];
  const now = new Date().toISOString();

  // Track stage changes
  if (updates.stage && updates.stage !== existing.stage) {
    existing.stageHistory.push({
      from: existing.stage,
      to: updates.stage,
      at: now,
    });
  }

  const updated: Lead = {
    ...existing,
    ...updates,
    id: existing.id, // never overwrite id
    stageHistory: existing.stageHistory,
    updatedAt: now,
  };
  data.leads[idx] = updated;
  await writeCrmData(data);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const data = await readCrmData();
  const before = data.leads.length;
  data.leads = data.leads.filter(l => l.id !== id);
  if (data.leads.length === before) return false;
  await writeCrmData(data);
  return true;
}

export async function addTouchpoint(leadId: string, tp: Touchpoint): Promise<Lead | null> {
  const data = await readCrmData();
  const lead = data.leads.find(l => l.id === leadId);
  if (!lead) return null;
  lead.touchpoints.push(tp);
  lead.updatedAt = new Date().toISOString();
  await writeCrmData(data);
  return lead;
}

export async function bulkUpdateLeads(
  ids: string[],
  updates: Partial<Pick<Lead, 'stage' | 'assigned' | 'tags' | 'priority'>>
): Promise<number> {
  const data = await readCrmData();
  const now = new Date().toISOString();
  let count = 0;

  for (const lead of data.leads) {
    if (!ids.includes(lead.id)) continue;
    if (updates.stage && updates.stage !== lead.stage) {
      lead.stageHistory.push({ from: lead.stage, to: updates.stage, at: now });
      lead.stage = updates.stage;
    }
    if (updates.assigned !== undefined) lead.assigned = updates.assigned;
    if (updates.priority) lead.priority = updates.priority;
    if (updates.tags) lead.tags = [...new Set([...lead.tags, ...updates.tags])];
    lead.updatedAt = now;
    count++;
  }

  await writeCrmData(data);
  return count;
}
