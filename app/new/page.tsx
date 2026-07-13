"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { ProjectStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Just an idea" },
  { value: "in_progress", label: "Already building" },
  { value: "completed", label: "Shipped, want more contributors" },
];

export default function NewProjectPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [repoUrl, setRepoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        title,
        tagline,
        description,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status,
        repo_url: repoUrl || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/project/${data.id}`);
  };

  if (checking) {
    return <div className="max-w-xl mx-auto px-5 py-16 text-mist-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display font-bold text-2xl text-mist-100">Sign in to post a project</h1>
        <p className="text-mist-400 text-sm mt-2">
          You need an account so contributors know who's behind the idea.
        </p>
        <a
          href="/login"
          className="inline-block mt-6 bg-signal-violet hover:bg-signal-violetSoft text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-14">
      <h1 className="font-display font-bold text-3xl text-mist-100">Post your idea</h1>
      <p className="text-mist-400 text-sm mt-2">
        Give people enough to get excited — you can edit this any time.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-8">
        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. StudyBuddy — AI-matched study groups"
            className="input"
          />
        </Field>

        <Field label="One-line tagline">
          <input
            required
            maxLength={140}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="What does it do, in one sentence?"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you building, why, and what kind of contributors do you need?"
            className="input resize-none"
          />
        </Field>

        <Field label="Tags (comma separated)">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="react, supabase, ml, design"
            className="input"
          />
        </Field>

        <Field label="Status">
          <div className="grid grid-cols-1 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  status === opt.value
                    ? "border-signal-violet bg-signal-violet/10 text-mist-100"
                    : "border-ink-600 text-mist-300 hover:border-mist-400"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  className="accent-signal-violet"
                  checked={status === opt.value}
                  onChange={() => setStatus(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Repo URL (optional)">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/you/project"
            className="input"
          />
        </Field>

        {error && <p className="text-signal-coral text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-signal-violet hover:bg-signal-violetSoft disabled:opacity-60 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {submitting ? "Posting…" : "Post project"}
        </button>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          background-color: #11151d;
          border: 1px solid #232936;
          border-radius: 0.75rem;
          padding: 0.7rem 0.9rem;
          font-size: 0.875rem;
          color: #e8eaed;
        }
        .input:focus {
          outline: none;
          border-color: #7c6ff0;
        }
        .input::placeholder {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wide text-mist-400">{label}</span>
      {children}
    </label>
  );
}
