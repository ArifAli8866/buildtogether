import Link from "next/link";
import type { TeamMember } from "@/lib/types";

export default function TeamList({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return <p className="text-mist-400 text-sm">No team members yet.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {members.map((m) => (
        <Link
          key={m.id}
          href={`/profile/${m.profile?.username}`}
          className="flex items-center gap-3 border border-ink-700 rounded-xl p-3 hover:border-signal-violet/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-ink-700 flex items-center justify-center overflow-hidden shrink-0">
            {m.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-mist-300 text-sm font-mono">
                {m.profile?.username?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-mist-100 text-sm font-medium truncate">
              {m.profile?.full_name || m.profile?.username}
            </p>
            <p className="text-mist-400 text-xs font-mono">{m.role}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
