'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, Search, RefreshCw, Mail, Phone, Building2, Calendar, 
  ExternalLink, MessageSquare, Plus, X 
} from 'lucide-react';

interface Contact {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  warmth_score: number | null;
  client_tag: string | null;
  last_interaction_date: string | null;
}

interface ContactDetail extends Contact {
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
  relationships: Array<{ id: number; name: string; type: string }>;
  interactions: Array<{
    id: number;
    type: string;
    subject: string | null;
    date: string;
    notes: string | null;
  }>;
}

function getScoreBadgeColor(score: number | null): string {
  if (score === null || score === 0) return 'bg-zinc-700 text-zinc-300';
  if (score >= 70) return 'bg-emerald-600 text-white';
  if (score >= 40) return 'bg-yellow-600 text-white';
  return 'bg-red-600 text-white';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-zinc-200">{contact.name}</h3>
        </div>
        {contact.warmth_score !== null && (
          <Badge className={getScoreBadgeColor(contact.warmth_score)}>
            {contact.warmth_score}
          </Badge>
        )}
      </div>

      {contact.title && (
        <div className="text-xs text-zinc-400 mb-1">{contact.title}</div>
      )}

      {contact.company && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <Building2 className="w-3 h-3" />
          {contact.company}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-600 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(contact.last_interaction_date)}
        </div>
        {contact.client_tag && (
          <Badge variant="outline" className="text-[10px]">{contact.client_tag}</Badge>
        )}
      </div>
    </div>
  );
}

function ContactDetailPanel({ contactId, onClose }: { contactId: number; onClose: () => void }) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/crm/contacts/${contactId}`);
        const data = await res.json();
        if (data.contact) {
          setContact(data.contact);
        }
      } catch (err) {
        console.error('Error fetching contact detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [contactId]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex items-center justify-center text-zinc-500">
        Contact not found
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{contact.name}</h2>
          {contact.title && <div className="text-sm text-zinc-500">{contact.title}</div>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact Info */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Contact Info</h3>
          <div className="space-y-2 text-sm">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-500" />
                <a href={`mailto:${contact.email}`} className="text-blue-400 hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-500" />
                <a href={`tel:${contact.phone}`} className="text-blue-400 hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-300">{contact.company}</span>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-zinc-500" />
                <a href={contact.linkedin_url} target="_blank" rel="noopener" className="text-blue-400 hover:underline">
                  LinkedIn
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Relationship Score */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Relationship</h3>
          <div className="flex items-center gap-2">
            <Badge className={getScoreBadgeColor(contact.warmth_score)}>
              Score: {contact.warmth_score || 0}
            </Badge>
            {contact.client_tag && (
              <Badge variant="outline">{contact.client_tag}</Badge>
            )}
          </div>
          {contact.last_interaction_date && (
            <div className="text-xs text-zinc-500 mt-2">
              Last contact: {formatDate(contact.last_interaction_date)}
            </div>
          )}
        </section>

        {/* Relationships */}
        {contact.relationships.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
              Relationships ({contact.relationships.length})
            </h3>
            <div className="space-y-1.5">
              {contact.relationships.map(rel => (
                <div key={rel.id} className="bg-zinc-900 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">{rel.name}</span>
                    <Badge variant="outline" className="text-[10px]">{rel.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interactions */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Recent Interactions ({contact.interactions.length})
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {contact.interactions.length === 0 ? (
              <div className="text-xs text-zinc-600">No interactions recorded</div>
            ) : (
              contact.interactions.map(int => (
                <div key={int.id} className="bg-zinc-900 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-300 font-medium">{int.type}</span>
                    <span className="text-zinc-600">{formatDate(int.date)}</span>
                  </div>
                  {int.subject && (
                    <div className="text-zinc-400 mb-0.5">{int.subject}</div>
                  )}
                  {int.notes && (
                    <div className="text-zinc-500 text-[10px]">{int.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Notes */}
        {contact.notes && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Notes</h3>
            <div className="text-sm text-zinc-400 whitespace-pre-wrap bg-zinc-900 rounded p-3">
              {contact.notes}
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="text-[10px] text-zinc-600 border-t border-zinc-800 pt-3">
          <div>Created: {new Date(contact.created_at).toLocaleString()}</div>
          <div>Contact ID: {contact.id}</div>
        </section>
      </div>
    </div>
  );
}

function AddContactModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpen(false);
        setFormData({ name: '', email: '', company: '', title: '', phone: '', notes: '' });
        onSuccess();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to create contact'}`);
      }
    } catch (err) {
      alert('Error creating contact');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Name *</label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Company</label>
            <Input
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Title</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Phone</label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PeopleTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (companyFilter) params.set('company', companyFilter);
      if (minScore) params.set('minScore', minScore);
      params.set('limit', '100');

      const res = await fetch(`/api/crm/contacts?${params}`);
      const data = await res.json();
      
      if (data.note) {
        setError(data.note);
      }
      
      setContacts(data.contacts || []);
    } catch (err) {
      setError('Failed to load contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [searchQuery, companyFilter, minScore]);

  // Get unique companies for filter
  const companies = useMemo(() => {
    const unique = new Set(contacts.map(c => c.company).filter((c): c is string => Boolean(c)));
    return Array.from(unique).sort();
  }, [contacts]);

  return (
    <>
      <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg font-semibold text-zinc-100">People</CardTitle>
            <div className="flex items-center gap-2">
              <AddContactModal onSuccess={fetchContacts} />
              <button
                onClick={fetchContacts}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="bg-zinc-800 border-zinc-700 pl-8 text-sm"
              />
            </div>

            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={minScore}
              onChange={e => setMinScore(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300"
            >
              <option value="">All Scores</option>
              <option value="70">70+ (Hot)</option>
              <option value="40">40+ (Warm)</option>
              <option value="0">0+ (All)</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-yellow-500 bg-yellow-950/20 border border-yellow-800 rounded px-2 py-1 mt-2">
              {error}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {loading && contacts.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              No contacts found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={() => setSelectedContactId(contact.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selectedContactId !== null && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedContactId(null)}
          />
          <ContactDetailPanel
            contactId={selectedContactId}
            onClose={() => setSelectedContactId(null)}
          />
        </>
      )}
    </>
  );
}
