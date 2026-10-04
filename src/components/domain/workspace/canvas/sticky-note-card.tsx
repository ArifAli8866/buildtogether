'use client';

import * as React from 'react';
import type { DetailedCanvasItem } from '@/lib/queries/collaboration';
import type { CanvasItemType } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import {
  StickyNote,
  Lightbulb,
  AlertTriangle,
  Cpu,
  CheckCircle,
  Trash2,
  GripHorizontal,
} from 'lucide-react';

interface StickyNoteCardProps {
  item: DetailedCanvasItem;
  currentUserId: string;
  isAdmin: boolean;
  zoom: number;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onUpdate: (item: DetailedCanvasItem) => void;
  onDelete: (id: string) => void;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  '#fef08a': { bg: 'bg-[#fef08a]', border: 'border-[#fde047]', text: 'text-amber-950' },
  '#bae6fd': { bg: 'bg-[#bae6fd]', border: 'border-[#7dd3fc]', text: 'text-sky-950' },
  '#bbf7d0': { bg: 'bg-[#bbf7d0]', border: 'border-[#86efac]', text: 'text-emerald-950' },
  '#fbcfe8': { bg: 'bg-[#fbcfe8]', border: 'border-[#f472b6]', text: 'text-pink-950' },
  '#e9d5ff': { bg: 'bg-[#e9d5ff]', border: 'border-[#d8b4fe]', text: 'text-purple-950' },
};

const COLOR_OPTIONS = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8', '#e9d5ff'];

const TYPE_CONFIG: Record<CanvasItemType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  sticky_note: { label: 'Note', icon: StickyNote },
  idea: { label: 'Idea', icon: Lightbulb },
  risk: { label: 'Risk', icon: AlertTriangle },
  tech_stack: { label: 'Tech', icon: Cpu },
  decision: { label: 'Decision', icon: CheckCircle },
};

export function StickyNoteCard({
  item,
  currentUserId,
  isAdmin,
  zoom,
  onMove,
  onResize,
  onUpdate,
  onDelete,
}: StickyNoteCardProps) {
  const isAuthor = item.author_id === currentUserId;
  const canModify = isAuthor || isAdmin;

  const [isEditing, setIsEditing] = React.useState(false);
  const [content, setContent] = React.useState(item.content);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const dragStartRef = React.useRef({ mouseX: 0, mouseY: 0, posX: item.position_x, posY: item.position_y });
  const resizeStartRef = React.useRef({ mouseX: 0, mouseY: 0, width: item.width || 220, height: item.height || 180 });

  React.useEffect(() => {
    setContent(item.content);
  }, [item.content]);

  // Color styles
  const styleConfig = COLOR_MAP[item.color] || COLOR_MAP['#fef08a'];
  const TypeIcon = TYPE_CONFIG[item.item_type]?.icon || StickyNote;

  // Handle Dragging
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if (!canModify || isEditing) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: item.position_x,
      posY: item.position_y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStartRef.current.mouseX) / zoom;
    const deltaY = (e.clientY - dragStartRef.current.mouseY) / zoom;
    const newX = Math.max(0, Math.round(dragStartRef.current.posX + deltaX));
    const newY = Math.max(0, Math.round(dragStartRef.current.posY + deltaY));
    onMove(item.id, newX, newY);
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      onUpdate({ ...item, position_x: item.position_x, position_y: item.position_y });
    }
  };

  // Handle Resizing
  const handlePointerDownResize = (e: React.PointerEvent) => {
    if (!canModify) return;
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: item.width || 220,
      height: item.height || 180,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const deltaX = (e.clientX - resizeStartRef.current.mouseX) / zoom;
    const deltaY = (e.clientY - resizeStartRef.current.mouseY) / zoom;
    const newW = Math.max(160, Math.min(600, Math.round(resizeStartRef.current.width + deltaX)));
    const newH = Math.max(120, Math.min(600, Math.round(resizeStartRef.current.height + deltaY)));
    onResize(item.id, newW, newH);
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      onUpdate({ ...item, width: item.width, height: item.height });
    }
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canModify || isEditing) return;
    const step = e.shiftKey ? 80 : 20;

    let newX = item.position_x;
    let newY = item.position_y;

    if (e.key === 'ArrowLeft') newX = Math.max(0, newX - step);
    else if (e.key === 'ArrowRight') newX = newX + step;
    else if (e.key === 'ArrowUp') newY = Math.max(0, newY - step);
    else if (e.key === 'ArrowDown') newY = newY + step;
    else if (e.key === 'Enter') {
      setIsEditing(true);
      return;
    } else return;

    e.preventDefault();
    onMove(item.id, newX, newY);
    onUpdate({ ...item, position_x: newX, position_y: newY });
  };

  const handleSaveContent = () => {
    setIsEditing(false);
    if (content.trim() !== item.content) {
      onUpdate({ ...item, content: content.trim() });
    }
  };

  const handleChangeColor = (newColor: string) => {
    onUpdate({ ...item, color: newColor });
  };

  const handleChangeType = (newType: CanvasItemType) => {
    onUpdate({ ...item, item_type: newType });
  };

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      role="region"
      aria-label={`${item.item_type}: ${item.content}`}
      onKeyDown={handleKeyDown}
      style={{
        transform: `translate(${item.position_x}px, ${item.position_y}px)`,
        width: `${item.width || 220}px`,
        height: `${item.height || 180}px`,
      }}
      className={`absolute select-none flex flex-col justify-between rounded-xl border-2 shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-accent-primary ${
        styleConfig.bg
      } ${styleConfig.border} ${styleConfig.text} ${
        isDragging ? 'shadow-2xl opacity-90 z-40' : 'z-10 hover:shadow-lg'
      }`}
    >
      {/* Top Handle: Drag area, Type & Actions */}
      <div
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        className="flex items-center justify-between p-2 cursor-grab active:cursor-grabbing border-b border-black/10"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 opacity-40 shrink-0" />
          {canModify ? (
            <select
              value={item.item_type}
              onChange={(e) => handleChangeType(e.target.value as CanvasItemType)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
            >
              <option value="sticky_note">Note</option>
              <option value="idea">Idea</option>
              <option value="risk">Risk</option>
              <option value="tech_stack">Tech</option>
              <option value="decision">Decision</option>
            </select>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
              <TypeIcon className="h-3 w-3" />
              <span>{TYPE_CONFIG[item.item_type]?.label}</span>
            </span>
          )}
        </div>

        {/* Delete button */}
        {canModify && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/10 transition-colors"
            title="Delete sticky note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div
        className="flex-1 p-2.5 overflow-y-auto cursor-text text-xs leading-relaxed"
        onClick={() => {
          if (canModify) setIsEditing(true);
        }}
      >
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSaveContent}
            autoFocus
            rows={4}
            className="w-full h-full bg-transparent resize-none focus:outline-none text-xs leading-relaxed font-sans placeholder-black/40"
            placeholder="Type your note..."
          />
        ) : (
          <p className="whitespace-pre-wrap font-medium">
            {content || <span className="opacity-40 italic">Empty note</span>}
          </p>
        )}
      </div>

      {/* Bottom Bar: Color picker, Author & Resize Handle */}
      <div className="flex items-center justify-between p-2 border-t border-black/10 text-[10px]">
        {/* Colors */}
        {canModify ? (
          <div className="flex items-center gap-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                style={{ backgroundColor: c }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangeColor(c);
                }}
                className={`h-3 w-3 rounded-full border border-black/20 transition-transform ${
                  item.color === c ? 'scale-125 ring-1 ring-black/40' : 'hover:scale-110'
                }`}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5">
          <Avatar
            src={item.author.avatar_url}
            alt={item.author.username}
            fallbackText={item.author.username}
            size="sm"
            className="h-3.5 w-3.5 text-[8px]"
          />
          <span className="opacity-70 truncate max-w-[60px]">
            {item.author.username}
          </span>
        </div>

        {/* Resize handle */}
        {canModify && (
          <div
            onPointerDown={handlePointerDownResize}
            onPointerMove={handlePointerMoveResize}
            onPointerUp={handlePointerUpResize}
            className="cursor-se-resize p-0.5 opacity-50 hover:opacity-100"
            title="Resize"
          >
            <div className="w-2 h-2 border-r-2 border-b-2 border-current" />
          </div>
        )}
      </div>
    </div>
  );
}
