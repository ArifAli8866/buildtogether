import { supabaseAdmin } from '../config/supabase';
import { ApiError, NotFoundError } from '../middleware';

export class NotificationService {
  async getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const offset = (page - 1) * limit;

    let queryBuilder = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (unreadOnly) {
      queryBuilder = queryBuilder.eq('is_read', false);
    }

    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new ApiError(500, 'Failed to fetch notifications');
    }

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to mark notification as read');
    }

    return data;
  }

  async markAllAsRead(userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new ApiError(500, 'Failed to mark all notifications as read');
    }
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, any>
  ) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return null;
    }

    return data;
  }

  async getUnreadCount(userId: string) {
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return count || 0;
  }

  async deleteNotification(notificationId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new ApiError(500, 'Failed to delete notification');
    }
  }
}

export const notificationService = new NotificationService();
