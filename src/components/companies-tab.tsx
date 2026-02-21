'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, Search, RefreshCw, ExternalLink, User, Users, 
  Calendar, X 
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  domain: string | null;
  client_tag: string | null;
  status: string | null;
  contact_count: number;
  avg_relationship_score: number | null;
}

interface CompanyDetail extends Omit<Company, 'contact_count' | 'avg_relationship_score'> {
  industry: string | null;
  size: string | null;
  notes: string | null;
  created_at: string;
  contacts: Array<{
    id: number;
    name: string;
    email: string | null;
    title: string | null;
    warmth_score: number | null;
  }>;
  recent_interactions: Array<{
    id: number;
    contact_name: string;
    type: string;
    subject: string | null;
    date: string;
  }>;
}

function getStatusBadgeColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case 'client':
      return 'bg-emerald-600 text-white';
    case 'prospect':
      return 'bg-blue-600 text-white';
    case 'lead':
      return 'bg-amber-600 text-white';
    case 'inactive':
      return 'bg-zinc-600 text-white';
    default:
      return 'bg-zinc-700 text-zinc-300';
  }
}

function getScoreBadgeColor(score: number | null): string {
  if (score === null || score === 0) return 'bg-zinc-700 text-zinc-300';
  if (score >= 70) return 'bg-emerald-600 text-white';
  if (score >= 40) return 'bg-yellow-600 text-white';
  return 'bg-red-600 text-white';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function CompanyCard({ company, onClick }: { company: Company; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-zinc-200">{company.name}</h3>
        </div>
        {company.status && (
          <Badge className={getStatusBadgeColor(company.status)}>
            {company.status}
          </Badge>
        )}
      </div>

      {company.domain && (
        <div className="text-xs text-zinc-500 mb-2">{company.domain}</div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-zinc-500">
            <Users className="w-3 h-3" />
            <span>{company.contact_count} contact{company.contact_count !== 1 ? 's' : ''}</span>
          </div>
          {company.avg_relationship_score !== null && company.avg_relationship_score > 0 && (
            <Badge className={getScoreBadgeColor(company.avg_relationship_score)}>
              {Math.round(company.avg_relationship_score)}
            </Badge>
          )}
        </div>
        {company.client_tag && (
          <Badge variant="outline" className="text-[10px]">{company.client_tag}</Badge>
        )}
      </div>
    </div>
  );
}

function CompanyDetailPanel({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/crm/companies/${companyId}`);
        const data = await res.json();
        if (data.company) {
          setCompany(data.company);
        }
      } catch (err) {
        console.error('Error fetching company detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [companyId]);

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex items-center justify-center text-zinc-500">
        Company not found
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{company.name}</h2>
          {company.domain && (
            <a 
              href={`https://${company.domain}`} 
              target="_blank" 
              rel="noopener" 
              className="text-sm text-blue-400 hover:underline flex items-center gap-1"
            >
              {company.domain}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Company Info */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Company Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Status:</span>
              {company.status && (
                <Badge className={getStatusBadgeColor(company.status)}>
                  {company.status}
                </Badge>
              )}
              {company.client_tag && (
                <Badge variant="outline">{company.client_tag}</Badge>
              )}
            </div>
            {company.industry && (
              <div className="text-sm">
                <span className="text-zinc-400">Industry:</span> {company.industry}
              </div>
            )}
            {company.size && (
              <div className="text-sm">
                <span className="text-zinc-400">Size:</span> {company.size}
              </div>
            )}
          </div>
        </section>

        {/* Contacts */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Contacts ({company.contacts.length})
          </h3>
          <div className="space-y-2">
            {company.contacts.length === 0 ? (
              <div className="text-xs text-zinc-600">No contacts</div>
            ) : (
              company.contacts.map(contact => (
                <div key={contact.id} className="bg-zinc-900 rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-medium text-zinc-200">{contact.name}</span>
                    </div>
                    {contact.warmth_score !== null && contact.warmth_score > 0 && (
                      <Badge className={getScoreBadgeColor(contact.warmth_score)}>
                        {contact.warmth_score}
                      </Badge>
                    )}
                  </div>
                  {contact.title && (
                    <div className="text-xs text-zinc-400 ml-5">{contact.title}</div>
                  )}
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="text-xs text-blue-400 hover:underline ml-5 block mt-1"
                    >
                      {contact.email}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Interactions */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Recent Interactions ({company.recent_interactions.length})
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {company.recent_interactions.length === 0 ? (
              <div className="text-xs text-zinc-600">No interactions recorded</div>
            ) : (
              company.recent_interactions.map(int => (
                <div key={int.id} className="bg-zinc-900 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">{int.type}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">{int.contact_name}</span>
                    </div>
                    <span className="text-zinc-600">{formatDate(int.date)}</span>
                  </div>
                  {int.subject && (
                    <div className="text-zinc-400">{int.subject}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Notes */}
        {company.notes && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Notes</h3>
            <div className="text-sm text-zinc-400 whitespace-pre-wrap bg-zinc-900 rounded p-3">
              {company.notes}
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="text-[10px] text-zinc-600 border-t border-zinc-800 pt-3">
          <div>Created: {new Date(company.created_at).toLocaleString()}</div>
          <div>Company ID: {company.id}</div>
        </section>
      </div>
    </div>
  );
}

export function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/crm/companies?${params}`);
      const data = await res.json();
      
      if (data.note) {
        setError(data.note);
      }
      
      setCompanies(data.companies || []);
    } catch (err) {
      setError('Failed to load companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchQuery, statusFilter]);

  return (
    <>
      <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg font-semibold text-zinc-100">Companies</CardTitle>
            <button
              onClick={fetchCompanies}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="bg-zinc-800 border-zinc-700 pl-8 text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300"
            >
              <option value="">All Status</option>
              <option value="client">Client</option>
              <option value="prospect">Prospect</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {error && (
            <div className="text-xs text-yellow-500 bg-yellow-950/20 border border-yellow-800 rounded px-2 py-1 mt-2">
              {error}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {loading && companies.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading companies...
            </div>
          ) : companies.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              No companies found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={() => setSelectedCompanyId(company.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selectedCompanyId !== null && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedCompanyId(null)}
          />
          <CompanyDetailPanel
            companyId={selectedCompanyId}
            onClose={() => setSelectedCompanyId(null)}
          />
        </>
      )}
    </>
  );
}
