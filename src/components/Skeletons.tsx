import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="border border-border bg-card p-4 rounded-md space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <div className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-24 h-24 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1 w-full" />
          </div>
        </div>
      </div>
      <div className="border-t border-border p-3 flex items-center justify-between">
        <div className="space-y-1.5"><Skeleton className="h-2.5 w-16" /><Skeleton className="h-4 w-20" /></div>
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function CampaignGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <CampaignCardSkeleton key={i} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-4 h-11 border-b border-border flex items-center"><Skeleton className="h-3.5 w-32" /></div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 h-12">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" style={{ maxWidth: c === 0 ? 120 : c === cols - 1 ? 80 : undefined }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="border border-border rounded-md p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="w-full aspect-video rounded-md" />
        <div className="border border-border rounded-md p-4 space-y-2">
          <Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="space-y-4">
        <FormSkeleton /><FormSkeleton />
      </div>
    </div>
  );
}
