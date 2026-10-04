'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquare, Heart, UserPlus, Sparkles, CornerDownRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import type { NotificationWithActor } from '@/types/database';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/lib/actions/community';

interface NotificationPopoverProps {
  userId: string;
}

export function NotificationPopover({ userId }: NotificationPopoverProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationWithActor[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch initial notifications and count
  const fetchNotifications = React.useCallback(async () => {
    try {
      const supabase = createClient();
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
        .limit(20);

      if (!error && data) {
        setNotifications(data as NotificationWithActor[]);
        const unread = data.filter((n: { is_read: boolean }) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchNotifications();

    // Supabase Realtime subscription
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`user-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    } catch {
      // Ignore if realtime fails in dev/test
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [userId, fetchNotifications]);

  // Handle outside click & escape key
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: NotificationWithActor) => {
    if (!notif.is_read) {
      markNotificationReadAction({ notificationId: notif.id }).catch(console.error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
  };

  const getTargetUrl = (notif: NotificationWithActor) => {
    if (notif.entity_type === 'post') {
      return `/feed/${notif.entity_id}`;
    }
    if (notif.entity_type === 'comment') {
      return `/feed/${notif.entity_id}`;
    }
    if (notif.entity_type === 'connection') {
      return '/network?tab=requests';
    }
    return '/dashboard';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <UserPlus className="h-3.5 w-3.5 text-accent-primary" />;
      case 'post_like':
        return <Heart className="h-3.5 w-3.5 text-status-danger" />;
      case 'post_comment':
        return <MessageSquare className="h-3.5 w-3.5 text-status-info" />;
      case 'comment_reply':
        return <CornerDownRight className="h-3.5 w-3.5 text-status-info" />;
      case 'mention':
        return <Sparkles className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-content-muted" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-content-secondary hover:bg-app-surface-2 hover:text-content-primary focus:outline-none focus:ring-2 focus:ring-border-focus"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-content-inverse animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border-subtle bg-app-surface-1 py-2 shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-content-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent-primary/20 text-accent-primary px-1.5 py-0.2 text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-content-muted hover:text-accent-primary transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-content-muted">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const url = getTargetUrl(notif);
                return (
                  <Link
                    key={notif.id}
                    href={url}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 transition-colors hover:bg-app-surface-2 ${
                      !notif.is_read ? 'bg-accent-primary/5' : ''
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar
                        src={notif.actor?.avatar_url}
                        fallbackText={notif.actor?.full_name || 'U'}
                        size="sm"
                      />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-app-surface-1 p-0.5 border border-border-subtle">
                        {getNotificationIcon(notif.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-content-primary truncate">
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-content-secondary line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <time
                        dateTime={notif.created_at}
                        className="text-[10px] text-content-muted mt-1 block"
                      >
                        {new Date(notif.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
