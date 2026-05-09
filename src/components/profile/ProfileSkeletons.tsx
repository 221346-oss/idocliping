import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted/60",
        className,
      )}
    />
  );
}

export function ProfileTopBarSkeleton() {
  return (
    <div className="w-full h-16 border-b border-border bg-card px-4 flex items-center gap-3">
      <Shimmer className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-3.5 w-32" />
        <Shimmer className="h-2.5 w-20" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-6 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function ProfileNavSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Shimmer key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}

export function ProfileCenterSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Shimmer className="h-[180px] w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function ProfileRightCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <Shimmer className="h-14 w-14 rounded-full mx-auto" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Shimmer key={i} className="h-3.5 w-full" />
      ))}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-5 w-5 rounded-full" />
        ))}
      </div>
    </div>
  );
}
