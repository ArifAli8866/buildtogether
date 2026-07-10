import { supabaseAdmin } from '../config/supabase';
import { ApiError, NotFoundError, ForbiddenError, ConflictError } from '../middleware';

export class ProjectService {
  async createProject(userId: string, data: any) {
    const { roles, ...projectData } = data;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        ...projectData,
        owner_id: userId,
        current_team_size: 1,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to create project');
    }

    // Create roles
    if (roles && roles.length > 0) {
      const rolesData = roles.map((role: any) => ({
        ...role,
        project_id: project.id,
        filled: 0,
      }));

      const { error: rolesError } = await supabaseAdmin
        .from('project_roles')
        .insert(rolesData);

      if (rolesError) {
        console.error('Failed to create roles:', rolesError);
      }
    }

    // Add owner as member
    await supabaseAdmin.from('project_members').insert({
      project_id: project.id,
      user_id: userId,
      role_title: 'project_manager',
      status: 'active',
    });

    // Create default channels
    await supabaseAdmin.from('channels').insert([
      { project_id: project.id, name: 'general', type: 'general' },
      { project_id: project.id, name: 'announcements', type: 'announcements' },
      { project_id: project.id, name: 'resources', type: 'resources' },
    ]);

    return project;
  }

  async getProject(projectId: string, userId?: string) {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(*),
        roles:project_roles(*),
        members:project_members(*, user:users(*)),
        milestones:milestones(*)
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      throw new NotFoundError('Project not found');
    }

    // Increment views
    await supabaseAdmin
      .from('projects')
      .update({ views_count: (project.views_count || 0) + 1 })
      .eq('id', projectId);

    // Check user interactions if authenticated
    if (userId) {
      const [saved, applied, member] = await Promise.all([
        supabaseAdmin.from('saved_projects').select('id').eq('user_id', userId).eq('project_id', projectId).single(),
        supabaseAdmin.from('applications').select('id').eq('user_id', userId).eq('project_id', projectId).single(),
        supabaseAdmin.from('project_members').select('id').eq('user_id', userId).eq('project_id', projectId).single(),
      ]);

      project.is_saved = !!saved.data;
      project.is_applied = !!applied.data;
      project.is_member = !!member.data;
    }

    return project;
  }

  async listProjects(filters: any = {}, userId?: string) {
    let queryBuilder = supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(id, full_name, username, avatar_url, experience_level)
      `, { count: 'exact' });

    // Text search
    if (filters.q) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${filters.q}%,tagline.ilike.%${filters.q}%,description.ilike.%${filters.q}%`
      );
    }

    // Filters
    if (filters.difficulty) {
      const difficulties = filters.difficulty.split(',');
      queryBuilder = queryBuilder.in('difficulty', difficulties);
    }

    if (filters.status) {
      const statuses = filters.status.split(',');
      queryBuilder = queryBuilder.in('status', statuses);
    }

    if (filters.categories) {
      const cats = filters.categories.split(',').map((c: string) => c.trim());
      queryBuilder = queryBuilder.overlaps('categories', cats);
    }

    if (filters.tech_stack) {
      const techs = filters.tech_stack.split(',').map((t: string) => t.trim());
      queryBuilder = queryBuilder.overlaps('tech_stack', techs);
    }

    if (filters.is_open_source === 'true') {
      queryBuilder = queryBuilder.eq('is_open_source', true);
    }

    if (filters.is_remote === 'true') {
      queryBuilder = queryBuilder.not('estimated_duration', 'is', null);
    }

    // Default: only public projects
    queryBuilder = queryBuilder.eq('visibility', 'public');

    // Sorting
    const sortBy = filters.sort_by || 'latest';
    switch (sortBy) {
      case 'trending':
        queryBuilder = queryBuilder.order('stars_count', { ascending: false });
        break;
      case 'most_active':
        queryBuilder = queryBuilder.order('views_count', { ascending: false });
        break;
      case 'most_members':
        queryBuilder = queryBuilder.order('current_team_size', { ascending: false });
        break;
      default:
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    // Pagination
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '12');
    const offset = (page - 1) * limit;
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new ApiError(500, 'Failed to fetch projects');
    }

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    };
  }

  async updateProject(projectId: string, userId: string, updates: any) {
    // Verify ownership
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError('Not authorized to update this project');
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to update project');
    }

    return data;
  }

  async deleteProject(projectId: string, userId: string) {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError('Not authorized to delete this project');
    }

    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new ApiError(500, 'Failed to delete project');
    }
  }

  async applyToProject(projectId: string, userId: string, application: any) {
    // Check if already applied
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new ConflictError('Already applied to this project');
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        project_id: projectId,
        user_id: userId,
        ...application,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to submit application');
    }

    // Increment applications count
    await supabaseAdmin.rpc('increment_column', {
      table_name: 'projects',
      column_name: 'applications_count',
      row_id: projectId,
    });

    return data;
  }

  async handleApplication(applicationId: string, userId: string, action: 'accept' | 'reject' | 'shortlist') {
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('*, project:projects!project_id(owner_id)')
      .eq('id', applicationId)
      .single();

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if ((application as any).project.owner_id !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    const statusMap = {
      accept: 'accepted',
      reject: 'rejected',
      shortlist: 'shortlisted',
    };

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update({ status: statusMap[action], updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, `Failed to ${action} application`);
    }

    // If accepted, add as member
    if (action === 'accept') {
      await supabaseAdmin.from('project_members').insert({
        project_id: application.project_id,
        user_id: application.user_id,
        role_id: application.role_id,
        role_title: (await supabaseAdmin.from('project_roles').select('title').eq('id', application.role_id).single()).data?.title || 'full_stack_developer',
        status: 'active',
      });

      // Update team size
      await supabaseAdmin.rpc('increment_column', {
        table_name: 'projects',
        column_name: 'current_team_size',
        row_id: application.project_id,
      });
    }

    return data;
  }

  async getApplications(projectId: string, userId: string, status?: string) {
    // Verify ownership
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();

    if (!project || project.owner_id !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    let queryBuilder = supabaseAdmin
      .from('applications')
      .select(`
        *,
        user:users(*),
        role:project_roles(*)
      `)
      .eq('project_id', projectId);

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      throw new ApiError(500, 'Failed to fetch applications');
    }

    return data;
  }

  async toggleSaveProject(projectId: string, userId: string) {
    const { data: existing } = await supabaseAdmin
      .from('saved_projects')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    if (existing) {
      await supabaseAdmin.from('saved_projects').delete().eq('id', existing.id);
      return { saved: false };
    }

    await supabaseAdmin.from('saved_projects').insert({
      user_id: userId,
      project_id: projectId,
    });

    return { saved: true };
  }

  async toggleStarProject(projectId: string, userId: string) {
    const { data: existing } = await supabaseAdmin
      .from('project_stars')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    if (existing) {
      await supabaseAdmin.from('project_stars').delete().eq('id', existing.id);
      await supabaseAdmin.rpc('decrement_column', {
        table_name: 'projects',
        column_name: 'stars_count',
        row_id: projectId,
      });
      return { starred: false };
    }

    await supabaseAdmin.from('project_stars').insert({
      user_id: userId,
      project_id: projectId,
    });
    await supabaseAdmin.rpc('increment_column', {
      table_name: 'projects',
      column_name: 'stars_count',
      row_id: projectId,
    });

    return { starred: true };
  }

  async getFeaturedProjects(limit = 6) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(id, full_name, username, avatar_url)
      `)
      .eq('is_featured', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError(500, 'Failed to fetch featured projects');
    }

    return data;
  }

  async getUserProjects(userId: string, type: 'created' | 'joined' | 'saved' = 'created') {
    switch (type) {
      case 'created':
        const { data: created } = await supabaseAdmin
          .from('projects')
          .select('*, owner:users!owner_id(*)')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });
        return created || [];

      case 'joined':
        const { data: joined } = await supabaseAdmin
          .from('project_members')
          .select('project:projects(*, owner:users!owner_id(*))')
          .eq('user_id', userId)
          .eq('status', 'active');
        return joined?.map((j: any) => j.project) || [];

      case 'saved':
        const { data: saved } = await supabaseAdmin
          .from('saved_projects')
          .select('project:projects(*, owner:users!owner_id(*))')
          .eq('user_id', userId);
        return saved?.map((s: any) => s.project) || [];

      default:
        return [];
    }
  }
}

export const projectService = new ProjectService();
