export function Skeleton({ className = '', ...props }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} {...props} />;
}

export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? 40 : i === 1 ? 120 : undefined }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" style={{
              maxWidth: c === 0 ? 40 : c === 1 ? 120 : undefined,
              opacity: 1 - r * 0.08,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2 w-20" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-10">
            <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-28" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-12" /></div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-baseline gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-24" /></div>
            <Skeleton className="h-8 w-24 rounded" />
          </div>
          <div className="flex items-end gap-1 h-[180px]">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${20 + Math.random() * 140}px` }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function SidebarFilterSkeleton() {
  return (
    <div className="w-[240px] shrink-0 flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded" />
        </div>
      ))}
    </div>
  );
}
