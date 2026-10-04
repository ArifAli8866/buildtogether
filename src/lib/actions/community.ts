'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/api';
import type { CommunityPost, PostComment, UserConnection } from '@/types/database';
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  togglePostLikeSchema,
  togglePostSaveSchema,
  createPostCommentSchema,
  deletePostCommentSchema,
  sendConnectionRequestSchema,
  respondConnectionRequestSchema,
  removeConnectionSchema,
  markNotificationReadSchema,
  type CreatePostInput,
  type UpdatePostInput,
  type DeletePostInput,
  type TogglePostLikeInput,
  type TogglePostSaveInput,
  type CreatePostCommentInput,
  type DeletePostCommentInput,
  type SendConnectionRequestInput,
  type RespondConnectionRequestInput,
  type RemoveConnectionInput,
  type MarkNotificationReadInput,
} from '@/lib/validators/community';
import {
  createNotification,
  notifyMentions,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications/service';

// ==========================================
// COMMUNITY POSTS ACTIONS
// ==========================================

export async function createPostAction(
  input: CreatePostInput
): Promise<ActionResult<CommunityPost>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to create a post.' },
      };
    }

    const validation = createPostSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post details.',
          details: validation.error.flatten().fieldErrors,
        },
      };
    }

    const { title, content, post_type, project_id, tags } = validation.data;

    // If project_id is provided, verify author is an accepted member or owner of the project
    if (project_id) {
      const [memberRes, projectRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('id')
          .eq('project_id', project_id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('projects')
          .select('owner_id')
          .eq('id', project_id)
          .maybeSingle(),
      ]);

      const isMember = Boolean(memberRes.data);
      const isOwner = projectRes.data?.owner_id === user.id;

      if (!isMember && !isOwner) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to associate posts with this project.',
          },
        };
      }
    }

    const { data: post, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        author_id: user.id,
        project_id: project_id || null,
        post_type,
        title,
        content,
        tags: tags || [],
      })
      .select()
      .single();

    if (insertError || !post) {
      console.error('Failed to create community post:', insertError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to publish post. Please try again.' },
      };
    }

    // Fetch author profile for mention notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.username) {
      // Process @mentions asynchronously
      await notifyMentions({
        text: content,
        actorId: user.id,
        actorUsername: profile.username,
        entityType: 'post',
        entityId: post.id,
        contextTitle: title,
        customClient: supabase,
      });
    }

    revalidatePath('/feed');
    return { success: true, data: post as CommunityPost };
  } catch (err) {
    console.error('Unexpected error in createPostAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function updatePostAction(
  input: UpdatePostInput
): Promise<ActionResult<CommunityPost>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to edit a post.' },
      };
    }

    const validation = updatePostSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post details.',
          details: validation.error.flatten().fieldErrors,
        },
      };
    }

    const { postId, title, content, post_type, project_id, tags } = validation.data;

    // Verify existing post and author ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (fetchError || !existingPost) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found.' },
      };
    }

    if (existingPost.author_id !== user.id) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only edit your own posts.' },
      };
    }

    // Verify project authorization if project_id changed or set
    if (project_id && project_id !== existingPost.project_id) {
      const [memberRes, projectRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('id')
          .eq('project_id', project_id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('projects')
          .select('owner_id')
          .eq('id', project_id)
          .maybeSingle(),
      ]);

      if (!memberRes.data && projectRes.data?.owner_id !== user.id) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to associate posts with this project.',
          },
        };
      }
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('community_posts')
      .update({
        title,
        content,
        post_type,
        project_id: project_id || null,
        tags: tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateError || !updatedPost) {
      console.error('Failed to update post:', updateError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update post.' },
      };
    }

    revalidatePath('/feed');
    revalidatePath(`/feed/${postId}`);
    return { success: true, data: updatedPost as CommunityPost };
  } catch (err) {
    console.error('Unexpected error in updatePostAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function deletePostAction(
  input: DeletePostInput
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to delete a post.' },
      };
    }

    const validation = deletePostSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid post ID.' },
      };
    }

    const { postId } = validation.data;

    const { data: existingPost, error: fetchError } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle();

    if (fetchError || !existingPost) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found.' },
      };
    }

    if (existingPost.author_id !== user.id) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own posts.' },
      };
    }

    const { error: deleteError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Failed to delete post:', deleteError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete post.' },
      };
    }

    revalidatePath('/feed');
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error('Unexpected error in deletePostAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

// ==========================================
// POST LIKES & SAVES ACTIONS
// ==========================================

export async function togglePostLikeAction(
  input: TogglePostLikeInput
): Promise<ActionResult<{ hasLiked: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to like a post.' },
      };
    }

    const validation = togglePostLikeSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid post ID.' },
      };
    }

    const { postId } = validation.data;

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('id, title, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found.' },
      };
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      revalidatePath('/feed');
      revalidatePath(`/feed/${postId}`);
      return { success: true, data: { hasLiked: false } };
    }

    // Like
    const { error: insertError } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id });

    if (insertError) {
      console.error('Failed to like post:', insertError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to like post.' },
      };
    }

    // Notify author if not self-like
    if (post.author_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();

      const name = profile?.full_name || profile?.username || 'Someone';
      await createNotification(
        {
          recipientId: post.author_id,
          actorId: user.id,
          type: 'post_like',
          entityType: 'post',
          entityId: post.id,
          title: `${name} liked your post`,
          message: `"${post.title}"`,
        },
        supabase
      );
    }

    revalidatePath('/feed');
    revalidatePath(`/feed/${postId}`);
    return { success: true, data: { hasLiked: true } };
  } catch (err) {
    console.error('Unexpected error in togglePostLikeAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function togglePostSaveAction(
  input: TogglePostSaveInput
): Promise<ActionResult<{ hasSaved: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to save a post.' },
      };
    }

    const validation = togglePostSaveSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid post ID.' },
      };
    }

    const { postId } = validation.data;

    // Check if post exists
    const { data: post } = await supabase
      .from('community_posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found.' },
      };
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('post_saves')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSave) {
      // Unsave
      await supabase
        .from('post_saves')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      revalidatePath('/feed');
      revalidatePath(`/feed/${postId}`);
      return { success: true, data: { hasSaved: false } };
    }

    // Save
    const { error: insertError } = await supabase
      .from('post_saves')
      .insert({ post_id: postId, user_id: user.id });

    if (insertError) {
      console.error('Failed to save post:', insertError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save post.' },
      };
    }

    revalidatePath('/feed');
    revalidatePath(`/feed/${postId}`);
    return { success: true, data: { hasSaved: true } };
  } catch (err) {
    console.error('Unexpected error in togglePostSaveAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

// ==========================================
// COMMENTS ACTIONS
// ==========================================

export async function createPostCommentAction(
  input: CreatePostCommentInput
): Promise<ActionResult<PostComment>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to comment.' },
      };
    }

    const validation = createPostCommentSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid comment content.',
          details: validation.error.flatten().fieldErrors,
        },
      };
    }

    const { postId, content, parentId } = validation.data;

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('id, title, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found.' },
      };
    }

    // If parentId provided, verify parent comment exists on same post
    let parentComment: { id: string; author_id: string } | null = null;
    if (parentId) {
      const { data: parent } = await supabase
        .from('post_comments')
        .select('id, author_id, post_id')
        .eq('id', parentId)
        .maybeSingle();

      if (!parent || parent.post_id !== postId) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Parent comment does not exist on this post.' },
        };
      }
      parentComment = parent;
    }

    const { data: comment, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        parent_id: parentId || null,
        content,
      })
      .select()
      .single();

    if (insertError || !comment) {
      console.error('Failed to create comment:', insertError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit comment.' },
      };
    }

    // Fetch commenter profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const authorName = profile?.full_name || profile?.username || 'Someone';

    // 1. Notify post author (if commenter is not post author)
    if (post.author_id !== user.id) {
      await createNotification(
        {
          recipientId: post.author_id,
          actorId: user.id,
          type: 'post_comment',
          entityType: 'post',
          entityId: post.id,
          title: `${authorName} commented on your post`,
          message: `"${content.length > 80 ? content.slice(0, 77) + '...' : content}"`,
        },
        supabase
      );
    }

    // 2. Notify parent comment author if reply and different from post author and replier
    if (
      parentComment &&
      parentComment.author_id !== user.id &&
      parentComment.author_id !== post.author_id
    ) {
      await createNotification(
        {
          recipientId: parentComment.author_id,
          actorId: user.id,
          type: 'comment_reply',
          entityType: 'comment',
          entityId: comment.id,
          title: `${authorName} replied to your comment`,
          message: `"${content.length > 80 ? content.slice(0, 77) + '...' : content}"`,
        },
        supabase
      );
    }

    // 3. Notify mentioned users
    if (profile?.username) {
      await notifyMentions({
        text: content,
        actorId: user.id,
        actorUsername: profile.username,
        entityType: 'comment',
        entityId: comment.id,
        contextTitle: post.title,
        customClient: supabase,
      });
    }

    revalidatePath(`/feed/${postId}`);
    revalidatePath('/feed');
    return { success: true, data: comment as PostComment };
  } catch (err) {
    console.error('Unexpected error in createPostCommentAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function deletePostCommentAction(
  input: DeletePostCommentInput
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to delete a comment.' },
      };
    }

    const validation = deletePostCommentSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid comment ID.' },
      };
    }

    const { commentId } = validation.data;

    const { data: existingComment, error: fetchError } = await supabase
      .from('post_comments')
      .select('author_id, post_id')
      .eq('id', commentId)
      .maybeSingle();

    if (fetchError || !existingComment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Comment not found.' },
      };
    }

    if (existingComment.author_id !== user.id) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own comments.' },
      };
    }

    const { error: deleteError } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Failed to delete comment:', deleteError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete comment.' },
      };
    }

    revalidatePath(`/feed/${existingComment.post_id}`);
    revalidatePath('/feed');
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error('Unexpected error in deletePostCommentAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

// ==========================================
// DEVELOPER NETWORK & CONNECTIONS ACTIONS
// ==========================================

export async function sendConnectionRequestAction(
  input: SendConnectionRequestInput
): Promise<ActionResult<UserConnection>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to send connection requests.' },
      };
    }

    const validation = sendConnectionRequestSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid recipient ID.' },
      };
    }

    const { recipientId } = validation.data;

    // Guard against self-connections
    if (recipientId === user.id) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'You cannot connect with yourself.' },
      };
    }

    // Verify recipient profile exists
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipientId)
      .maybeSingle();

    if (!recipientProfile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Developer profile not found.' },
      };
    }

    // Check existing connection in either direction
    const { data: existing } = await supabase
      .from('user_connections')
      .select('id, requester_id, recipient_id, status')
      .or(
        `and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'You are already connected with this developer.' },
        };
      }
      if (existing.status === 'pending') {
        if (existing.requester_id === user.id) {
          return {
            success: false,
            error: { code: 'CONFLICT', message: 'Connection request is already pending.' },
          };
        } else {
          // The other user had already sent a request; auto-accept it!
          const { data: accepted, error: acceptError } = await supabase
            .from('user_connections')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

          if (acceptError || !accepted) {
            return {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Failed to accept existing connection request.' },
            };
          }

          revalidatePath('/network');
          return { success: true, data: accepted as UserConnection };
        }
      }
      if (existing.status === 'declined') {
        // Allow resetting a declined connection back to pending
        const { data: renewed, error: renewError } = await supabase
          .from('user_connections')
          .update({
            requester_id: user.id,
            recipient_id: recipientId,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (renewError || !renewed) {
          return {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to send connection request.' },
          };
        }

        revalidatePath('/network');
        return { success: true, data: renewed as UserConnection };
      }
    }

    // Insert new connection request
    const { data: connection, error: insertError } = await supabase
      .from('user_connections')
      .insert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !connection) {
      console.error('Failed to insert connection request:', insertError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send connection request.' },
      };
    }

    // Notify recipient
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const requesterName =
      requesterProfile?.full_name || requesterProfile?.username || 'A developer';

    await createNotification(
      {
        recipientId,
        actorId: user.id,
        type: 'connection_request',
        entityType: 'connection',
        entityId: connection.id,
        title: 'New Connection Request',
        message: `${requesterName} wants to connect with you.`,
      },
      supabase
    );

    revalidatePath('/network');
    return { success: true, data: connection as UserConnection };
  } catch (err) {
    console.error('Unexpected error in sendConnectionRequestAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function respondConnectionRequestAction(
  input: RespondConnectionRequestInput
): Promise<ActionResult<{ status: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to respond to connection requests.' },
      };
    }

    const validation = respondConnectionRequestSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid response data.' },
      };
    }

    const { connectionId, action } = validation.data;

    // Verify connection exists and current user is recipient
    const { data: connection, error: fetchError } = await supabase
      .from('user_connections')
      .select('id, requester_id, recipient_id, status')
      .eq('id', connectionId)
      .maybeSingle();

    if (fetchError || !connection) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection request not found.' },
      };
    }

    if (connection.recipient_id !== user.id) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only respond to requests sent to you.' },
      };
    }

    if (connection.status !== 'pending') {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'This connection request is no longer pending.' },
      };
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const { error: updateError } = await supabase
      .from('user_connections')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection status:', updateError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update connection request.' },
      };
    }

    // If accepted, notify the requester
    if (action === 'accept') {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();

      const name = recipientProfile?.full_name || recipientProfile?.username || 'A developer';

      await createNotification(
        {
          recipientId: connection.requester_id,
          actorId: user.id,
          type: 'connection_accepted',
          entityType: 'connection',
          entityId: connection.id,
          title: 'Connection Accepted',
          message: `${name} accepted your connection request.`,
        },
        supabase
      );
    }

    revalidatePath('/network');
    return { success: true, data: { status: newStatus } };
  } catch (err) {
    console.error('Unexpected error in respondConnectionRequestAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function removeConnectionAction(
  input: RemoveConnectionInput
): Promise<ActionResult<{ removed: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in to manage connections.' },
      };
    }

    const validation = removeConnectionSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid connection ID.' },
      };
    }

    const { connectionId } = validation.data;

    // Verify user is a participant of the connection
    const { data: connection, error: fetchError } = await supabase
      .from('user_connections')
      .select('id, requester_id, recipient_id')
      .eq('id', connectionId)
      .maybeSingle();

    if (fetchError || !connection) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found.' },
      };
    }

    if (connection.requester_id !== user.id && connection.recipient_id !== user.id) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only remove your own connections.' },
      };
    }

    const { error: deleteError } = await supabase
      .from('user_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      console.error('Failed to remove connection:', deleteError);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to remove connection.' },
      };
    }

    revalidatePath('/network');
    return { success: true, data: { removed: true } };
  } catch (err) {
    console.error('Unexpected error in removeConnectionAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

// ==========================================
// NOTIFICATIONS ACTIONS
// ==========================================

export async function markNotificationReadAction(
  input: MarkNotificationReadInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
      };
    }

    const validation = markNotificationReadSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid notification ID.' },
      };
    }

    await markNotificationAsRead(validation.data.notificationId, user.id);
    return { success: true, data: { success: true } };
  } catch (err) {
    console.error('Unexpected error in markNotificationReadAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ success: boolean }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' },
      };
    }

    await markAllNotificationsAsRead(user.id);
    return { success: true, data: { success: true } };
  } catch (err) {
    console.error('Unexpected error in markAllNotificationsReadAction:', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}
