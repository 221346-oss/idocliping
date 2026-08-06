import { Link } from "react-router-dom";
import { Bookmark, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformRow } from "@/components/brand/icons/NavGlyphs";
import { ProgressRate } from "./DataBits";
import { useSavedCampaigns } from "@/hooks/useSavedCampaigns";


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

export function isNewCampaign(c: CampaignCardData) {
  if (!c.created_at) return false;
  return Date.now() - +new Date(c.created_at) < 1000 * 60 * 60 * 24 * 7;
}

/** Square thumbnail with the category tag burned into the bottom-left corner. */
export function CampaignThumb({
  campaign,
  size = "md",
  className,
}: {
  campaign: CampaignCardData;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-11 w-11 rounded-xl" : size === "lg" ? "h-24 w-24 rounded-2xl" : "h-[68px] w-[68px] rounded-2xl";
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surface-raised", dims, className)}>
      {campaign.thumbnail_url ? (
        <img
          src={campaign.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] uppercase tracking-wide text-muted-foreground">
          {campaign.category ?? "Campaign"}
        </div>
      )}
      {size !== "sm" && campaign.category && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-3 text-[9.5px] font-semibold capitalize leading-none text-primary">
          {campaign.category}
        </span>
      )}
    </div>
  );
}

export function BookmarkButton({ id, className }: { id: string; className?: string }) {
  const { isSaved, toggle } = useSavedCampaigns();
  const saved = isSaved(id);
  return (
    <button
      type="button"
      aria-label={saved ? "Remove bookmark" : "Save campaign"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={cn(
        "press-scale focus-ring rounded-full p-1.5 transition-colors",
        saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Bookmark className="h-[18px] w-[18px]" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

/** Explore card — thumbnail left, title + platforms, then progress/rate. */
export function CampaignCard({
  campaign,
  index = 0,
}: {
  campaign: CampaignCardData;
  index?: number;
}) {
  const used = campaignUsedPercent(campaign);
  const rate = Number(campaign.payout_per_1m_views ?? 0);
  const total = Number(campaign.budget_total ?? 0);

  return (
    <Link
      to={`/creator/campaigns/${campaign.id}`}
      style={{ ["--i" as string]: index }}
      className="surface-card interactive-card focus-ring stagger-item block p-3.5"
    >
      <div className="flex items-start gap-3">
        <CampaignThumb campaign={campaign} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-[15.5px] font-semibold leading-snug line-clamp-2">
              {campaign.title}
            </h3>
            <BookmarkButton id={campaign.id} className="-mr-1 -mt-1" />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              All
            </span>
            <PlatformRow platforms={campaign.platforms} />
            {isNewCampaign(campaign) && (
              <span className="rounded-full bg-primary/[0.14] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                New
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Active</span>
        <span>Rate</span>
      </div>
      <ProgressRate
        className="mt-1"
        percent={used}
        totalLabel={`$${total.toLocaleString()}`}
        rateLabel={`$${rate.toLocaleString()}`}
      />
    </Link>
  );
}

