import { createClient } from '@/lib/supabase/server';
import type { NotificationWithActor } from '@/types/database';

/**
 * Regex for valid usernames prefixed by @.
 * Matches @[username] where username is 3-30 chars consisting of letters, digits, underscores, and hyphens.
 */
const MENTION_REGEX = /@([a-zA-Z0-9_-]{3,30})/g;

/**
 * Extracts unique mentioned usernames from text content.
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(MENTION_REGEX);
  const usernames = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      usernames.add(match[1].toLowerCase());
    }
  }
  return Array.from(usernames);
}

export interface CreateNotificationParams {
  recipientId: string;
  actorId?: string | null;
  type:
    | 'connection_request'
    | 'connection_accepted'
    | 'mention'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply';
  entityType: 'post' | 'comment' | 'connection';
  entityId: string;
  title: string;
  message: string;
}

/**
 * Inserts a single notification into Supabase.
 * Enforces server-side guard: never send self-notifications.
 */
export async function createNotification(
  params: CreateNotificationParams,
  customClient?: Awaited<ReturnType<typeof createClient>>
) {
  // Never notify self
  if (params.actorId && params.recipientId === params.actorId) {
    return null;
  }

  const supabase = customClient || (await createClient());

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: params.recipientId,
      actor_id: params.actorId || null,
      type: params.type,
      entity_type: params.entityType,
      entity_id: params.entityId,
      title: params.title,
      message: params.message,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }

  return data;
}

/**
 * Parses mentions in text and creates notifications for mentioned users.
 */
export async function notifyMentions({
  text,
  actorId,
  actorUsername,
  entityType,
  entityId,
  contextTitle,
  customClient,
}: {
  text: string;
  actorId: string;
  actorUsername: string;
  entityType: 'post' | 'comment';
  entityId: string;
  contextTitle?: string;
  customClient?: Awaited<ReturnType<typeof createClient>>;
}) {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return [];

  const supabase = customClient || (await createClient());

  // Lookup profiles corresponding to mentioned usernames
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', mentions);

  if (error || !profiles || profiles.length === 0) return [];

  const notifications = [];
  for (const target of profiles) {
    if (target.id === actorId) continue; // Don't notify self

    const title = `@${actorUsername} mentioned you`;
    const snippet =
      text.length > 80 ? `${text.slice(0, 77).trim()}...` : text.trim();
    const message = contextTitle
      ? `In "${contextTitle}": "${snippet}"`
      : `"${snippet}"`;

    const notification = await createNotification(
      {
        recipientId: target.id,
        actorId,
        type: 'mention',
        entityType,
        entityId,
        title,
        message,
      },
      supabase
    );

    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

/**
 * Fetches notifications for a user, enriched with actor profile.
 */
export async function getUserNotifications(
  userId: string,
  limit = 40
): Promise<NotificationWithActor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []) as NotificationWithActor[];
}

/**
 * Returns the unread notification count for a user.
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userId);

  return !error;
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  return !error;
}
