import { createClient } from "@/lib/supabase/server";
import type { Project, TeamMember, Profile } from "@/lib/types";
import Link from "next/link";
import { Github, Linkedin, Globe, Share2 } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import CopyProfileLink from "@/components/CopyProfileLink";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.id)
    .single<Profile>();

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-mist-100">Profile not found</h1>
        <Link href="/" className="text-signal-violetSoft text-sm mt-3 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("*, owner:profiles!projects_owner_id_fkey(*), team_members(id)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: memberships } = await supabase
    .from("team_members")
    .select("*, project:projects(*, owner:profiles!projects_owner_id_fkey(*), team_members(id))")
    .eq("user_id", profile.id)
    .neq("role", "Founder");

  const owned: Project[] = (ownedProjects ?? []).map((p: any) => ({
    ...p,
    member_count: p.team_members?.length ?? 1,
  }));

  const contributed: Project[] = ((memberships as any[]) ?? [])
    .map((m) => m.project)
    .filter(Boolean)
    .map((p: any) => ({ ...p, member_count: p.team_members?.length ?? 1 }));

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      {/* Header / resume card */}
      <div className="border border-ink-700 rounded-2xl p-6 md:p-8 bg-ink-800/40">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-ink-700 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-mono text-mist-300">
                {profile.username[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display font-bold text-2xl text-mist-100">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-mist-400 text-sm font-mono">@{profile.username}</p>
              </div>
              <CopyProfileLink />
            </div>
            {profile.bio && <p className="text-mist-200 mt-3 text-sm leading-relaxed">{profile.bio}</p>}

            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {profile.skills.map((s) => (
                  <span key={s} className="text-[11px] font-mono px-2 py-1 rounded-md bg-ink-700 text-mist-300">
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-5">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-mist-400 hover:text-mist-100">
                  <Github size={18} />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-mist-400 hover:text-mist-100">
                  <Linkedin size={18} />
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="text-mist-400 hover:text-mist-100">
                  <Globe size={18} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-ink-700/70 text-center">
          <Stat label="Projects founded" value={owned.length} />
          <Stat label="Teams joined" value={contributed.length} />
          <Stat label="Member since" value={new Date(profile.created_at).getFullYear()} />
        </div>
      </div>

      {/* Founded projects */}
      <section className="mt-10">
        <h2 className="font-display font-bold text-xl text-mist-100 mb-4">Founded</h2>
        {owned.length === 0 ? (
          <p className="text-mist-400 text-sm">No projects posted yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {owned.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Contributed projects */}
      <section className="mt-10">
        <h2 className="font-display font-bold text-xl text-mist-100 mb-4">Contributed to</h2>
        {contributed.length === 0 ? (
          <p className="text-mist-400 text-sm">Hasn't joined a team yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {contributed.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-display font-bold text-xl text-mist-100">{value}</p>
      <p className="text-mist-400 text-xs mt-0.5">{label}</p>
    </div>
  );
}
