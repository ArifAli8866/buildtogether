import { createClient } from '@/lib/supabase/server';
import type {
  Discussion,
  DiscussionComment,
  Meeting,
  MeetingParticipant,
  MeetingNote,
  ProjectNote,
  ProjectCanvasItem,
  Profile,
} from '@/types/database';

export interface DetailedDiscussion extends Discussion {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  commentsCount: number;
}

export interface DetailedDiscussionComment extends DiscussionComment {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  replies?: DetailedDiscussionComment[];
}

export interface DetailedMeetingParticipant extends MeetingParticipant {
  profile: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface DetailedMeeting extends Meeting {
  organizer: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  participants: DetailedMeetingParticipant[];
  notes?: MeetingNote | null;
}

export interface DetailedProjectNote extends ProjectNote {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface DetailedCanvasItem extends ProjectCanvasItem {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

// ==========================================
// DISCUSSIONS QUERIES
// ==========================================

interface RawDiscussionWithComments extends Discussion {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  comments: Array<{ id: string }> | null;
}

export async function getProjectDiscussions(
  projectId: string,
  category?: string
): Promise<DetailedDiscussion[]> {
  const supabase = await createClient();

  let query = supabase
    .from('discussions')
    .select(
      `
      *,
      author:profiles!discussions_author_id_fkey(id, username, full_name, avatar_url),
      comments:discussion_comments(id)
    `
    )
    .eq('project_id', projectId);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching project discussions:', error);
    return [];
  }

  return ((data || []) as unknown as RawDiscussionWithComments[]).map((d) => ({
    ...d,
    commentsCount: Array.isArray(d.comments) ? d.comments.length : 0,
  })) as DetailedDiscussion[];
}

export async function getDiscussionById(
  discussionId: string,
  projectId: string
): Promise<DetailedDiscussion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('discussions')
    .select(
      `
      *,
      author:profiles!discussions_author_id_fkey(id, username, full_name, avatar_url),
      comments:discussion_comments(id)
    `
    )
    .eq('id', discussionId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching discussion by ID:', error);
    return null;
  }

  const raw = data as unknown as RawDiscussionWithComments;
  return {
    ...raw,
    commentsCount: Array.isArray(raw.comments) ? raw.comments.length : 0,
  } as DetailedDiscussion;
}

export async function getDiscussionComments(
  discussionId: string
): Promise<DetailedDiscussionComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('discussion_comments')
    .select(
      `
      *,
      author:profiles!discussion_comments_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching discussion comments:', error);
    return [];
  }

  const rawComments = (data || []) as unknown as DetailedDiscussionComment[];

  // Organize into a clean two-level hierarchy (top-level + nested replies)
  const commentMap = new Map<string, DetailedDiscussionComment>();
  const rootComments: DetailedDiscussionComment[] = [];

  for (const c of rawComments) {
    commentMap.set(c.id, { ...c, replies: [] });
  }

  for (const c of rawComments) {
    const node = commentMap.get(c.id)!;
    if (c.parent_comment_id && commentMap.has(c.parent_comment_id)) {
      commentMap.get(c.parent_comment_id)!.replies!.push(node);
    } else {
      rootComments.push(node);
    }
  }

  return rootComments;
}

// ==========================================
// MEETINGS QUERIES
// ==========================================

interface RawMeetingPayload extends Meeting {
  organizer: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  participants: DetailedMeetingParticipant[];
  notes: MeetingNote[] | null;
}

export async function getProjectMeetings(
  projectId: string
): Promise<DetailedMeeting[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('meetings')
    .select(
      `
      *,
      organizer:profiles!meetings_organizer_id_fkey(id, username, full_name, avatar_url),
      participants:meeting_participants(
        id,
        meeting_id,
        user_id,
        status,
        created_at,
        profile:profiles(id, username, full_name, avatar_url)
      ),
      notes:meeting_notes(id, content, decisions, action_items, created_at, updated_at)
    `
    )
    .eq('project_id', projectId)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching project meetings:', error);
    return [];
  }

  return ((data || []) as unknown as RawMeetingPayload[]).map((m) => ({
    ...m,
    notes: Array.isArray(m.notes) && m.notes.length > 0 ? m.notes[0] : null,
  })) as DetailedMeeting[];
}

export async function getMeetingById(
  meetingId: string,
  projectId: string
): Promise<DetailedMeeting | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('meetings')
    .select(
      `
      *,
      organizer:profiles!meetings_organizer_id_fkey(id, username, full_name, avatar_url),
      participants:meeting_participants(
        id,
        meeting_id,
        user_id,
        status,
        created_at,
        profile:profiles(id, username, full_name, avatar_url)
      ),
      notes:meeting_notes(id, content, decisions, action_items, created_at, updated_at)
    `
    )
    .eq('id', meetingId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching meeting by ID:', error);
    return null;
  }

  const raw = data as unknown as RawMeetingPayload;
  return {
    ...raw,
    notes: Array.isArray(raw.notes) && raw.notes.length > 0 ? raw.notes[0] : null,
  } as DetailedMeeting;
}

export async function getMeetingNotes(
  meetingId: string,
  projectId: string
): Promise<MeetingNote | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('meeting_notes')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching meeting notes:', error);
    return null;
  }

  return data as MeetingNote | null;
}

// ==========================================
// PROJECT NOTES QUERIES
// ==========================================

export async function getProjectNotes(
  projectId: string,
  category?: string
): Promise<DetailedProjectNote[]> {
  const supabase = await createClient();

  let query = supabase
    .from('project_notes')
    .select(
      `
      *,
      author:profiles!project_notes_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching project notes:', error);
    return [];
  }

  return (data || []) as unknown as DetailedProjectNote[];
}

export async function getProjectNoteById(
  noteId: string,
  projectId: string
): Promise<DetailedProjectNote | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_notes')
    .select(
      `
      *,
      author:profiles!project_notes_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('id', noteId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching note by ID:', error);
    return null;
  }

  return data as unknown as DetailedProjectNote;
}

// ==========================================
// PROJECT CANVAS QUERIES
// ==========================================

export async function getProjectCanvasItems(
  projectId: string
): Promise<DetailedCanvasItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_canvas_items')
    .select(
      `
      *,
      author:profiles!project_canvas_items_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching canvas items:', error);
    return [];
  }

  return (data || []) as unknown as DetailedCanvasItem[];
}
