import Link from "next/link";
import type { Project } from "@/lib/types";
import { Users, GitBranch } from "lucide-react";

const statusLabel: Record<string, { text: string; className: string }> = {
  idea: { text: "Idea stage", className: "text-signal-amber bg-signal-amber/10 border-signal-amber/30" },
  in_progress: { text: "Building", className: "text-signal-green bg-signal-green/10 border-signal-green/30" },
  completed: { text: "Shipped", className: "text-signal-cyan bg-signal-cyan/10 border-signal-cyan/30" },
};

export default function ProjectCard({ project }: { project: Project }) {
  const status = statusLabel[project.status] ?? statusLabel.idea;

  return (
    <Link
      href={`/project/${project.id}`}
      className="group block rounded-2xl border border-ink-700 bg-ink-800/60 p-5 hover:border-signal-violet/50 hover:bg-ink-800 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg text-mist-100 group-hover:text-signal-violetSoft transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-mist-300 mt-1 line-clamp-2">{project.tagline}</p>
        </div>
        <span
          className={`shrink-0 text-[11px] font-mono px-2 py-1 rounded-full border ${status.className}`}
        >
          {status.text}
        </span>
      </div>

      {project.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-mono px-2 py-1 rounded-md bg-ink-700 text-mist-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-700/70">
        <div className="flex items-center gap-1.5 text-xs text-mist-400">
          <Users size={14} />
          {project.member_count ?? 1} on the team
        </div>
        <div className="flex items-center gap-1.5 text-xs text-mist-400 font-mono">
          <GitBranch size={13} />
          @{project.owner?.username ?? "unknown"}
        </div>
      </div>
    </Link>
  );
}
