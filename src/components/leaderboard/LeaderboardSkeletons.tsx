import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LeaderboardRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="animate-pulse space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-t border-border first:border-t-0">
            <Skeleton className="h-6 w-8 rounded" />
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-20" />
            </div>
            <Skeleton className="h-6 w-16 rounded hidden sm:block" />
            <Skeleton className="h-4 w-10 hidden md:block" />
            <Skeleton className="h-4 w-10 hidden md:block" />
            <Skeleton className="h-4 w-12 hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      <Skeleton className="h-[120px] w-full rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="h-16 w-16 rounded-full shrink-0 -mt-8 relative z-10 border-4 border-background" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

export function CosmeticsGridSkeleton({ items = 8 }: { items?: number }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-full" />
      ))}
    </div>
  );
}

export function BannerGridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="h-[45px] w-full rounded-md" />
      ))}
    </div>
  );
}

export function TicketRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}
