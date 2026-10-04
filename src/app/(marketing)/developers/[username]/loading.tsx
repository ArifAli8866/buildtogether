export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="h-44 w-full animate-pulse rounded-xl bg-app-surface-2" />
      <div className="relative -mt-16 px-6">
        <div className="h-28 w-28 animate-pulse rounded-full border-4 border-app-bg bg-app-surface-3" />
        <div className="mt-4 space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-app-surface-2" />
          <div className="h-4 w-32 animate-pulse rounded bg-app-surface-2" />
          <div className="h-4 w-80 animate-pulse rounded bg-app-surface-2" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="h-48 animate-pulse rounded-xl bg-app-surface-1" />
          <div className="h-64 animate-pulse rounded-xl bg-app-surface-1" />
        </div>
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-xl bg-app-surface-1" />
          <div className="h-40 animate-pulse rounded-xl bg-app-surface-1" />
        </div>
      </div>
    </div>
  );
}
