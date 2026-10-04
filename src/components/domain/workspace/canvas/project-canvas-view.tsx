'use client';

import * as React from 'react';
import type { Project, ProjectMemberRole, Profile, CanvasItemType } from '@/types/database';
import type { DetailedCanvasItem } from '@/lib/queries/collaboration';
import { useCanvasRealtime } from '@/hooks/use-canvas-realtime';
import {
  saveCanvasItemAction,
  updateCanvasItemPositionAction,
  deleteCanvasItemAction,
} from '@/lib/actions/collaboration';
import { CanvasToolbar } from './canvas-toolbar';
import { StickyNoteCard } from './sticky-note-card';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectCanvasViewProps {
  project: Project;
  initialItems: DetailedCanvasItem[];
  role: ProjectMemberRole;
  currentUserId: string;
  currentUserProfile?: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export function ProjectCanvasView({
  project,
  initialItems,
  role,
  currentUserId,
  currentUserProfile,
}: ProjectCanvasViewProps) {
  const isAdmin = role === 'owner' || role === 'maintainer';

  const {
    items,
    isConnected,
    optimisticMoveItem,
    optimisticResizeItem,
    optimisticAddItem,
    optimisticDeleteItem,
  } = useCanvasRealtime({
    projectId: project.id,
    initialItems,
  });

  const [zoom, setZoom] = React.useState(1.0);
  const [selectedFilter, setSelectedFilter] = React.useState('all');
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const panStartRef = React.useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))));
  const handleZoomReset = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Background panning
  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current && (e.target as HTMLElement).id !== 'canvas-grid') {
      return;
    }
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: panOffset.x,
      initialOffsetY: panOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - panStartRef.current.x;
    const deltaY = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.initialOffsetX + deltaX,
      y: panStartRef.current.initialOffsetY + deltaY,
    });
  };

  const handlePointerUpCanvas = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Add Item
  const handleAddItem = async (itemType: CanvasItemType, color: string) => {
    // Determine placement: offset into the visible viewport
    const visibleX = Math.max(40, -panOffset.x / zoom + 80);
    const visibleY = Math.max(40, -panOffset.y / zoom + 80);

    const tempId = `temp-${Date.now()}`;
    const author = currentUserProfile || {
      id: currentUserId,
      username: 'you',
      full_name: 'You',
      avatar_url: null,
    };

    const optimistic: DetailedCanvasItem = {
      id: tempId,
      project_id: project.id,
      author_id: currentUserId,
      item_type: itemType,
      content: '',
      color,
      position_x: visibleX,
      position_y: visibleY,
      width: 220,
      height: 180,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author,
    };

    optimisticAddItem(optimistic);

    const result = await saveCanvasItemAction({
      projectId: project.id,
      itemType,
      content: '',
      color,
      positionX: visibleX,
      positionY: visibleY,
      width: 220,
      height: 180,
    });

    if (result.success) {
      optimisticDeleteItem(tempId);
      optimisticAddItem({
        ...result.data,
        author,
      });
    }
  };

  // Update item position
  const handleMove = (id: string, x: number, y: number) => {
    optimisticMoveItem(id, x, y);
  };

  // Resize item
  const handleResize = (id: string, width: number, height: number) => {
    optimisticResizeItem(id, width, height);
  };

  // Commit update to database
  const handleUpdate = async (updated: DetailedCanvasItem) => {
    if (updated.id.startsWith('temp-')) return;

    await updateCanvasItemPositionAction({
      itemId: updated.id,
      projectId: project.id,
      positionX: updated.position_x,
      positionY: updated.position_y,
      width: updated.width,
      height: updated.height,
    });

    await saveCanvasItemAction({
      id: updated.id,
      projectId: project.id,
      itemType: updated.item_type,
      content: updated.content,
      color: updated.color,
      positionX: updated.position_x,
      positionY: updated.position_y,
      width: updated.width,
      height: updated.height,
    });
  };

  // Delete item
  const handleDelete = async (id: string) => {
    optimisticDeleteItem(id);
    if (!id.startsWith('temp-')) {
      await deleteCanvasItemAction(id, project.id);
    }
  };

  const filteredItems = React.useMemo(() => {
    if (selectedFilter === 'all') return items;
    return items.filter((i) => i.item_type === selectedFilter);
  }, [items, selectedFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] space-y-3">
      {/* Canvas Toolbar */}
      <CanvasToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onAddItem={handleAddItem}
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        isRealtimeConnected={isConnected}
      />

      {/* Canvas Viewport Surface */}
      <div
        ref={canvasRef}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        className={`relative flex-1 w-full overflow-hidden rounded-xl border border-border-subtle bg-app-surface-2/30 ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Infinite Grid Background Pattern */}
        <div
          id="canvas-grid"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
          }}
        />

        {/* Scaled/Panned Container */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        >
          <div className="relative w-[4000px] h-[4000px] pointer-events-auto">
            {filteredItems.map((item) => (
              <StickyNoteCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                zoom={zoom}
                onMove={handleMove}
                onResize={handleResize}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>

        {/* Empty Canvas Prompt */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm pointer-events-auto rounded-xl border border-dashed border-border-subtle bg-app-surface-1/80 backdrop-blur-sm shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-content-primary">
                Your ideation canvas is empty
              </h3>
              <p className="text-xs text-content-muted">
                Brainstorm architecture, capture ideas, map tech stack components, and discuss risks with your team.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAddItem('sticky_note', '#fef08a')}
                className="gap-2 text-xs mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Sticky Note</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
