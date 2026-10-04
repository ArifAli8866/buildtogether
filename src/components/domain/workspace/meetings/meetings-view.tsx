'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMemberRole } from '@/types/database';
import type { DetailedMeeting } from '@/lib/queries/collaboration';
import type { AssignableMember } from '@/lib/queries/workspace';
import {
  updateMeetingParticipantAction,
  updateMeetingAction,
  deleteMeetingAction,
} from '@/lib/actions/collaboration';
import { CreateMeetingDialog } from './create-meeting-dialog';
import { MeetingNotesDialog } from './meeting-notes-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Calendar,
  Video,
  Plus,
  FileText,
  Trash2,
  CheckCircle,
  HelpCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface MeetingsViewProps {
  project: Project;
  meetings: DetailedMeeting[];
  role: ProjectMemberRole;
  currentUserId: string;
  members: AssignableMember[];
}

export function MeetingsView({
  project,
  meetings,
  role,
  currentUserId,
  members,
}: MeetingsViewProps) {
  const router = useRouter();
  const isAdmin = role === 'owner' || role === 'maintainer';

  const [activeTab, setActiveTab] = React.useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [notesMeeting, setNotesMeeting] = React.useState<DetailedMeeting | null>(null);

  const filteredMeetings = React.useMemo(() => {
    return meetings.filter((m) => {
      if (activeTab === 'upcoming') {
        return m.status === 'scheduled' || m.status === 'in_progress';
      }
      if (activeTab === 'completed') {
        return m.status === 'completed';
      }
      return true;
    });
  }, [meetings, activeTab]);

  const formatMeetingTime = (isoString: string, durationMinutes: number) => {
    const start = new Date(isoString);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const dateFormatted = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const startTime = start.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTime = end.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatted} &bull; ${startTime} - ${endTime} (${durationMinutes} mins)`;
  };

  const handleRSVP = async (meetingId: string, status: 'attending' | 'declined' | 'tentative') => {
    await updateMeetingParticipantAction({
      meetingId,
      projectId: project.id,
      status,
    });
    router.refresh();
  };

  const handleStatusChange = async (
    meetingId: string,
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    await updateMeetingAction({
      meetingId,
      projectId: project.id,
      status,
    });
    router.refresh();
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this meeting?')) return;
    await deleteMeetingAction(meetingId, project.id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary">
            Team Meetings
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Schedule synchronous sessions, sprint syncs, and record meeting minutes.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
        {(['upcoming', 'completed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-accent-primary text-white'
                : 'text-content-secondary hover:bg-app-surface-2 hover:text-content-primary'
            }`}
          >
            {tab} Meetings
          </button>
        ))}
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-subtle bg-app-surface-1/40 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-app-surface-2 text-content-muted">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-content-primary">
            No {activeTab} meetings found
          </h3>
          <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'There are no upcoming meetings scheduled for this team.'
              : 'No past meetings found in this archive.'}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule Meeting</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMeetings.map((meeting) => {
            const isOrganizer = meeting.organizer_id === currentUserId;
            const canManage = isOrganizer || isAdmin;
            const myRsvp = meeting.participants.find((p) => p.user_id === currentUserId)?.status;

            return (
              <div
                key={meeting.id}
                className="rounded-xl border border-border-subtle bg-app-surface-1 p-5 space-y-4 transition-all hover:border-border-subtle/80 shadow-sm"
              >
                {/* Meeting Card Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          meeting.status === 'completed'
                            ? 'neutral'
                            : meeting.status === 'in_progress'
                            ? 'accent'
                            : 'info'
                        }
                        size="sm"
                        className="capitalize text-[10px]"
                      >
                        {meeting.status.replace('_', ' ')}
                      </Badge>

                      <h3 className="text-base font-semibold text-content-primary">
                        {meeting.title}
                      </h3>
                    </div>

                    <div
                      className="text-xs text-content-muted flex items-center gap-1.5"
                      dangerouslySetInnerHTML={{
                        __html: formatMeetingTime(
                          meeting.scheduled_at,
                          meeting.duration_minutes
                        ),
                      }}
                    />
                  </div>

                  {/* Actions / Join Call */}
                  <div className="flex items-center gap-2 shrink-0">
                    {meeting.meeting_url && (
                      <a
                        href={meeting.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Join Call</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesMeeting(meeting)}
                      className={`h-8 gap-1.5 text-xs ${
                        meeting.notes ? 'border-accent-primary/50 text-accent-primary' : ''
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{meeting.notes ? 'View Notes' : 'Add Notes'}</span>
                    </Button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        {meeting.status !== 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(meeting.id, 'completed')}
                            className="h-8 text-xs text-content-muted hover:text-emerald-400"
                            title="Mark meeting complete"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="h-8 text-xs text-content-muted hover:text-red-400"
                          title="Delete meeting"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {meeting.description && (
                  <p className="text-xs text-content-secondary leading-relaxed bg-app-surface-2/40 p-3 rounded-lg border border-border-subtle/50">
                    {meeting.description}
                  </p>
                )}

                {/* Participants & RSVP Section */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border-subtle">
                  {/* Attendees */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-content-muted">
                      Attendees ({meeting.participants.length}):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {meeting.participants.map((p) => {
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-1 rounded-full bg-app-surface-2 px-2 py-0.5 text-[11px] border border-border-subtle/50"
                            title={`${p.profile.full_name || p.profile.username} (${p.status})`}
                          >
                            <Avatar
                              src={p.profile.avatar_url}
                              alt={p.profile.username}
                              fallbackText={p.profile.username}
                              size="sm"
                              className="h-4 w-4 text-[9px]"
                            />
                            <span className="text-content-secondary max-w-[90px] truncate">
                              {p.profile.username}
                            </span>
                            {p.status === 'attending' && (
                              <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                            )}
                            {p.status === 'tentative' && (
                              <HelpCircle className="h-3 w-3 text-amber-400 shrink-0" />
                            )}
                            {p.status === 'declined' && (
                              <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* My RSVP Selector */}
                  <div className="flex items-center gap-1.5 text-xs shrink-0">
                    <span className="text-[11px] text-content-muted">Your RSVP:</span>
                    <button
                      type="button"
                      onClick={() => handleRSVP(meeting.id, 'attending')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        myRsvp === 'attending'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                          : 'text-content-muted hover:bg-app-surface-2 hover:text-content-secondary'
                      }`}
                    >
                      Going
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRSVP(meeting.id, 'tentative')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        myRsvp === 'tentative'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                          : 'text-content-muted hover:bg-app-surface-2 hover:text-content-secondary'
                      }`}
                    >
                      Maybe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRSVP(meeting.id, 'declined')}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        myRsvp === 'declined'
                          ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40'
                          : 'text-content-muted hover:bg-app-surface-2 hover:text-content-secondary'
                      }`}
                    >
                      Can&apos;t go
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Dialog */}
      <CreateMeetingDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={project.id}
        members={members}
        currentUserId={currentUserId}
      />

      {/* Notes Dialog */}
      {notesMeeting && (
        <MeetingNotesDialog
          isOpen={Boolean(notesMeeting)}
          onClose={() => setNotesMeeting(null)}
          meeting={notesMeeting}
          projectId={project.id}
        />
      )}
    </div>
  );
}
