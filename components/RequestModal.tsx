"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

export default function RequestModal({
  projectId,
  userId,
  onClose,
  onSent,
}: {
  projectId: string;
  userId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("join_requests").insert({
      project_id: projectId,
      user_id: userId,
      message,
    });

    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "You've already requested to join this project."
          : insertError.message
      );
      return;
    }
    onSent();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm px-5">
      <div className="w-full max-w-md bg-ink-800 border border-ink-600 rounded-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-mist-400 hover:text-mist-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h3 className="font-display font-bold text-lg text-mist-100">Request to join</h3>
        <p className="text-mist-400 text-sm mt-1">
          Tell the founder what you'd bring to the team.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I've built two React Native apps and want to work on the mobile client…"
            className="w-full bg-ink-700 border border-ink-600 rounded-xl px-3.5 py-3 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none resize-none"
          />
          {error && <p className="text-signal-coral text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-signal-violet hover:bg-signal-violetSoft disabled:opacity-60 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      </div>
    </div>
  );
}
