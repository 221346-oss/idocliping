import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformRow } from "@/components/brand/icons/NavGlyphs";
import { useSavedCampaigns } from "@/hooks/useSavedCampaigns";
import { useToast } from "@/hooks/use-toast";

export type CampaignCardData = {
  id: string;
  title: string;
  category?: string | null;
  thumbnail_url?: string | null;
  platforms?: unknown;
  budget_total?: number | string | null;
  budget_remaining?: number | string | null;
  payout_per_1m_views?: number | string | null;
  created_at?: string | null;
  status?: string | null;
};

export function campaignUsedPercent(c: CampaignCardData) {
  const total = Number(c.budget_total ?? 0);
  const remaining = Number(c.budget_remaining ?? 0);
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
}

/** Square thumbnail with the category tag burned into the bottom over a dark blur. */
export function CampaignThumb({
  campaign,
  size = "md",
  className,
}: {
  campaign: CampaignCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "sm" ? "h-11 w-11 rounded-xl" : size === "lg" ? "h-20 w-20 rounded-2xl" : "h-[62px] w-[62px] rounded-2xl";
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surface-raised", dims, className)}>
      {campaign.thumbnail_url ? (
        <img src={campaign.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] uppercase tracking-wide text-muted-foreground">
          {campaign.category ?? "Campaign"}
        </div>
      )}
      {size !== "sm" && campaign.category && (
        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-[3px] text-center text-[9px] font-semibold capitalize leading-none text-primary backdrop-blur-[3px]">
          {campaign.category}
        </span>
      )}
    </div>
  );
}

export function BookmarkButton({ id, className }: { id: string; className?: string }) {
  const { isSaved, toggle } = useSavedCampaigns();
  const { toast } = useToast();
  const saved = isSaved(id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from My Campaigns" : "Save to My Campaigns"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(id);
        toast({ title: saved ? "Removed from My Campaigns" : "Saved to My Campaigns" });
      }}
      className={cn(
        "press-scale focus-ring rounded-full p-1 transition-colors",
        saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Bookmark className="h-[17px] w-[17px]" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function barColor(pct: number) {
  if (pct >= 85) return "bg-alert-pink";
  if (pct >= 60) return "bg-alert-amber";
  return "bg-primary";
}


/** Explore card — Clipster layout: thumb, title, platforms, spend line, progress edge. */
export function CampaignCard({ campaign, index = 0 }: { campaign: CampaignCardData; index?: number }) {
  const used = campaignUsedPercent(campaign);
  const rate = Number(campaign.payout_per_1m_views ?? 0);
  const total = Number(campaign.budget_total ?? 0);

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      style={{ ["--i" as string]: index }}
      className="surface-card interactive-card focus-ring stagger-item block overflow-hidden"
    >
      <div className="flex items-start gap-3 p-3">
        <CampaignThumb campaign={campaign} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-[14.5px] font-semibold leading-snug text-foreground line-clamp-2">
              {campaign.title}
            </h3>
            <BookmarkButton id={campaign.id} className="-mr-0.5 -mt-0.5" />
          </div>
          <PlatformRow className="mt-1.5" platforms={campaign.platforms} size={14} />
        </div>
      </div>

      <div className="flex items-end justify-between px-3 pb-2">
        <div className="text-[15px] font-semibold text-foreground">
          {used}%
          <span className="text-[13.5px] font-medium text-muted-foreground"> / ${total.toLocaleString()}</span>
        </div>
        <div className="text-[15px] font-semibold text-foreground">
          ${rate.toLocaleString()}
          <span className="text-[11px] font-medium text-muted-foreground"> / 1M</span>
        </div>
      </div>

      <div className="mx-3 mb-3 h-[3px] overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barColor(used))}
          style={{ width: `${used}%` }}
        />
      </div>
    </Link>
  );
}
