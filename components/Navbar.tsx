"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Compass, Plus, LayoutGrid, Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [user, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-ink-700/80 bg-ink-900/85 backdrop-blur-md">
      <nav className="max-w-6xl mx-auto flex items-center justify-between h-16 px-5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="relative w-7 h-7 flex items-center justify-center">
            <span className="absolute inset-0 rounded-md bg-signal-violet/20 group-hover:bg-signal-violet/30 transition-colors" />
            <span className="w-2 h-2 rounded-full bg-signal-violet" />
            <span className="absolute w-1.5 h-1.5 rounded-full bg-signal-cyan -top-0.5 -right-0.5" />
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-mist-100">
            cofound
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/" active={pathname === "/"}>
            <Compass size={16} /> Feed
          </NavLink>
          {user && (
            <NavLink href="/dashboard" active={pathname === "/dashboard"}>
              <LayoutGrid size={16} /> Dashboard
            </NavLink>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/new"
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-signal-violet text-white hover:bg-signal-violetSoft transition-colors"
              >
                <Plus size={16} /> New project
              </Link>
              <Link
                href={username ? `/profile/${username}` : "/dashboard"}
                className="text-sm font-mono text-mist-300 hover:text-mist-100 transition-colors"
              >
                @{username ?? "you"}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm text-mist-400 hover:text-signal-coral transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-signal-violet text-white hover:bg-signal-violetSoft transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          className="md:hidden text-mist-200"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden border-t border-ink-700 bg-ink-900 px-5 py-4 flex flex-col gap-3">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-mist-200 text-sm">
            Feed
          </Link>
          {user && (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-mist-200 text-sm">
              Dashboard
            </Link>
          )}
          {user ? (
            <>
              <Link href="/new" onClick={() => setMenuOpen(false)} className="text-signal-violetSoft text-sm">
                New project
              </Link>
              <Link
                href={username ? `/profile/${username}` : "/dashboard"}
                onClick={() => setMenuOpen(false)}
                className="text-mist-300 text-sm font-mono"
              >
                @{username ?? "you"}
              </Link>
              <button onClick={handleSignOut} className="text-signal-coral text-sm text-left">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-signal-violetSoft text-sm">
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
        active ? "text-mist-100 bg-ink-700/70" : "text-mist-400 hover:text-mist-100"
      }`}
    >
      {children}
    </Link>
  );
}
