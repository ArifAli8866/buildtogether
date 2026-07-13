"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function ProfileEditor({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [skills, setSkills] = useState((profile.skills ?? []).join(", "));
  const [github, setGithub] = useState(profile.github_url ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [website, setWebsite] = useState(profile.website_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updates = {
      full_name: fullName || null,
      bio: bio || null,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      github_url: github || null,
      linkedin_url: linkedin || null,
      website_url: website || null,
    };
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onSaved(data as Profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="border border-ink-700 rounded-2xl p-5 bg-ink-800/40 flex flex-col gap-4 sticky top-24"
    >
      <h2 className="font-display font-bold text-mist-100">Your resume profile</h2>

      <Field label="Full name">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
      </Field>
      <Field label="Bio">
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="input resize-none" />
      </Field>
      <Field label="Skills (comma separated)">
        <input value={skills} onChange={(e) => setSkills(e.target.value)} className="input" placeholder="typescript, figma, postgres" />
      </Field>
      <Field label="GitHub URL">
        <input value={github} onChange={(e) => setGithub(e.target.value)} className="input" />
      </Field>
      <Field label="LinkedIn URL">
        <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="input" />
      </Field>
      <Field label="Website URL">
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className="input" />
      </Field>

      <button
        type="submit"
        disabled={saving}
        className="bg-signal-violet hover:bg-signal-violetSoft disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          background-color: #171c27;
          border: 1px solid #232936;
          border-radius: 0.65rem;
          padding: 0.55rem 0.8rem;
          font-size: 0.8125rem;
          color: #e8eaed;
        }
        .input:focus {
          outline: none;
          border-color: #7c6ff0;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-wide text-mist-400">{label}</span>
      {children}
    </label>
  );
}
