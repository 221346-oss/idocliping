import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton-block rounded-full", className)} />;
}

export function CampaignCardSkeleton() {
  return (
    <div className="surface-card p-3.5">
      <div className="flex items-start gap-3">
        <div className="skeleton-block h-[68px] w-[68px] shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Bar className="h-3.5 w-4/5" />
          <Bar className="h-3 w-1/2" />
          <Bar className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <Bar className="h-3 w-20" />
          <Bar className="h-3 w-20" />
        </div>
        <Bar className="h-1.5 w-full" />
      </div>
    </div>
  );
}

export function CampaignListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="surface-card divide-y divide-border/60">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <div className="skeleton-block h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3.5 w-2/3" />
            <Bar className="h-3 w-1/3" />
          </div>
          <Bar className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatBlockSkeleton() {
  return (
    <div className="surface-card space-y-3 p-5">
      <Bar className="h-3 w-24" />
      <Bar className="h-8 w-40" />
      <Bar className="h-3 w-32" />
    </div>
  );
}
