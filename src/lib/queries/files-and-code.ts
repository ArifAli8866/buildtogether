import { createClient } from '@/lib/supabase/server';
import type {
  ProjectFile,
  CodeSnippet,
  CodeReview,
  CodeReviewFile,
  CodeReviewComment,
  CodeReviewDecision,
  CodeReviewStatus,
  Profile,
} from '@/types/database';

export interface DetailedProjectFile extends ProjectFile {
  uploader: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface DetailedCodeSnippet extends CodeSnippet {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface DetailedCodeReviewFile extends CodeReviewFile {
  comments?: DetailedCodeReviewComment[];
}

export interface DetailedCodeReviewComment extends CodeReviewComment {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  replies?: DetailedCodeReviewComment[];
}

export interface DetailedCodeReviewDecision extends CodeReviewDecision {
  reviewer: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
}

export interface DetailedCodeReviewSummary extends CodeReview {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  filesCount: number;
  commentsCount: number;
}

export interface DetailedCodeReview extends CodeReview {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  files: DetailedCodeReviewFile[];
  comments: DetailedCodeReviewComment[];
  decisions: DetailedCodeReviewDecision[];
}

// ==========================================
// FILES QUERIES
// ==========================================

export async function getProjectFiles(
  projectId: string,
  folderPath?: string
): Promise<DetailedProjectFile[]> {
  const supabase = await createClient();

  let query = supabase
    .from('project_files')
    .select(
      `
      *,
      uploader:profiles!project_files_uploader_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId);

  if (folderPath && folderPath !== 'all') {
    query = query.eq('folder_path', folderPath);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching project files:', error);
    return [];
  }

  return (data || []) as unknown as DetailedProjectFile[];
}

export async function getProjectFolders(projectId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_files')
    .select('folder_path')
    .eq('project_id', projectId);

  if (error || !data) return ['/'];

  const unique = Array.from(new Set(['/', ...data.map((d) => d.folder_path || '/')])).sort();
  return unique;
}

export async function getProjectFileById(
  fileId: string,
  projectId: string
): Promise<DetailedProjectFile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_files')
    .select(
      `
      *,
      uploader:profiles!project_files_uploader_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('id', fileId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching file by ID:', error);
    return null;
  }

  return data as unknown as DetailedProjectFile;
}

// ==========================================
// CODE SNIPPETS QUERIES
// ==========================================

export async function getProjectCodeSnippets(
  projectId: string
): Promise<DetailedCodeSnippet[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('code_snippets')
    .select(
      `
      *,
      author:profiles!code_snippets_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching code snippets:', error);
    return [];
  }

  return (data || []) as unknown as DetailedCodeSnippet[];
}

export async function getCodeSnippetById(
  snippetId: string,
  projectId: string
): Promise<DetailedCodeSnippet | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('code_snippets')
    .select(
      `
      *,
      author:profiles!code_snippets_author_id_fkey(id, username, full_name, avatar_url)
    `
    )
    .eq('id', snippetId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching code snippet by ID:', error);
    return null;
  }

  return data as unknown as DetailedCodeSnippet;
}

// ==========================================
// CODE REVIEWS QUERIES
// ==========================================

interface RawReviewSummary extends CodeReview {
  author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
  files: Array<{ id: string }> | null;
  comments: Array<{ id: string }> | null;
}

export async function getProjectCodeReviews(
  projectId: string,
  status?: CodeReviewStatus | 'all'
): Promise<DetailedCodeReviewSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('code_reviews')
    .select(
      `
      *,
      author:profiles!code_reviews_author_id_fkey(id, username, full_name, avatar_url),
      files:code_review_files(id),
      comments:code_review_comments(id)
    `
    )
    .eq('project_id', projectId);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching code reviews:', error);
    return [];
  }

  return ((data || []) as unknown as RawReviewSummary[]).map((r) => ({
    ...r,
    filesCount: Array.isArray(r.files) ? r.files.length : 0,
    commentsCount: Array.isArray(r.comments) ? r.comments.length : 0,
  })) as DetailedCodeReviewSummary[];
}

export async function getCodeReviewById(
  reviewId: string,
  projectId: string
): Promise<DetailedCodeReview | null> {
  const supabase = await createClient();

  const [reviewRes, filesRes, commentsRes, decisionsRes] = await Promise.all([
    supabase
      .from('code_reviews')
      .select(
        `
        *,
        author:profiles!code_reviews_author_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .eq('id', reviewId)
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('code_review_files')
      .select('*')
      .eq('code_review_id', reviewId)
      .order('file_path', { ascending: true }),
    supabase
      .from('code_review_comments')
      .select(
        `
        *,
        author:profiles!code_review_comments_author_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .eq('code_review_id', reviewId)
      .order('created_at', { ascending: true }),
    supabase
      .from('code_review_decisions')
      .select(
        `
        *,
        reviewer:profiles!code_review_decisions_reviewer_id_fkey(id, username, full_name, avatar_url)
      `
      )
      .eq('code_review_id', reviewId)
      .order('created_at', { ascending: false }),
  ]);

  if (reviewRes.error || !reviewRes.data) {
    if (reviewRes.error) console.error('Error fetching code review:', reviewRes.error);
    return null;
  }

  const rawComments = (commentsRes.data || []) as unknown as DetailedCodeReviewComment[];
  // Build two-level hierarchy for comments
  const commentMap = new Map<string, DetailedCodeReviewComment>();
  const rootComments: DetailedCodeReviewComment[] = [];

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

  const files = (filesRes.data || []) as DetailedCodeReviewFile[];
  const decisions = (decisionsRes.data || []) as unknown as DetailedCodeReviewDecision[];

  return {
    ...(reviewRes.data as unknown as CodeReview),
    author: (reviewRes.data as unknown as { author: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'> }).author,
    files,
    comments: rootComments,
    decisions,
  };
}
