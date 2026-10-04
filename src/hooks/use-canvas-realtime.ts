'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DetailedCanvasItem } from '@/lib/queries/collaboration';

interface UseCanvasRealtimeOptions {
  projectId: string;
  initialItems: DetailedCanvasItem[];
}

export function useCanvasRealtime({
  projectId,
  initialItems,
}: UseCanvasRealtimeOptions) {
  const [items, setItems] = useState<DetailedCanvasItem[]>(initialItems);
  const [isConnected, setIsConnected] = useState(false);
  const initialRef = useRef(initialItems);

  useEffect(() => {
    setItems(initialItems);
    initialRef.current = initialItems;
  }, [initialItems]);

  const optimisticMoveItem = useCallback((itemId: string, x: number, y: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, position_x: x, position_y: y } : item
      )
    );
  }, []);

  const optimisticResizeItem = useCallback(
    (itemId: string, width: number, height: number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, width, height } : item
        )
      );
    },
    []
  );

  const optimisticAddItem = useCallback((newItem: DetailedCanvasItem) => {
    setItems((prev) => {
      if (prev.some((item) => item.id === newItem.id)) {
        return prev;
      }
      return [...prev, newItem];
    });
  }, []);

  const optimisticDeleteItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channelName = `canvas:${projectId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_canvas_items',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const newRow = payload.new as { id: string };
          // Fetch complete item with author details
          const { data } = await supabase
            .from('project_canvas_items')
            .select(`*, author:profiles!project_canvas_items_author_id_fkey(id, username, full_name, avatar_url)`)
            .eq('id', newRow.id)
            .maybeSingle();

          if (data) {
            optimisticAddItem(data as unknown as DetailedCanvasItem);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_canvas_items',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            content: string;
            color: string;
            item_type: DetailedCanvasItem['item_type'];
            position_x: number;
            position_y: number;
            width: number;
            height: number;
            updated_at: string;
          };

          setItems((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    content: updated.content,
                    color: updated.color,
                    item_type: updated.item_type,
                    position_x: updated.position_x,
                    position_y: updated.position_y,
                    width: updated.width,
                    height: updated.height,
                    updated_at: updated.updated_at,
                  }
                : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_canvas_items',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id: string };
          if (oldRow?.id) {
            optimisticDeleteItem(oldRow.id);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, optimisticAddItem, optimisticDeleteItem]);

  return {
    items,
    isConnected,
    optimisticMoveItem,
    optimisticResizeItem,
    optimisticAddItem,
    optimisticDeleteItem,
  };
}
