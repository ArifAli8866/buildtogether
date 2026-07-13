"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, TeamMember } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import TeamList from "@/components/TeamList";
import Discussion from "@/components/Discussion";
import TaskBoard from "@/components/TaskBoard";
import RequestModal from "@/components/RequestModal";
import RequestsPanel from "@/components/RequestsPanel";
import { GitBranch, Users, MessageSquare, LayoutGrid, Info } from "lucide-react";

type Tab = "overview" | "team" | "discussion" | "workspace" | "requests";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const isOwner = !!user && !!project && user.id === project.owner_id;
  const isMember = !!user && members.some((m) => m.user_id === user.id);

  const load = async () => {
    const { data: projectData } = await supabase
      .from("projects")
      .select("*, owner:profiles!projects_owner_id_fkey(*)")
      .eq("id", id)
      .single();
    setProject(projectData as Project);

    const { data: memberData } = await supabase
      .from("team_members")
      .select("*, profile:profiles(*)")
      .eq("project_id", id);
    setMembers((memberData as TeamMember[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    load();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-5 py-16 text-mist-400">Loading…</div>;
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-mist-100">Project not found</h1>
        <Link href="/" className="text-signal-violetSoft text-sm mt-3 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    { key: "overview", label: "Overview", icon: <Info size={15} /> },
    { key: "team", label: "Team", icon: <Users size={15} /> },
    { key: "discussion", label: "Discussion", icon: <MessageSquare size={15} />, locked: !isMember && !isOwner },
    { key: "workspace", label: "Workspace", icon: <LayoutGrid size={15} />, locked: !isMember && !isOwner },
  ];
  if (isOwner) tabs.push({ key: "requests", label: "Requests", icon: <Users size={15} /> });

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-3xl text-mist-100">{project.title}</h1>
          <p className="text-mist-300 mt-2 max-w-xl">{project.tagline}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tags?.map((tag) => (
              <span key={tag} className="text-[11px] font-mono px-2 py-1 rounded-md bg-ink-700 text-mist-300">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/profile/${project.owner?.username}`}
            className="flex items-center gap-1.5 text-xs text-mist-400 font-mono hover:text-mist-200"
          >
            <GitBranch size={13} /> @{project.owner?.username}
          </Link>
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-signal-violetSoft hover:underline"
            >
              View repo ↗
            </a>
          )}
          {user && !isOwner && !isMember && (
            <button
              onClick={() => setShowRequestModal(true)}
              disabled={requestSent}
              className="bg-signal-violet hover:bg-signal-violetSoft disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {requestSent ? "Request sent" : "Request to join"}
            </button>
          )}
          {!user && (
            <Link
              href="/login"
              className="bg-signal-violet hover:bg-signal-violetSoft text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Sign in to join
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-8 border-b border-ink-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => !t.locked && setTab(t.key)}
            disabled={t.locked}
            className={`flex items-center gap-1.5 text-sm px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? "border-signal-violet text-mist-100"
                : "border-transparent text-mist-400 hover:text-mist-200"
            } ${t.locked ? "opacity-40 cursor-not-allowed" : ""}`}
            title={t.locked ? "Join the team to unlock this" : undefined}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === "overview" && (
          <p className="text-mist-200 leading-relaxed whitespace-pre-wrap">{project.description}</p>
        )}
        {tab === "team" && <TeamList members={members} />}
        {tab === "discussion" && user && (isMember || isOwner) && (
          <Discussion projectId={project.id} userId={user.id} />
        )}
        {tab === "workspace" && user && (isMember || isOwner) && (
          <TaskBoard projectId={project.id} members={members} />
        )}
        {tab === "requests" && isOwner && (
          <RequestsPanel projectId={project.id} onAccepted={load} />
        )}
      </div>

      {showRequestModal && user && (
        <RequestModal
          projectId={project.id}
          userId={user.id}
          onClose={() => setShowRequestModal(false)}
          onSent={() => {
            setShowRequestModal(false);
            setRequestSent(true);
          }}
        />
      )}
    </div>
  );
}
