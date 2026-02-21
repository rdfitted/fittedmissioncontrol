'use client';

import { useState } from 'react';
import { PeopleTab } from './people-tab';
import { CompaniesTab } from './companies-tab';
import { EmailTab } from './email-tab';
import { CrmTab } from './crm-tab';
import { Users, Building2, Mail, Kanban } from 'lucide-react';
import { cn } from '@/lib/utils';

type CrmSubTab = 'people' | 'companies' | 'emails' | 'pipeline';

interface SubTabConfig {
  key: CrmSubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SUB_TABS: SubTabConfig[] = [
  { key: 'people', label: 'People', icon: Users },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'emails', label: 'Emails', icon: Mail },
  { key: 'pipeline', label: 'Pipeline', icon: Kanban },
];

export function CrmHub() {
  const [activeTab, setActiveTab] = useState<CrmSubTab>('people');

  return (
    <div className="h-full flex flex-col">
      {/* Sub-navigation bar */}
      <div className="shrink-0 bg-zinc-800 border-b border-zinc-700 px-4 py-2">
        <div className="flex items-center gap-2">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'companies' && <CompaniesTab />}
        {activeTab === 'emails' && <EmailTab />}
        {activeTab === 'pipeline' && <CrmTab />}
      </div>
    </div>
  );
}
