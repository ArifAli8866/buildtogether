import { supabaseAdmin } from '../config/supabase';
import { ApiError, NotFoundError, ConflictError } from '../middleware';

export class UserService {
  async getProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        followers_count:user_follows!following_id(count),
        following_count:user_follows!follower_id(count),
        projects_created:projects!owner_id(count),
        projects_joined:project_members!user_id(count)
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundError('User not found');
    }

    return data;
  }

  async getProfileByUsername(username: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      throw new NotFoundError('User not found');
    }

    return data;
  }

  async updateProfile(userId: string, updates: Record<string, any>) {
    // Check username uniqueness if being updated
    if (updates.username) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', updates.username)
        .neq('id', userId)
        .single();

      if (existing) {
        throw new ConflictError('Username already taken');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update profile');
    }

    return data;
  }

  async searchUsers(query: string, filters: any = {}) {
    let queryBuilder = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`
      );
    }

    if (filters.experience_level) {
      queryBuilder = queryBuilder.eq('experience_level', filters.experience_level);
    }

    if (filters.availability) {
      queryBuilder = queryBuilder.eq('availability', filters.availability);
    }

    if (filters.skills) {
      const skills = filters.skills.split(',').map((s: string) => s.trim());
      queryBuilder = queryBuilder.overlaps('skills', skills);
    }

    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const offset = (page - 1) * limit;

    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new ApiError(500, 'Failed to search users');
    }

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ApiError(400, 'Cannot follow yourself');
    }

    const { data: existing } = await supabaseAdmin
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      throw new ConflictError('Already following this user');
    }

    const { data, error } = await supabaseAdmin
      .from('user_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to follow user');
    }

    return data;
  }

  async unfollowUser(followerId: string, followingId: string) {
    const { error } = await supabaseAdmin
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      throw new ApiError(500, 'Failed to unfollow user');
    }
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('user_follows')
      .select(`
        follower:users!follower_id(*)
      `, { count: 'exact' })
      .eq('following_id', userId)
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError(500, 'Failed to get followers');
    }

    return {
      items: data?.map((d: any) => d.follower) || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('user_follows')
      .select(`
        following:users!following_id(*)
      `, { count: 'exact' })
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError(500, 'Failed to get following');
    }

    return {
      items: data?.map((d: any) => d.following) || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new ApiError(500, 'Failed to upload avatar');
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update avatar');
    }

    return data;
  }

  async uploadBanner(userId: string, file: Express.Multer.File) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/banner.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('banners')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new ApiError(500, 'Failed to upload banner');
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('banners')
      .getPublicUrl(fileName);

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ banner_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update banner');
    }

    return data;
  }

  async getDashboardStats(userId: string) {
    const [projectsCreated, projectsJoined, pendingApps, acceptedApps] = await Promise.all([
      supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabaseAdmin.from('project_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
      supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'accepted'),
    ]);

    const { count: unreadNotifs } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      projects_created: projectsCreated.count || 0,
      projects_joined: projectsJoined.count || 0,
      applications_pending: pendingApps.count || 0,
      applications_accepted: acceptedApps.count || 0,
      unread_notifications: unreadNotifs || 0,
    };
  }
}

export const userService = new UserService();
