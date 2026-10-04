'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectionCard } from './connection-card';
import { DeveloperCard } from './developer-card';
import { Input } from '@/components/ui/input';
import { Users, UserCheck, Inbox, Search, Sparkles } from 'lucide-react';
import type {
  UserConnectionWithProfiles,
  DeveloperWithRelevance,
  Skill,
  Technology,
} from '@/types/database';

interface NetworkViewProps {
  currentUserId: string;
  connections: {
    connected: UserConnectionWithProfiles[];
    incoming: UserConnectionWithProfiles[];
    sent: UserConnectionWithProfiles[];
  };
  discoverableDevelopers: DeveloperWithRelevance[];
  allSkills: Skill[];
  allTechnologies: Technology[];
}

export function NetworkView({
  currentUserId,
  connections,
  discoverableDevelopers,
  allSkills,
  allTechnologies,
}: NetworkViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'connected';

  const [search, setSearch] = React.useState(searchParams.get('q') || '');
  const [selectedSkill, setSelectedSkill] = React.useState(searchParams.get('skill') || '');
  const [selectedTech, setSelectedTech] = React.useState(searchParams.get('tech') || '');

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/network?${params.toString()}`);
  };

  const handleFilter = (q: string, skill: string, tech: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'discover');
    if (q) params.set('q', q);
    else params.delete('q');

    if (skill) params.set('skill', skill);
    else params.delete('skill');

    if (tech) params.set('tech', tech);
    else params.delete('tech');

    router.push(`/network?${params.toString()}`);
  };

  const totalRequests = connections.incoming.length + connections.sent.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="pb-6 border-b border-border-subtle">
        <h1 className="text-2xl font-bold tracking-tight text-content-primary flex items-center gap-2.5">
          <Users className="h-6 w-6 text-accent-primary" />
          <span>Developer Network</span>
        </h1>
        <p className="mt-1 text-sm text-content-secondary">
          Connect with trusted peers, manage collaboration invites, and discover developers with complementary engineering skills.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-border-subtle pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('connected')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus:outline-none ${
            activeTab === 'connected'
              ? 'border-accent-primary text-content-primary font-semibold'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Connected ({connections.connected.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('requests')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus:outline-none ${
            activeTab === 'requests'
              ? 'border-accent-primary text-content-primary font-semibold'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Requests ({totalRequests})</span>
          {connections.incoming.length > 0 && (
            <span className="rounded-full bg-accent-primary px-1.5 py-0.2 text-[10px] font-bold text-content-inverse">
              {connections.incoming.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('discover')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus:outline-none ${
            activeTab === 'discover'
              ? 'border-accent-primary text-content-primary font-semibold'
              : 'border-transparent text-content-secondary hover:text-content-primary'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Discover Developers</span>
        </button>
      </div>

      {/* Tab: My Connections */}
      {activeTab === 'connected' && (
        <div className="mt-6">
          {connections.connected.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-muted p-12 text-center bg-app-surface-1/50">
              <Users className="h-10 w-10 text-content-muted mb-3" />
              <h3 className="text-base font-semibold text-content-primary">
                No connections yet
              </h3>
              <p className="mt-1 max-w-sm text-xs text-content-muted">
                Expand your network by discovering engineers working on complementary technologies.
              </p>
              <button
                type="button"
                onClick={() => handleTabChange('discover')}
                className="mt-4 rounded-md bg-accent-primary px-3.5 py-1.5 text-xs font-semibold text-content-inverse hover:opacity-90"
              >
                Discover Developers
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connections.connected.map((conn) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  currentUserId={currentUserId}
                  type="connected"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Requests */}
      {activeTab === 'requests' && (
        <div className="mt-6 space-y-8">
          {/* Incoming Requests */}
          <div>
            <h2 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
              <span>Incoming Requests</span>
              <span className="text-xs text-content-muted">
                ({connections.incoming.length})
              </span>
            </h2>
            {connections.incoming.length === 0 ? (
              <p className="text-xs text-content-muted rounded-lg border border-border-subtle bg-app-surface-1 p-6 text-center">
                No pending incoming requests.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connections.incoming.map((conn) => (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    currentUserId={currentUserId}
                    type="incoming"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h2 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
              <span>Sent Requests</span>
              <span className="text-xs text-content-muted">
                ({connections.sent.length})
              </span>
            </h2>
            {connections.sent.length === 0 ? (
              <p className="text-xs text-content-muted rounded-lg border border-border-subtle bg-app-surface-1 p-6 text-center">
                No pending requests sent.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connections.sent.map((conn) => (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    currentUserId={currentUserId}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Discover Developers */}
      {activeTab === 'discover' && (
        <div className="mt-6 space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-xl border border-border-subtle bg-app-surface-1 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-content-muted" />
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilter(e.target.value, selectedSkill, selectedTech);
                }}
                placeholder="Search by name, username, or headline..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Skill Filter */}
              <select
                value={selectedSkill}
                onChange={(e) => {
                  setSelectedSkill(e.target.value);
                  handleFilter(search, e.target.value, selectedTech);
                }}
                className="rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">All Skills</option>
                {allSkills.map((sk) => (
                  <option key={sk.id} value={sk.name}>
                    {sk.name}
                  </option>
                ))}
              </select>

              {/* Technology Filter */}
              <select
                value={selectedTech}
                onChange={(e) => {
                  setSelectedTech(e.target.value);
                  handleFilter(search, selectedSkill, e.target.value);
                }}
                className="rounded-lg border border-border-subtle bg-app-surface-2 px-3 py-2 text-xs text-content-primary focus:border-border-focus focus:outline-none"
              >
                <option value="">All Tech Stacks</option>
                {allTechnologies.map((tc) => (
                  <option key={tc.id} value={tc.name}>
                    {tc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Developers Grid */}
          {discoverableDevelopers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-muted p-12 text-center bg-app-surface-1/50">
              <Users className="h-10 w-10 text-content-muted mb-3" />
              <h3 className="text-base font-semibold text-content-primary">
                No developers match the filters
              </h3>
              <p className="mt-1 text-xs text-content-muted">
                Try clearing or adjusting your search parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {discoverableDevelopers.map((dev) => (
                <DeveloperCard
                  key={dev.profile.id}
                  developer={dev}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
