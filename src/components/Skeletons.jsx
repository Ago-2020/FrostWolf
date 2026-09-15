// Shared loading skeletons. Keep styling consistent with the rest of the
// app: animate-pulse + zinc-800/zinc-700 blocks on zinc-900 cards.
export function GameCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3"
    >
      <div className="h-10 w-10 shrink-0 rounded-md bg-zinc-800" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 rounded bg-zinc-700" />
        <div className="h-3 w-1/3 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function ModPageSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-6xl animate-pulse px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-zinc-800" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-8 w-56 rounded bg-zinc-700" />
          <div className="h-4 w-40 rounded bg-zinc-800" />
          <div className="h-4 w-48 rounded bg-zinc-800" />
          <div className="mt-1 h-4 w-3/4 rounded bg-zinc-800" />
          <div className="mt-1 flex gap-1.5">
            <div className="h-5 w-16 rounded-full bg-zinc-800" />
            <div className="h-5 w-16 rounded-full bg-zinc-800" />
            <div className="h-5 w-16 rounded-full bg-zinc-800" />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="h-10 w-36 rounded bg-zinc-800" />
          <div className="h-3 w-24 rounded bg-zinc-800" />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1">
          <div className="flex gap-1 border-b border-zinc-800 pb-2">
            <div className="h-8 w-24 rounded bg-zinc-800" />
            <div className="h-8 w-24 rounded bg-zinc-800" />
            <div className="h-8 w-24 rounded bg-zinc-800" />
          </div>
          <div className="flex flex-col gap-2 pt-6">
            <div className="h-4 w-full rounded bg-zinc-800" />
            <div className="h-4 w-full rounded bg-zinc-800" />
            <div className="h-4 w-5/6 rounded bg-zinc-800" />
            <div className="h-4 w-2/3 rounded bg-zinc-800" />
          </div>
        </div>
        {/* Sidebar */}
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="mb-3 h-3 w-24 rounded bg-zinc-700" />
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="mt-2 h-4 w-2/3 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardProjectSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-5 w-48 rounded bg-zinc-700" />
          <div className="h-3 w-64 rounded bg-zinc-800" />
          <div className="h-3 w-32 rounded bg-zinc-800" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-8 w-20 rounded bg-zinc-800" />
          <div className="h-8 w-24 rounded bg-zinc-800" />
          <div className="h-8 w-16 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function UserPageSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-3xl animate-pulse px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-800" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-6 w-48 rounded bg-zinc-700" />
          <div className="h-4 w-32 rounded bg-zinc-800" />
          <div className="h-3 w-24 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="h-14 w-14 shrink-0 rounded-md bg-zinc-800" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-5 w-1/2 rounded bg-zinc-700" />
              <div className="h-3 w-full rounded bg-zinc-800" />
              <div className="h-3 w-2/3 rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ rows = 4 }) {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-3 w-24 rounded bg-zinc-800" />
          <div className="h-10 w-full rounded bg-zinc-800" />
        </div>
      ))}
      <div className="h-10 w-full rounded bg-zinc-800" />
    </div>
  );
}

export function PageLoadingSkeleton({ label = "Loading…" }) {
  return (
    <p role="status" className="p-12 text-center text-zinc-400">
      <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      {label}
    </p>
  );
}
