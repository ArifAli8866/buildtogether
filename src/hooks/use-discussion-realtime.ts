'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DetailedDiscussionComment } from '@/lib/queries/collaboration';

interface UseDiscussionRealtimeOptions {
  discussionId: string;
  initialComments: DetailedDiscussionComment[];
}

export function useDiscussionRealtime({
  discussionId,
  initialComments,
}: UseDiscussionRealtimeOptions) {
  const [comments, setComments] = useState<DetailedDiscussionComment[]>(initialComments);
  const [isConnected, setIsConnected] = useState(false);
  const initialRef = useRef(initialComments);

  // Sync if initialComments props change from server
  useEffect(() => {
    setComments(initialComments);
    initialRef.current = initialComments;
  }, [initialComments]);

  // Helper to insert a comment into tree
  const insertIntoTree = useCallback(
    (tree: DetailedDiscussionComment[], newComment: DetailedDiscussionComment): DetailedDiscussionComment[] => {
      // Check if already in tree
      const existsInRoot = tree.some((c) => c.id === newComment.id);
      if (existsInRoot) return tree;

      for (const item of tree) {
        if (item.replies?.some((r) => r.id === newComment.id)) {
          return tree;
        }
      }

      if (!newComment.parent_comment_id) {
        return [...tree, { ...newComment, replies: newComment.replies || [] }];
      }

      return tree.map((c) => {
        if (c.id === newComment.parent_comment_id) {
          return {
            ...c,
            replies: [...(c.replies || []), newComment],
          };
        }
        return c;
      });
    },
    []
  );

  // Helper to update comment in tree
  const updateInTree = useCallback(
    (tree: DetailedDiscussionComment[], updated: Partial<DetailedDiscussionComment> & { id: string }): DetailedDiscussionComment[] => {
      return tree.map((c) => {
        if (c.id === updated.id) {
          return { ...c, ...updated };
        }
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
          };
        }
        return c;
      });
    },
    []
  );

  // Helper to remove comment from tree
  const removeFromTree = useCallback(
    (tree: DetailedDiscussionComment[], commentId: string): DetailedDiscussionComment[] => {
      return tree
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? c.replies.filter((r) => r.id !== commentId) : [],
        }));
    },
    []
  );

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Client creation failed (e.g. Missing envs in tests)
      return;
    }

    const channelName = `discussion:${discussionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_comments',
          filter: `discussion_id=eq.${discussionId}`,
        },
        async (payload) => {
          const newRow = payload.new as { id: string; parent_comment_id: string | null; author_id: string };
          // Fetch full comment with author profile
          const { data } = await supabase
            .from('discussion_comments')
            .select(`*, author:profiles!discussion_comments_author_id_fkey(id, username, full_name, avatar_url)`)
            .eq('id', newRow.id)
            .maybeSingle();

          if (data) {
            setComments((prev) => insertIntoTree(prev, data as unknown as DetailedDiscussionComment));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'discussion_comments',
          filter: `discussion_id=eq.${discussionId}`,
        },
        (payload) => {
          const updatedRow = payload.new as { id: string; content: string; updated_at: string };
          setComments((prev) =>
            updateInTree(prev, {
              id: updatedRow.id,
              content: updatedRow.content,
              updated_at: updatedRow.updated_at,
            })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'discussion_comments',
          filter: `discussion_id=eq.${discussionId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id: string };
          if (oldRow?.id) {
            setComments((prev) => removeFromTree(prev, oldRow.id));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [discussionId, insertIntoTree, updateInTree, removeFromTree]);

  return {
    comments,
    isConnected,
    insertCommentLocally: (c: DetailedDiscussionComment) => setComments((prev) => insertIntoTree(prev, c)),
    updateCommentLocally: (id: string, content: string) =>
      setComments((prev) => updateInTree(prev, { id, content, updated_at: new Date().toISOString() })),
    deleteCommentLocally: (id: string) => setComments((prev) => removeFromTree(prev, id)),
  };
}
