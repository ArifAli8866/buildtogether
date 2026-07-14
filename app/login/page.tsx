"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConstellationHero from "@/components/ConstellationHero";
import { Github, Mail } from "lucide-react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signInWithProvider = async (provider: "google" | "github") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setSubmitting(false);
      if (error) {
        setError(error.message);
        return;
      }
      // If email confirmation is ON in Supabase, there's no session yet.
      setNotice("Check your email to confirm your account, then come back and sign in.");
      return;
    }

    // mode === "signin"
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-2 gap-10 items-center">
      <div className="hidden md:block h-72 rounded-2xl border border-ink-700 bg-ink-800/50 p-4">
        <ConstellationHero />
      </div>

      <div className="max-w-sm mx-auto w-full">
        <h1 className="font-display font-bold text-3xl text-mist-100">Welcome to cofound</h1>
        <p className="text-mist-400 text-sm mt-2">
          Sign in to post projects, request to join teams, and build your
          builder profile.
        </p>

        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={() => signInWithProvider("github")}
            className="flex items-center justify-center gap-2 bg-mist-100 hover:bg-white text-ink-900 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <Github size={18} />
            Continue with GitHub
          </button>
          <button
            onClick={() => signInWithProvider("google")}
            className="flex items-center justify-center gap-2 border border-ink-600 hover:border-mist-400 text-mist-100 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-ink-700 flex-1" />
          <span className="text-mist-400 text-xs font-mono">or</span>
          <div className="h-px bg-ink-700 flex-1" />
        </div>

        <div className="flex gap-1 border border-ink-700 rounded-lg p-1 mb-4">
          <button
            onClick={() => { setMode("signin"); setError(null); setNotice(null); }}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "signin" ? "bg-signal-violet text-white" : "text-mist-400 hover:text-mist-100"
              }`}
          >
            Sign in
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); setNotice(null); }}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${mode === "signup" ? "bg-signal-violet text-white" : "text-mist-400 hover:text-mist-100"
              }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-ink-800 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="w-full bg-ink-800 border border-ink-600 rounded-xl px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
          />

          {error && <p className="text-signal-coral text-sm">{error}</p>}
          {notice && <p className="text-signal-green text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-signal-violet hover:bg-signal-violetSoft disabled:opacity-60 text-white text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <Mail size={16} />
            {submitting
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in with email"}
          </button>
        </form>

        <p className="text-mist-400 text-xs mt-6 leading-relaxed">
          By continuing you agree this is a portfolio / learning project.
          We only request your public profile info to set up your account.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}