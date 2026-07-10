// ============================================================
// BuildTogether - Shared Types
// ============================================================

// ─── User Types ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  country?: string;
  website?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  availability: Availability;
  timezone?: string;
  years_of_experience?: number;
  experience_level: ExperienceLevel;
  skills: string[];
  tech_stack: string[];
  languages: string[];
  is_verified: boolean;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  followers_count: number;
  following_count: number;
  projects_created_count: number;
  projects_joined_count: number;
  completed_projects_count: number;
  achievements: Achievement[];
  is_following?: boolean;
}

export type Availability = 'full_time' | 'part_time' | 'weekends' | 'flexible' | 'not_available';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// ─── Project Types ────────────────────────────────────────────
export interface Project {
  id: string;
  owner_id: string;
  name: string;
  tagline: string;
  description: string;
  long_description?: string;
  problem_statement?: string;
  solution?: string;
  tech_stack: string[];
  difficulty: Difficulty;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  estimated_duration?: string;
  repository_url?: string;
  live_demo_url?: string;
  discord_url?: string;
  figma_url?: string;
  logo_url?: string;
  screenshots: string[];
  video_demo_url?: string;
  tags: string[];
  categories: string[];
  max_team_size: number;
  current_team_size: number;
  stars_count: number;
  views_count: number;
  applications_count: number;
  is_featured: boolean;
  is_open_source: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
  roles?: ProjectRole[];
  members?: ProjectMember[];
  milestones?: Milestone[];
  is_saved?: boolean;
  is_applied?: boolean;
  is_member?: boolean;
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ProjectStatus = 'ideation' | 'planning' | 'in_progress' | 'testing' | 'launched' | 'on_hold' | 'completed';
export type ProjectVisibility = 'public' | 'private';

export interface ProjectRole {
  id: string;
  project_id: string;
  title: RoleTitle;
  description: string;
  required_skills: string[];
  experience_level: ExperienceLevel;
  vacancies: number;
  filled: number;
  priority: number;
  created_at: string;
}

export type RoleTitle =
  | 'frontend_developer'
  | 'backend_developer'
  | 'full_stack_developer'
  | 'ui_designer'
  | 'ux_designer'
  | 'flutter_developer'
  | 'react_native_developer'
  | 'ai_engineer'
  | 'devops'
  | 'qa'
  | 'project_manager';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  role_title: RoleTitle;
  joined_at: string;
  status: MemberStatus;
  user?: User;
  role?: ProjectRole;
}

export type MemberStatus = 'active' | 'inactive' | 'removed';

// ─── Application Types ───────────────────────────────────────
export interface Application {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  introduction: string;
  why_join: string;
  github_url?: string;
  portfolio_url?: string;
  hours_per_week: number;
  resume_url?: string;
  previous_projects: string[];
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  user?: User;
  project?: Project;
  role?: ProjectRole;
}

export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

// ─── Message Types ────────────────────────────────────────────
export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  reply_to_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  reply_to?: Message;
  read_by: string[];
}

export type MessageType = 'text' | 'image' | 'file' | 'code' | 'link' | 'system';

export interface Channel {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  type: ChannelType;
  created_at: string;
  last_message?: Message;
  unread_count?: number;
}

export type ChannelType = 'general' | 'announcements' | 'resources' | 'custom';

// ─── Milestone Types ─────────────────────────────────────────
export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  progress: number;
  created_at: string;
  updated_at: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

// ─── Update Types ─────────────────────────────────────────────
export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  content: string;
  images: string[];
  video_url?: string;
  code_snippet?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: User;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export interface Comment {
  id: string;
  update_id: string;
  author_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  author?: User;
  replies?: Comment[];
}

// ─── Notification Types ──────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export type NotificationType =
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_message'
  | 'project_update'
  | 'invitation'
  | 'mention'
  | 'comment'
  | 'like'
  | 'milestone_update'
  | 'new_follower';

// ─── Achievement Types ───────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earned_at: string;
}

// ─── Search Types ─────────────────────────────────────────────
export interface SearchFilters {
  query?: string;
  type?: 'projects' | 'users' | 'skills' | 'tags';
  skills?: string[];
  difficulty?: Difficulty[];
  status?: ProjectStatus[];
  categories?: string[];
  availability?: Availability[];
  experience_level?: ExperienceLevel[];
  is_remote?: boolean;
  is_open_source?: boolean;
  sort_by?: 'latest' | 'trending' | 'most_active' | 'most_members';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ─── Dashboard Types ─────────────────────────────────────────
export interface DashboardStats {
  projects_created: number;
  projects_joined: number;
  applications_pending: number;
  applications_accepted: number;
  total_stars: number;
  total_views: number;
  unread_messages: number;
  unread_notifications: number;
  profile_completion: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ─── API Types ────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ─── Form Types ──────────────────────────────────────────────
export interface CreateProjectForm {
  name: string;
  tagline: string;
  description: string;
  long_description?: string;
  problem_statement?: string;
  solution?: string;
  tech_stack: string[];
  difficulty: Difficulty;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  estimated_duration?: string;
  repository_url?: string;
  live_demo_url?: string;
  discord_url?: string;
  figma_url?: string;
  logo?: File;
  screenshots?: File[];
  video_demo_url?: string;
  tags: string[];
  categories: string[];
  max_team_size: number;
  is_open_source: boolean;
  roles: CreateProjectRoleForm[];
}

export interface CreateProjectRoleForm {
  title: RoleTitle;
  description: string;
  required_skills: string[];
  experience_level: ExperienceLevel;
  vacancies: number;
  priority: number;
}

export interface ApplicationForm {
  role_id: string;
  introduction: string;
  why_join: string;
  github_url?: string;
  portfolio_url?: string;
  hours_per_week: number;
  resume?: File;
  previous_projects: string[];
}

export interface UpdateProfileForm {
  full_name?: string;
  username?: string;
  bio?: string;
  country?: string;
  website?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  availability?: Availability;
  timezone?: string;
  years_of_experience?: number;
  experience_level?: ExperienceLevel;
  skills?: string[];
  tech_stack?: string[];
  languages?: string[];
  avatar?: File;
  banner?: File;
}

// ─── Auth Types ──────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupCredentials {
  email: string;
  password: string;
  full_name: string;
  username: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  current_password: string;
  new_password: string;
}

// ─── Settings Types ──────────────────────────────────────────
export interface NotificationSettings {
  email_applications: boolean;
  email_messages: boolean;
  email_updates: boolean;
  email_mentions: boolean;
  push_applications: boolean;
  push_messages: boolean;
  push_updates: boolean;
  push_mentions: boolean;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'connections';
  show_email: boolean;
  show_online_status: boolean;
  allow_messages_from: 'everyone' | 'connections' | 'nobody';
}
