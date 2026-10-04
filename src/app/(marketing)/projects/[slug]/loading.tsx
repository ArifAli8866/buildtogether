export default function ProjectLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-2xl border border-border-subtle bg-app-surface-1 p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-app-surface-2" />
            <div className="h-6 w-24 rounded-full bg-app-surface-2" />
          </div>
          <div className="h-9 w-2/3 rounded-lg bg-app-surface-2" />
          <div className="h-5 w-3/4 rounded-lg bg-app-surface-2" />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border-subtle">
          <div className="h-10 w-10 rounded-full bg-app-surface-2" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-app-surface-2" />
            <div className="h-3 w-20 rounded bg-app-surface-2" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-32 rounded-xl bg-app-surface-1 border border-border-subtle" />
            <div className="h-32 rounded-xl bg-app-surface-1 border border-border-subtle" />
          </div>
          <div className="h-48 rounded-xl bg-app-surface-1 border border-border-subtle" />
        </div>

        <div className="space-y-6">
          <div className="h-40 rounded-xl bg-app-surface-1 border border-border-subtle" />
          <div className="h-64 rounded-xl bg-app-surface-1 border border-border-subtle" />
        </div>
      </div>
    </main>
  );
}
