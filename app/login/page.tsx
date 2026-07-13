"use client";

import { createClient } from "@/lib/supabase/client";
import ConstellationHero from "@/components/ConstellationHero";
import { Github } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();

  const signIn = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
            onClick={() => signIn("github")}
            className="flex items-center justify-center gap-2 bg-mist-100 hover:bg-white text-ink-900 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <Github size={18} />
            Continue with GitHub
          </button>
          <button
            onClick={() => signIn("google")}
            className="flex items-center justify-center gap-2 border border-ink-600 hover:border-mist-400 text-mist-100 text-sm font-medium py-3 rounded-xl transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

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
