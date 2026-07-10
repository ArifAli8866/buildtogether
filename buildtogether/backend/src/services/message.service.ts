import { supabaseAdmin } from '../config/supabase';
import { ApiError, NotFoundError, ForbiddenError } from '../middleware';

export class MessageService {
  async getChannels(projectId: string, userId: string) {
    // Verify membership
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    const { data, error } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new ApiError(500, 'Failed to fetch channels');
    }

    return data;
  }

  async getMessages(channelId: string, userId: string, before?: string, limit = 50) {
    let queryBuilder = supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, full_name, username, avatar_url)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      queryBuilder = queryBuilder.lt('created_at', before);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new ApiError(500, 'Failed to fetch messages');
    }

    return data?.reverse() || [];
  }

  async sendMessage(channelId: string, senderId: string, content: string, messageType = 'text', attachmentUrl?: string, replyToId?: string) {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        channel_id: channelId,
        sender_id: senderId,
        content,
        message_type: messageType,
        attachment_url: attachmentUrl,
        reply_to_id: replyToId,
      })
      .select(`
        *,
        sender:users!sender_id(id, full_name, username, avatar_url)
      `)
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to send message');
    }

    return data;
  }

  async markAsRead(channelId: string, userId: string) {
    await supabaseAdmin
      .from('channel_reads')
      .upsert({
        channel_id: channelId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      });
  }

  async getUnreadCount(channelId: string, userId: string) {
    const { data: readStatus } = await supabaseAdmin
      .from('channel_reads')
      .select('last_read_at')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .single();

    if (!readStatus) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', channelId);
      return count || 0;
    }

    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .gt('created_at', readStatus.last_read_at);

    return count || 0;
  }

  async createChannel(projectId: string, userId: string, name: string, description?: string) {
    // Verify ownership or admin
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError('Only project owner can create channels');
    }

    const { data, error } = await supabaseAdmin
      .from('channels')
      .insert({
        project_id: projectId,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        type: 'custom',
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to create channel');
    }

    return data;
  }
}

export const messageService = new MessageService();
