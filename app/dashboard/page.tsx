"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Project, JoinRequest, Profile } from "@/lib/types";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ProfileEditor from "@/components/ProfileEditor";

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser ?? null);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const [{ data: profileData }, { data: projects }, { data: requests }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
        supabase
          .from("projects")
          .select("*, owner:profiles!projects_owner_id_fkey(*), team_members(id)")
          .eq("owner_id", currentUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("join_requests")
          .select("*, project:projects(*)")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false }),
      ]);

      setProfile(profileData as Profile);
      setMyProjects(
        (projects ?? []).map((p: any) => ({ ...p, member_count: p.team_members?.length ?? 1 }))
      );
      setMyRequests((requests as JoinRequest[]) ?? []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (loading) return <div className="max-w-5xl mx-auto px-5 py-16 text-mist-400">Loading…</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-mist-100">Sign in to see your dashboard</h1>
        <Link
          href="/login"
          className="inline-block mt-6 bg-signal-violet hover:bg-signal-violetSoft text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-14">
      <h1 className="font-display font-bold text-3xl text-mist-100">Your dashboard</h1>

      <div className="grid lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 flex flex-col gap-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl text-mist-100">Your projects</h2>
              <Link href="/new" className="text-sm text-signal-violetSoft hover:underline">
                + New project
              </Link>
            </div>
            {myProjects.length === 0 ? (
              <p className="text-mist-400 text-sm">You haven't posted a project yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {myProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-mist-100 mb-4">Your requests</h2>
            {myRequests.length === 0 ? (
              <p className="text-mist-400 text-sm">You haven't requested to join anything yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/project/${r.project_id}`}
                    className="flex items-center justify-between border border-ink-700 rounded-xl px-4 py-3 hover:border-signal-violet/50 transition-colors"
                  >
                    <span className="text-sm text-mist-100">{r.project?.title}</span>
                    <StatusPill status={r.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div>
          {profile && <ProfileEditor profile={profile} onSaved={setProfile} />}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-signal-amber bg-signal-amber/10 border-signal-amber/30",
    accepted: "text-signal-green bg-signal-green/10 border-signal-green/30",
    rejected: "text-signal-coral bg-signal-coral/10 border-signal-coral/30",
  };
  return (
    <span className={`text-[11px] font-mono px-2 py-1 rounded-full border ${map[status]}`}>
      {status}
    </span>
  );
}
