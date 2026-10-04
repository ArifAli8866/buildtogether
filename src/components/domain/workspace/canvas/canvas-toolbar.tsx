'use client';

import * as React from 'react';
import type { CanvasItemType } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wifi,
  Lightbulb,
  AlertTriangle,
  Cpu,
  CheckCircle,
  StickyNote,
} from 'lucide-react';

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAddItem: (type: CanvasItemType, color: string) => void;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  isRealtimeConnected: boolean;
}

export function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onAddItem,
  selectedFilter,
  onSelectFilter,
  isRealtimeConnected,
}: CanvasToolbarProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = React.useState(false);

  const addOptions: Array<{ type: CanvasItemType; color: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { type: 'sticky_note', color: '#fef08a', label: 'Sticky Note', icon: StickyNote },
    { type: 'idea', color: '#bae6fd', label: 'Idea', icon: Lightbulb },
    { type: 'risk', color: '#fbcfe8', label: 'Risk Item', icon: AlertTriangle },
    { type: 'tech_stack', color: '#e9d5ff', label: 'Tech Stack', icon: Cpu },
    { type: 'decision', color: '#bbf7d0', label: 'Decision', icon: CheckCircle },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-app-surface-1 border border-border-subtle p-3 rounded-xl shadow-sm">
      {/* Add Item Actions */}
      <div className="flex items-center gap-2 relative">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddMenuOpen((prev) => !prev)}
          className="gap-2 text-xs h-8"
        >
          <Plus className="h-4 w-4" />
          <span>Add to Canvas</span>
        </Button>

        {isAddMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsAddMenuOpen(false)}
            />
            <div className="absolute left-0 top-10 z-50 w-48 rounded-xl border border-border-subtle bg-app-surface-1 p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
              {addOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      onAddItem(opt.type, opt.color);
                      setIsAddMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-xs font-medium text-content-primary hover:bg-app-surface-2 transition-colors text-left"
                  >
                    <span
                      style={{ backgroundColor: opt.color }}
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                    />
                    <Icon className="h-3.5 w-3.5 text-content-secondary" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Realtime Live Indicator */}
        {isRealtimeConnected && (
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <Wifi className="h-3 w-3 animate-pulse" />
            <span>Live Sync</span>
          </div>
        )}
      </div>

      {/* Filter by Item Type */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin text-xs">
        {['all', 'sticky_note', 'idea', 'risk', 'tech_stack', 'decision'].map((filter) => {
          const isActive = selectedFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onSelectFilter(filter)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-accent-primary text-white'
                  : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
              }`}
            >
              {filter === 'all' ? 'All' : filter.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          className="h-7 w-7 p-0"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <span className="text-[11px] font-semibold text-content-muted w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          className="h-7 w-7 p-0"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomReset}
          className="h-7 w-7 p-0 text-content-muted hover:text-content-primary"
          title="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
