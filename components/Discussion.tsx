"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DiscussionMessage } from "@/lib/types";
import { Send } from "lucide-react";

export default function Discussion({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("discussion_messages")
        .select("*, author:profiles(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      setMessages((data as DiscussionMessage[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`discussion-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussion_messages", filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const { data: author } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.user_id)
            .single();
          setMessages((prev) => [...prev, { ...(payload.new as DiscussionMessage), author: author ?? undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    const text = content;
    setContent("");
    await supabase.from("discussion_messages").insert({
      project_id: projectId,
      user_id: userId,
      content: text,
    });
  };

  if (loading) return <p className="text-mist-400 text-sm">Loading discussion…</p>;

  return (
    <div className="flex flex-col h-[480px] border border-ink-700 rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-mist-400 text-sm m-auto">
            No messages yet. Say hi to the team.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center shrink-0 overflow-hidden">
              {m.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-mono text-mist-300">
                  {m.author?.username?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-mist-100">
                  {m.author?.username ?? "unknown"}
                </span>
                <span className="text-[11px] text-mist-400">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-mist-200 mt-0.5 whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-ink-700 p-3">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message the team…"
          className="flex-1 bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
        />
        <button
          type="submit"
          className="bg-signal-violet hover:bg-signal-violetSoft text-white rounded-lg px-3 flex items-center justify-center transition-colors"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
