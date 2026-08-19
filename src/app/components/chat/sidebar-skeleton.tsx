export default function SidebarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Overview Card Skeleton */}
      <div>
        <div className="h-3 w-28 rounded bg-slate-800/80 mb-3" />
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex justify-between">
              <div className="h-3 w-14 rounded bg-slate-800/60" />
              <div className="h-3 w-24 rounded bg-slate-800/60" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-14 rounded bg-slate-800/60" />
              <div className="h-3 w-20 rounded bg-slate-800/60" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded bg-slate-800/60" />
              <div className="h-3 w-28 rounded bg-slate-800/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Questions Skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-slate-800/80 mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-full rounded-lg bg-slate-900/60 border border-white/5" />
        ))}
      </div>
    </div>
  );
}
