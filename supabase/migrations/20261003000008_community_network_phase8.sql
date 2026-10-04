-- ==============================================================================
-- Build Together — Phase 8: Community Feed, Developer Network & Notifications
-- Migration: 20261003000008_community_network_phase8.sql
-- ==============================================================================

-- 1. Ensure Bidirectional Unique Constraint on user_connections
-- Prevents cross-direction duplicate connection requests (e.g. A->B and B->A)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_connections_bidirectional_unique 
  ON public.user_connections (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));

-- 2. Enhanced Notifications RLS Policies
-- Enable actors to insert notifications when their auth.uid() matches actor_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can insert notifications'
  ) THEN
    CREATE POLICY "Users can insert notifications" 
      ON public.notifications FOR INSERT 
      WITH CHECK (auth.uid() = actor_id);
  END IF;
END $$;

-- Enable recipients to delete/dismiss their notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can delete their notifications'
  ) THEN
    CREATE POLICY "Users can delete their notifications" 
      ON public.notifications FOR DELETE 
      USING (recipient_id = auth.uid());
  END IF;
END $$;

-- 3. Additional Indexes for High-Traffic Queries
CREATE INDEX IF NOT EXISTS idx_community_posts_project ON public.community_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON public.community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
