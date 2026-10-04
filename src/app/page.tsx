export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-app-surface-1 px-3 py-1 text-xs font-medium text-accent-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
          Foundation Active — Phase 0 Ready
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
          Build Together
        </h1>

        <p className="text-lg text-content-secondary leading-relaxed">
          The collaborative developer platform designed to turn ideas into real products. Find
          specialists, form teams, collaborate in structured workspaces, and ship together.
        </p>

        <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
          <div className="rounded-lg border border-border-subtle bg-app-surface-1 p-3">
            <p className="text-xs text-content-muted">Stack</p>
            <p className="font-semibold text-content-primary text-sm">Next.js 15 + TS</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-app-surface-1 p-3">
            <p className="text-xs text-content-muted">Styling</p>
            <p className="font-semibold text-content-primary text-sm">Tailwind CSS</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-app-surface-1 p-3">
            <p className="text-xs text-content-muted">Backend</p>
            <p className="font-semibold text-content-primary text-sm">Supabase RLS</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-app-surface-1 p-3">
            <p className="text-xs text-content-muted">Deploy</p>
            <p className="font-semibold text-content-primary text-sm">Vercel</p>
          </div>
        </div>
      </div>
    </main>
  );
}
