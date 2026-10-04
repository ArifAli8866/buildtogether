/**
 * Supabase Database TypeScript Definitions
 * Automatically maps to the public schema in supabase/migrations/20261003000000_initial_schema.sql
 */

export type ProjectStage = 'idea' | 'planning' | 'in_development' | 'testing' | 'shipped';
export type ProjectVisibility = 'public' | 'private';
export type ProjectMemberRole = 'owner' | 'maintainer' | 'contributor' | 'viewer';
export type ProjectRoleStatus = 'open' | 'filled' | 'closed';
export type ContributionRequestStatus =
  | 'pending'
  | 'under_review'
  | 'info_requested'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CodeReviewStatus = 'draft' | 'review' | 'changes_requested' | 'approved' | 'merged';
export type CodeReviewChangeType = 'added' | 'modified' | 'deleted';
export type CommunityPostType =
  | 'project_announcement'
  | 'recruitment'
  | 'technical_discussion'
  | 'project_update'
  | 'question'
  | 'achievement'
  | 'learning';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type CanvasItemType = 'sticky_note' | 'idea' | 'risk' | 'tech_stack' | 'decision';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  timezone: string;
  availability_hours_per_week: number;
  github_username: string | null;
  portfolio_url: string | null;
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ProfileExperience {
  id: string;
  profile_id: string;
  title: string;
  company_or_project: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

export interface Technology {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface UserConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  problem_statement: string;
  proposed_solution: string;
  category: string;
  stage: ProjectStage;
  visibility: ProjectVisibility;
  owner_id: string;
  logo_url: string | null;
  banner_url: string | null;
  collaboration_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTechnology {
  project_id: string;
  technology_id: string;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  title: string;
  description: string;
  required_skills: string[];
  capacity_count: number;
  filled_count: number;
  commitment_hours_per_week: number;
  status: ProjectRoleStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role_id: string | null;
  role: ProjectMemberRole;
  joined_at: string;
  created_at: string;
}

export interface ContributionRequest {
  id: string;
  project_id: string;
  project_role_id: string | null;
  applicant_id: string;
  pitch: string;
  portfolio_links: string[];
  weekly_hours: number;
  status: ContributionRequestStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'blocked';
  target_date: string | null;
  target_quarter: string | null;
  goal_id: string | null;
  milestone_id: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  goal_id: string | null;
  title: string;
  description: string;
  creator_id: string;
  assignee_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimate_hours: number | null;
  due_date: string | null;
  position: number;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Discussion {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscussionComment {
  id: string;
  discussion_id: string;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCanvasItem {
  id: string;
  project_id: string;
  author_id: string;
  item_type: CanvasItemType;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingParticipantStatus = 'attending' | 'declined' | 'tentative';

export interface Meeting {
  id: string;
  project_id: string;
  organizer_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  status: MeetingParticipantStatus;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  project_id: string;
  author_id: string;
  content: string;
  decisions: string;
  action_items: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  uploader_id: string;
  bucket_name: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  folder_path: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeSnippet {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  file_path: string;
  language: string;
  code_content: string;
  created_at: string;
  updated_at: string;
}

export interface CodeReview {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  summary: string;
  base_branch: string;
  target_branch: string;
  status: CodeReviewStatus;
  github_pr_url: string | null;
  github_pr_number?: number | null;
  github_pr_status?: string | null;
  github_head_branch?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeReviewFile {
  id: string;
  code_review_id: string;
  file_path: string;
  change_type: CodeReviewChangeType;
  old_content: string | null;
  new_content: string;
  created_at: string;
}

export interface CodeReviewComment {
  id: string;
  code_review_id: string;
  code_review_file_id: string;
  author_id: string;
  parent_comment_id: string | null;
  line_number: number | null;
  diff_side: 'left' | 'right' | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CodeReviewDecision {
  id: string;
  code_review_id: string;
  reviewer_id: string;
  decision: CodeReviewStatus;
  notes: string | null;
  created_at: string;
}

export interface UserGithubAccount {
  id: string;
  user_id: string;
  github_user_id: number;
  github_username: string;
  avatar_url: string | null;
  encrypted_access_token: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectGithubRepo {
  id: string;
  project_id: string;
  connected_by: string;
  repo_id: number;
  repo_owner: string;
  repo_name: string;
  repo_full_name: string;
  is_private: boolean;
  html_url: string | null;
  description: string | null;
  default_branch: string;
  encrypted_access_token: string;
  webhook_id: number | null;
  sync_status: string;
  branches_cached: string[];
  open_issues_count: number;
  stars_count: number;
  forks_count: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitizedUserGithubAccount {
  id: string;
  githubUsername: string;
  avatarUrl: string | null;
  connectedAt: string;
}

export interface SanitizedProjectGithubRepo
  extends Omit<ProjectGithubRepo, 'encrypted_access_token'> {
  isConnected: boolean;
}

export interface GithubWebhookEvent {
  id: string;
  delivery_id: string;
  event_type: string;
  repo_id: number | null;
  project_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  error_message: string | null;
  processed_at: string;
  created_at: string;
}

export interface GitHubRepoOption {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  is_private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubBranchInfo {
  name: string;
  commit_sha: string;
  protected: boolean;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  author_name: string;
  author_date: string;
  html_url: string;
}

export interface GitHubPullRequestInfo {
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  user_login: string;
  user_avatar_url: string | null;
  created_at: string;
  merged_at: string | null;
  head_branch: string;
  base_branch: string;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  project_id: string | null;
  post_type: CommunityPostType;
  title: string;
  content: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  entity_type: string;
  entity_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostSave {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityPostWithAuthor extends CommunityPost {
  author: Profile;
  project?: {
    id: string;
    slug: string;
    title: string;
    logo_url: string | null;
  } | null;
  has_liked?: boolean;
  has_saved?: boolean;
}

export interface PostCommentWithAuthor extends PostComment {
  author: Profile;
  replies?: PostCommentWithAuthor[];
}

export interface UserConnectionWithProfiles extends UserConnection {
  requester: Profile;
  recipient: Profile;
}

export interface NotificationWithActor extends Notification {
  actor: Profile | null;
}

export interface ConnectionStateResult {
  state: 'none' | 'pending' | 'connected';
  connectionId?: string;
  isRequester?: boolean;
}

export interface DeveloperWithRelevance {
  profile: Profile;
  skills: Skill[];
  technologies: Technology[];
  connectionState: ConnectionStateResult;
  sharedSkills: string[];
  sharedTech: string[];
  isAvailabilityCompatible: boolean;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type SearchEntityType = 'all' | 'projects' | 'developers' | 'posts' | 'tasks';

export interface ProjectSearchItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  stage: string;
  visibility: string;
  logo_url: string | null;
  owner?: {
    username: string;
    full_name: string;
  };
}

export interface DeveloperSearchItem {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  timezone: string;
  availability_hours_per_week: number;
  skills: string[];
  technologies: string[];
}

export interface PostSearchItem {
  id: string;
  title: string;
  content: string;
  post_type: CommunityPostType;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  project?: {
    slug: string;
    title: string;
  } | null;
}

export interface TaskSearchItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  project: {
    id: string;
    slug: string;
    title: string;
  };
}

export interface GlobalSearchResponse {
  query: string;
  totalCount: number;
  projects: ProjectSearchItem[];
  developers: DeveloperSearchItem[];
  posts: PostSearchItem[];
  tasks: TaskSearchItem[];
}
