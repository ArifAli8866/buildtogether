'use client';

import * as React from 'react';
import type {
  DetailedCodeReviewFile,
  DetailedCodeReviewComment,
} from '@/lib/queries/files-and-code';
import {
  addCodeReviewCommentAction,
  resolveCodeReviewCommentAction,
  deleteCodeReviewCommentAction,
} from '@/lib/actions/files-and-code';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Columns,
  Rows,
  MessageSquarePlus,
  CheckCircle2,
  Trash2,
  Reply,
  FileCode,
} from 'lucide-react';

interface DiffViewerProps {
  reviewId: string;
  projectId: string;
  file: DetailedCodeReviewFile;
  comments: DetailedCodeReviewComment[];
  currentUserId: string;
  isAdmin: boolean;
}

interface DiffLine {
  type: 'added' | 'deleted' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  oldContent?: string;
  newContent?: string;
}

export function DiffViewer({
  reviewId,
  projectId,
  file,
  comments,
  currentUserId,
  isAdmin,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = React.useState<'split' | 'unified'>('unified');
  const [activeCommentLine, setActiveCommentLine] = React.useState<{
    lineNumber: number;
    diffSide: 'left' | 'right';
  } | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [replyingToCommentId, setReplyingToCommentId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Compute Diff Lines
  const diffLines = React.useMemo(() => {
    const oldLines = file.old_content ? file.old_content.split('\n') : [];
    const newLines = file.new_content ? file.new_content.split('\n') : [];

    const lines: DiffLine[] = [];

    if (file.change_type === 'added') {
      newLines.forEach((line, idx) => {
        lines.push({
          type: 'added',
          newLineNumber: idx + 1,
          newContent: line,
        });
      });
      return lines;
    }

    if (file.change_type === 'deleted') {
      oldLines.forEach((line, idx) => {
        lines.push({
          type: 'deleted',
          oldLineNumber: idx + 1,
          oldContent: line,
        });
      });
      return lines;
    }

    // Line-by-line comparison algorithm for modified files
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length) {
        if (oldLines[i] === newLines[j]) {
          lines.push({
            type: 'unchanged',
            oldLineNumber: i + 1,
            newLineNumber: j + 1,
            oldContent: oldLines[i],
            newContent: newLines[j],
          });
          i++;
          j++;
        } else {
          // Check ahead for match
          const oldInNew = newLines.indexOf(oldLines[i], j);
          const newInOld = oldLines.indexOf(newLines[j], i);

          if (oldInNew !== -1 && (newInOld === -1 || oldInNew - j < newInOld - i)) {
            // New line was added
            lines.push({
              type: 'added',
              newLineNumber: j + 1,
              newContent: newLines[j],
            });
            j++;
          } else {
            // Old line was deleted
            lines.push({
              type: 'deleted',
              oldLineNumber: i + 1,
              oldContent: oldLines[i],
            });
            i++;
          }
        }
      } else if (i < oldLines.length) {
        lines.push({
          type: 'deleted',
          oldLineNumber: i + 1,
          oldContent: oldLines[i],
        });
        i++;
      } else if (j < newLines.length) {
        lines.push({
          type: 'added',
          newLineNumber: j + 1,
          newContent: newLines[j],
        });
        j++;
      }
    }

    return lines;
  }, [file]);

  // Filter comments for this file
  const fileComments = React.useMemo(() => {
    return comments.filter((c) => c.code_review_file_id === file.id);
  }, [comments, file.id]);

  const handlePostComment = async (lineNumber: number, diffSide: 'left' | 'right') => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);

    await addCodeReviewCommentAction({
      reviewId,
      codeReviewFileId: file.id,
      projectId,
      lineNumber,
      diffSide,
      content: commentText.trim(),
    });

    setIsSubmitting(false);
    setActiveCommentLine(null);
    setCommentText('');
  };

  const handlePostReply = async (parentCommentId: string, lineNumber: number, diffSide: 'left' | 'right') => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);

    await addCodeReviewCommentAction({
      reviewId,
      codeReviewFileId: file.id,
      projectId,
      lineNumber,
      diffSide,
      content: replyText.trim(),
      parentCommentId,
    });

    setIsSubmitting(false);
    setReplyingToCommentId(null);
    setReplyText('');
  };

  const handleResolveComment = async (commentId: string, currentResolved: boolean) => {
    await resolveCodeReviewCommentAction(commentId, projectId, !currentResolved);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    await deleteCodeReviewCommentAction(commentId, projectId);
  };

  // Render comments attached to a specific line
  const renderLineComments = (lineNum: number, side: 'left' | 'right') => {
    const matched = fileComments.filter(
      (c) => c.line_number === lineNum && (c.diff_side === side || !c.diff_side)
    );

    if (matched.length === 0 && (!activeCommentLine || activeCommentLine.lineNumber !== lineNum || activeCommentLine.diffSide !== side)) {
      return null;
    }

    return (
      <div className="bg-app-surface-1 border-y border-border-subtle p-3 space-y-3 font-sans text-xs">
        {matched.map((comment) => (
          <div
            key={comment.id}
            className={`rounded-lg p-2.5 space-y-2 border ${
              comment.is_resolved
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-app-surface-2 border-border-subtle/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar
                  src={comment.author.avatar_url}
                  alt={comment.author.username}
                  fallbackText={comment.author.username}
                  size="sm"
                  className="h-4 w-4 text-[8px]"
                />
                <span className="font-semibold text-content-primary">
                  {comment.author.full_name || `@${comment.author.username}`}
                </span>
                <span className="text-[10px] text-content-muted">
                  {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleResolveComment(comment.id, comment.is_resolved)}
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                    comment.is_resolved
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-content-muted hover:bg-app-surface-3'
                  }`}
                  title={comment.is_resolved ? 'Reopen comment' : 'Resolve comment'}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{comment.is_resolved ? 'Resolved' : 'Resolve'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplyingToCommentId(comment.id);
                    setReplyText('');
                  }}
                  className="rounded p-1 text-content-muted hover:bg-app-surface-3 hover:text-content-primary"
                  title="Reply"
                >
                  <Reply className="h-3 w-3" />
                </button>

                {(comment.author_id === currentUserId || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="rounded p-1 text-content-muted hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-content-secondary leading-relaxed whitespace-pre-wrap pl-6">
              {comment.content}
            </p>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="pl-6 space-y-2 pt-2 border-t border-border-subtle/40">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Avatar
                        src={reply.author.avatar_url}
                        alt={reply.author.username}
                        fallbackText={reply.author.username}
                        size="sm"
                        className="h-3.5 w-3.5 text-[7px]"
                      />
                      <span className="font-medium text-content-primary">
                        {reply.author.username}
                      </span>
                      <span className="text-content-muted text-[10px]">
                        {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-content-secondary pl-5 text-[11px]">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Reply Form */}
            {replyingToCommentId === comment.id && (
              <div className="pl-6 pt-2 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="text-xs bg-app-surface-1"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingToCommentId(null)}
                    className="h-6 text-[11px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handlePostReply(comment.id, lineNum, side)}
                    isLoading={isSubmitting}
                    className="h-6 text-[11px]"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* New Comment Box on this Line */}
        {activeCommentLine && activeCommentLine.lineNumber === lineNum && activeCommentLine.diffSide === side && (
          <div className="rounded-lg border border-accent-primary/60 bg-app-surface-2 p-3 space-y-2">
            <span className="text-[11px] font-semibold text-content-primary block">
              Add comment on line {lineNum}
            </span>
            <Textarea
              placeholder="Ask a question, suggest an improvement, or point out a bug..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              className="text-xs bg-app-surface-1"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveCommentLine(null);
                  setCommentText('');
                }}
                className="h-6 text-[11px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handlePostComment(lineNum, side)}
                isLoading={isSubmitting}
                className="h-6 text-[11px]"
              >
                Comment
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-app-surface-1 overflow-hidden shadow-sm">
      {/* File Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-subtle bg-app-surface-2/40">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 text-accent-primary shrink-0" />
          <span className="font-mono text-xs font-bold text-content-primary truncate">
            {file.file_path}
          </span>
          <Badge
            variant={
              file.change_type === 'added'
                ? 'success'
                : file.change_type === 'deleted'
                ? 'danger'
                : 'info'
            }
            size="sm"
            className="capitalize font-mono text-[9px]"
          >
            {file.change_type}
          </Badge>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'unified'
                ? 'bg-accent-primary text-white'
                : 'text-content-muted hover:bg-app-surface-3 hover:text-content-primary'
            }`}
            title="Unified Diff View"
          >
            <Rows className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Unified</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-accent-primary text-white'
                : 'text-content-muted hover:bg-app-surface-3 hover:text-content-primary'
            }`}
            title="Split Side-by-Side Diff View"
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>
        </div>
      </div>

      {/* UNIFIED DIFF VIEW */}
      {viewMode === 'unified' && (
        <div className="overflow-x-auto font-mono text-xs leading-relaxed">
          <table className="w-full border-collapse">
            <tbody>
              {diffLines.map((line, idx) => {
                const isAdded = line.type === 'added';
                const isDeleted = line.type === 'deleted';
                const targetLineNum = (line.newLineNumber || line.oldLineNumber) ?? idx + 1;
                const side: 'left' | 'right' = isDeleted ? 'left' : 'right';

                return (
                  <React.Fragment key={idx}>
                    <tr
                      className={`group hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                        isAdded
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : isDeleted
                          ? 'bg-rose-500/10 text-rose-300'
                          : 'text-content-primary'
                      }`}
                    >
                      {/* Old line number */}
                      <td className="w-12 select-none border-r border-border-subtle/30 px-2 py-0.5 text-right text-[10px] text-content-muted/60">
                        {line.oldLineNumber || ''}
                      </td>

                      {/* New line number */}
                      <td className="w-12 select-none border-r border-border-subtle/30 px-2 py-0.5 text-right text-[10px] text-content-muted/60 relative">
                        {line.newLineNumber || ''}

                        {/* Inline Comment Trigger */}
                        <button
                          type="button"
                          onClick={() => setActiveCommentLine({ lineNumber: targetLineNum, diffSide: side })}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 bg-accent-primary text-white rounded transition-opacity"
                          title="Add inline review comment"
                        >
                          <MessageSquarePlus className="h-2.5 w-2.5" />
                        </button>
                      </td>

                      {/* Diff sign (+ / - / space) */}
                      <td className="w-6 select-none px-1 text-center font-bold">
                        {isAdded ? '+' : isDeleted ? '-' : ' '}
                      </td>

                      {/* Code line content */}
                      <td className="px-2 py-0.5 whitespace-pre overflow-x-auto">
                        {(isDeleted ? line.oldContent : line.newContent) || ' '}
                      </td>
                    </tr>

                    {/* Inline comment rendering */}
                    <tr>
                      <td colSpan={4} className="p-0">
                        {renderLineComments(targetLineNum, side)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SPLIT DIFF VIEW */}
      {viewMode === 'split' && (
        <div className="overflow-x-auto font-mono text-xs leading-relaxed">
          <div className="grid grid-cols-2 divide-x divide-border-subtle">
            {/* Left side (Old Content) */}
            <div>
              <div className="bg-app-surface-2/60 px-3 py-1 text-[10px] font-bold text-content-muted border-b border-border-subtle">
                Original (Base)
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {diffLines.map((line, idx) => {
                    const isDeleted = line.type === 'deleted';
                    const isUnchanged = line.type === 'unchanged';

                    if (!isDeleted && !isUnchanged) {
                      return (
                        <tr key={idx} className="bg-app-surface-2/20">
                          <td className="w-10 px-2 py-0.5 text-right text-[10px] text-content-muted/40 select-none">-</td>
                          <td className="px-2 py-0.5">&nbsp;</td>
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={idx}>
                        <tr className={isDeleted ? 'bg-rose-500/10 text-rose-300' : 'text-content-secondary'}>
                          <td className="w-10 select-none border-r border-border-subtle/30 px-2 py-0.5 text-right text-[10px] text-content-muted/60">
                            {line.oldLineNumber}
                          </td>
                          <td className="px-2 py-0.5 whitespace-pre">
                            {line.oldContent || ' '}
                          </td>
                        </tr>
                        {line.oldLineNumber && (
                          <tr>
                            <td colSpan={2} className="p-0">
                              {renderLineComments(line.oldLineNumber, 'left')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right side (New Content) */}
            <div>
              <div className="bg-app-surface-2/60 px-3 py-1 text-[10px] font-bold text-content-muted border-b border-border-subtle">
                Modified (Target)
              </div>
              <table className="w-full border-collapse">
                <tbody>
                  {diffLines.map((line, idx) => {
                    const isAdded = line.type === 'added';
                    const isUnchanged = line.type === 'unchanged';

                    if (!isAdded && !isUnchanged) {
                      return (
                        <tr key={idx} className="bg-app-surface-2/20">
                          <td className="w-10 px-2 py-0.5 text-right text-[10px] text-content-muted/40 select-none">-</td>
                          <td className="px-2 py-0.5">&nbsp;</td>
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={idx}>
                        <tr className={isAdded ? 'bg-emerald-500/10 text-emerald-300' : 'text-content-secondary'}>
                          <td className="w-10 select-none border-r border-border-subtle/30 px-2 py-0.5 text-right text-[10px] text-content-muted/60">
                            {line.newLineNumber}
                          </td>
                          <td className="px-2 py-0.5 whitespace-pre">
                            {line.newContent || ' '}
                          </td>
                        </tr>
                        {line.newLineNumber && (
                          <tr>
                            <td colSpan={2} className="p-0">
                              {renderLineComments(line.newLineNumber, 'right')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
