import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, ExternalLink, Eye, FileText, Info, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { DataRow, ListSection } from "@/components/ui-kit/DataBits";
import { normalizeStatus } from "@/components/ui-kit/StatusChip";
import { PlatformGlyph } from "@/components/ui-kit/SubmissionRow";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { relativeAge } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
};

type ReportRow = {
  id: string;
  platform: string;
  post_url: string;
  manual_views: number | null;
  status: string;
  created_at: string;
  reject_reason: string | null;
  total_views: number | null;
  eligible_views: number | null;
  engagement_rate: number | null;
  next_refresh_at: string | null;
  status_reason: string | null;
  earnings?: { amount: number; created_at: string }[];
  campaigns?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    payout_per_1m_views?: number | null;
  } | null;
};

/** Copy + visual treatment per lifecycle state. */
const STATE_META = {
  processing: {
    label: "Processing",
    headline: "Estimated earnings",
    copy: "We're verifying your post and counting views. This usually takes a few moments.",
    tone: "text-state-processing",
    ring: "border-state-processing/45 bg-state-processing/[0.12]",
    Icon: Clock,
  },
  eligible: {
    label: "Eligible",
    headline: "Earnings so far",
    copy: "Your post is verified. Earnings grow with views and are released when the campaign pays out.",
    tone: "text-state-eligible",
    ring: "border-state-eligible/45 bg-state-eligible/[0.12]",
    Icon: Check,
  },
  paid: {
    label: "Paid Out",
    headline: "Earned from this post",
    copy: "This submission has been paid out to your wallet.",
    tone: "text-state-paid",
    ring: "border-state-paid/45 bg-state-paid/[0.12]",
    Icon: Check,
  },
  ineligible: {
    label: "Ineligible",
    headline: "Earned from this post",
    copy: "This submission didn't meet the campaign requirements, so it won't earn.",
    tone: "text-state-ineligible",
    ring: "border-state-ineligible/45 bg-state-ineligible/[0.12]",
    Icon: X,
  },
  rejected: {
    label: "Rejected",
    headline: "Earned from this post",
    copy: "This submission was rejected. Check the reason below — you can appeal once from My Activity.",
    tone: "text-state-rejected",
    ring: "border-state-rejected/45 bg-state-rejected/[0.12]",
    Icon: X,
  },
  pending: {
    label: "In review",
    headline: "Pending earnings",
    copy: "The campaign reached its budget. An admin is doing the final review before payout.",
    tone: "text-state-processing",
    ring: "border-state-processing/45 bg-state-processing/[0.12]",
    Icon: Clock,
  },
  active: {
    label: "Active",
    headline: "Earnings so far",
    copy: "This submission is live.",
    tone: "text-state-eligible",
    ring: "border-state-eligible/45 bg-state-eligible/[0.12]",
    Icon: Check,
  },
  neutral: {
    label: "—",
    headline: "Earned from this post",
    copy: "Status unavailable.",
    tone: "text-muted-foreground",
    ring: "border-border bg-muted/40",
    Icon: Info,
  },
} as const;

export default function CreatorSubmissionReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, earnings(amount, created_at), campaigns(id, title, thumbnail_url, payout_per_1m_views)")
        .eq("id", id)
        .eq("creator_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setRow((data as ReportRow | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const status = normalizeStatus(row?.status);
  const meta = STATE_META[status] ?? STATE_META.neutral;
  const earned = (row?.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const views = Number(row?.manual_views ?? 0);
  const rate = Number(row?.campaigns?.payout_per_1m_views ?? 0);
  const totalViews = row?.total_views != null ? Number(row.total_views) : views;
  const eligibleViews = row?.eligible_views != null ? Number(row.eligible_views) : views;
  const engagement = row?.engagement_rate != null ? Number(row.engagement_rate) : null;
  const nextRefresh = row?.next_refresh_at ? new Date(row.next_refresh_at) : null;
  const zeroed = status === "ineligible" || status === "rejected";

  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Submission report" onBack={() => navigate(-1)} />

        {loading ? (
          <div className="space-y-4">
            <StatBlockSkeleton />
            <RowListSkeleton count={5} />
          </div>
        ) : !row ? (
          <div className="surface-card">
            <EmptyState
              icon={FileText}
              title="Report not found"
              description="This submission no longer exists."
              actionLabel="Back to activity"
              actionTo="/activity"
            />
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:space-y-0">
            <div className="min-w-0 space-y-4">
              <section className="surface-card relative overflow-hidden p-5 text-center">
                <div
                  className={cn(
                    "pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl",
                    status === "rejected" || status === "ineligible"
                      ? "bg-state-rejected/15"
                      : status === "processing" || status === "pending"
                        ? "bg-state-processing/15"
                        : "bg-primary/20",
                  )}
                />
                <div className="relative">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold",
                      meta.ring,
                      meta.tone,
                    )}
                  >
                    <meta.Icon className="h-3.5 w-3.5" strokeWidth={2.8} />
                    {meta.label}
                  </span>

                  <div className="mt-4 text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {meta.headline}
                  </div>
                  <div
                    className={cn(
                      "display-figure mt-1.5 text-[38px] leading-none",
                      zeroed ? "text-muted-foreground" : "text-primary",
                    )}
                  >
                    ${(zeroed ? 0 : earned).toFixed(2)}
                  </div>

                  <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                    {meta.copy}
                  </p>
                </div>
              </section>

              {row.campaigns && (
                <button
                  type="button"
                  onClick={() => navigate(`/campaigns/${row.campaigns!.id}`)}
                  className="surface-card interactive-card focus-ring flex w-full items-center gap-3 p-3.5 text-left"
                >
                  <img
                    src={row.campaigns.thumbnail_url || "/marketing-campaign-banner-fallback.svg"}
                    alt=""
                    loading="lazy"
                    className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{row.campaigns.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                      <PlatformGlyph platform={row.platform} />
                      {PLATFORM_LABEL[row.platform] ?? row.platform} · {relativeAge(row.created_at)}
                    </span>
                  </span>
                </button>
              )}

              <ListSection title="Performance">
                <div className="px-4 py-1">
                  <DataRow label="Total views" value={totalViews.toLocaleString()} />
                  <DataRow
                    label="Eligible views"
                    value={zeroed ? "0" : eligibleViews.toLocaleString()}
                  />
                  <DataRow
                    label="Engagement rate"
                    value={engagement != null ? `${engagement.toFixed(2)}%` : "—"}
                  />
                  <DataRow label="Rate" value={rate ? `$${rate.toFixed(2)} / 1M views` : "—"} />
                  <DataRow label="Platform" value={PLATFORM_LABEL[row.platform] ?? row.platform} />
                  <DataRow label="Submitted" value={new Date(row.created_at).toLocaleDateString()} />
                  <DataRow
                    label="Next stats refresh"
                    value={
                      status === "processing"
                        ? "In a few moments"
                        : nextRefresh
                          ? nextRefresh.toLocaleString()
                          : "Within 24h"
                    }
                  />
                </div>
              </ListSection>

              {row.status_reason && !row.reject_reason && (
                <section className="surface-card space-y-2 p-5">
                  <h2 className="font-display text-[15px] font-semibold">Status detail</h2>
                  <p className="flex gap-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {row.status_reason}
                  </p>
                </section>
              )}

              {row.reject_reason && (
                <section className="surface-card space-y-2 p-5">
                  <h2 className="font-display text-[15px] font-semibold">Reason</h2>
                  <p className="flex gap-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    {row.reject_reason}
                  </p>
                </section>
              )}
            </div>

            <div className="min-w-0 space-y-3 lg:sticky lg:top-24">
              <a href={row.post_url} target="_blank" rel="noreferrer" className="btn-outline-pill">
                <Eye className="h-4 w-4" /> View post
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {row.campaigns?.id && (
                <button
                  type="button"
                  className="btn-primary-pill"
                  onClick={() => navigate(`/campaigns/${row.campaigns!.id}`)}
                >
                  Open campaign
                </button>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
