import { createClient } from "@/lib/supabase/server";
import ConstellationHero from "@/components/ConstellationHero";
import ProjectCard from "@/components/ProjectCard";
import FeedSearch from "@/components/FeedSearch";
import Link from "next/link";
import type { Project } from "@/lib/types";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = searchParams?.q?.trim();

  let query = supabase
    .from("projects")
    .select("*, owner:profiles!projects_owner_id_fkey(*), team_members(id)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (q) {
    query = query.or(`title.ilike.%${q}%,tagline.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: projectsRaw } = await query;

  const projects: Project[] = (projectsRaw ?? []).map((p: any) => ({
    ...p,
    member_count: p.team_members?.length ?? 1,
  }));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/70">
        <div className="absolute inset-0 bg-grid-fade pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-14 md:pt-24 md:pb-20 grid md:grid-cols-2 gap-10 items-center relative">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-signal-violetSoft border border-signal-violet/30 bg-signal-violet/10 rounded-full px-3 py-1">
              built for student builders
            </span>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-[1.08] text-mist-100 mt-5 text-balance">
              You have the idea.
              <br />
              Find the people to <span className="text-signal-violetSoft">build it with.</span>
            </h1>
            <p className="text-mist-300 mt-5 text-base md:text-lg max-w-md">
              Post your project, pull in contributors, run the work in a shared
              workspace, and let your Cofound profile speak for itself when
              companies come looking.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/new"
                className="inline-flex items-center gap-2 bg-signal-violet hover:bg-signal-violetSoft text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors"
              >
                Post your idea <ArrowRight size={16} />
              </Link>
              <a
                href="#feed"
                className="inline-flex items-center gap-2 border border-ink-600 hover:border-mist-400 text-mist-200 text-sm font-medium px-5 py-3 rounded-xl transition-colors"
              >
                Browse projects
              </a>
            </div>
          </div>
          <div className="h-56 md:h-72 rounded-2xl border border-ink-700 bg-ink-800/50 flex items-center justify-center">
            <div className="w-full max-w-md px-4">
              <ConstellationHero />
            </div>
          </div>
        </div>
      </section>

      {/* Feed */}
      <section id="feed" className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="font-display font-bold text-2xl text-mist-100">The feed</h2>
            <p className="text-mist-400 text-sm mt-1">
              Every project looking for hands right now.
            </p>
          </div>
          <FeedSearch />
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-ink-600 rounded-2xl py-16 text-center text-mist-400">
            No projects posted yet. Be the first — it takes two minutes.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
