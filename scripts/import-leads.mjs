/**
 * Import leads from memory/marketing/leads/leads.json → squad/crm/leads.json
 * Run: node scripts/import-leads.mjs
 */
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const SOURCE = path.join(projectRoot, '..', 'memory', 'marketing', 'leads', 'leads.json');
const TARGET_DIR = path.join(projectRoot, '..', 'squad', 'crm');
const TARGET = path.join(TARGET_DIR, 'leads.json');

// Map Podio status text → our stage
function mapStage(statusText) {
  const map = {
    'new': 'new',
    'researching': 'researching',
    'qualified': 'qualified',
    'outreach': 'outreach',
    'engaged': 'engaged',
    'meeting': 'meeting',
    'proposal': 'proposal',
    'won': 'won',
    'lost': 'lost',
    'nurture': 'nurture',
    'contacted': 'outreach',
    'follow-up': 'nurture',
    'active': 'engaged',
  };
  const lower = (statusText || 'new').toLowerCase();
  return map[lower] || 'new';
}

// Map source text
function mapSource(sourceText) {
  const map = {
    'facebook': 'organic',
    'podio': 'podio',
    'upwork': 'upwork',
    'referral': 'referral',
    'inbound': 'inbound',
    'mno': 'mno',
    'organic': 'organic',
    'linkedin': 'organic',
    'google': 'inbound',
    'website': 'inbound',
  };
  const lower = (sourceText || 'other').toLowerCase();
  return map[lower] || 'other';
}

function mapTouchpoints(touches) {
  if (!touches?.length) return [];
  return touches.map(t => ({
    date: t.ts || new Date().toISOString(),
    type: t.channel === 'podio' ? 'other' : (t.channel || 'other'),
    note: t.summary || t.type || '',
    by: 'system',
  }));
}

// Read source
const raw = fs.readFileSync(SOURCE, 'utf-8').replace(/^\uFEFF/, '');
const source = JSON.parse(raw);

const converted = (source.leads || []).map(old => {
  const person = old.person || {};
  const pipeline = old.pipeline || {};

  return {
    id: randomUUID(),
    company: person.fullName || person.firstName || 'Unknown', // many leads are person-named
    website: null,
    industry: null,
    size: null,
    contacts: [{
      name: person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown',
      email: person.email || null,
      phone: person.phone || null,
      role: person.title || null,
    }],
    source: mapSource(pipeline.source?.text),
    stage: mapStage(old.status || pipeline.status?.text),
    priority: 'medium',
    assigned: null,
    touchpoints: mapTouchpoints(old.touches),
    notes: old.notes || '',
    tags: [],
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stageHistory: [],
    dealValue: null,
    nextFollowUp: null,
    lostReason: null,
    score: null,
    podioId: old.id || (old.podio?.itemId ? `podio:${old.podio.itemId}` : null),
  };
});

fs.mkdirSync(TARGET_DIR, { recursive: true });
fs.writeFileSync(TARGET, JSON.stringify({ leads: converted }, null, 2), 'utf-8');

console.log(`✅ Imported ${converted.length} leads → ${TARGET}`);
