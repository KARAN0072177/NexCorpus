export default function DocumentCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 animate-pulse">
      <div className="flex min-w-0 items-center gap-4">
        {/* File Extension Icon Skeleton */}
        <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-800/80" />

        <div className="min-w-0 space-y-2.5">
          {/* Filename Skeleton */}
          <div className="h-4 w-48 rounded-md bg-slate-800/80" />
          {/* Metadata Badges Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-3 w-3 rounded-full bg-slate-800/60" />
            <div className="h-3 w-16 rounded bg-slate-800/60" />
            <div className="h-3 w-3 rounded-full bg-slate-800/60" />
            <div className="h-3 w-24 rounded bg-slate-800/60" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
        {/* Status Badge Skeleton */}
        <div className="h-7 w-28 rounded-full bg-slate-800/80" />
        {/* Action Button Skeleton */}
        <div className="h-9 w-32 rounded-xl bg-slate-800/80" />
      </div>
    </div>
  );
}
