export type ProjectStatus = "idea" | "in_progress" | "completed";
export type RequestStatus = "pending" | "accepted" | "rejected";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  status: ProjectStatus;
  repo_url: string | null;
  cover_color: string | null;
  created_at: string;
  owner?: Profile;
  team_members?: TeamMember[];
  member_count?: number;
}

export interface JoinRequest {
  id: string;
  project_id: string;
  user_id: string;
  message: string;
  status: RequestStatus;
  created_at: string;
  requester?: Profile;
  project?: Project;
}

export interface TeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Profile;
}

export interface DiscussionMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  created_at: string;
  assignee?: Profile;
}

export interface ProgressUpdate {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}
