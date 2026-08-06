import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Eye, FileText, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { DataRow, ListSection } from "@/components/ui-kit/DataBits";
import { StatusChip, normalizeStatus } from "@/components/ui-kit/StatusChip";
import { RowListSkeleton, StatBlockSkeleton } from "@/components/ui-kit/Skeletons";
import { EmptyState } from "@/components/EmptyState";

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
  earnings?: { amount: number; created_at: string }[];
  campaigns?: { id: string; title: string; thumbnail_url: string | null; payout_per_1m_views?: number | null } | null;
};

const STATUS_COPY: Record<string, string> = {
  processing: "We're verifying your post and counting views. Earnings appear once verification completes.",
  eligible: "Your post is verified. Earnings accrue as views grow and are paid at the next payout.",
  paid: "This submission has been paid out to your wallet.",
  rejected: "This submission was rejected. Check the reason below — you can appeal from the campaign view.",
  ineligible: "This submission didn't meet the campaign requirements, so it won't earn.",
  neutral: "Status unavailable.",
};

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
  const earned = (row?.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const views = Number(row?.manual_views ?? 0);
  const rate = Number(row?.campaigns?.payout_per_1m_views ?? 0);

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
              actionTo="/creator/submissions"
            />
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:space-y-0">
            <div className="min-w-0 space-y-4">
              <section className="surface-card relative overflow-hidden p-5 text-center">
                <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Earned from this post
                  </div>
                  <div className="display-figure mt-2 text-[38px] leading-none text-primary">
                    ${earned.toFixed(2)}
                  </div>
                  <div className="mt-3 flex justify-center">
                    <StatusChip status={status} />
                  </div>
                  <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                    {STATUS_COPY[status] ?? STATUS_COPY.neutral}
                  </p>
                </div>
              </section>

              <ListSection title="Performance">
                <div className="px-4 py-1">
                  <DataRow label="Views counted" value={views.toLocaleString()} />
                  <DataRow label="Rate" value={rate ? `$${rate.toFixed(2)} / 1M views` : "—"} />
                  <DataRow label="Platform" value={PLATFORM_LABEL[row.platform] ?? row.platform} />
                  <DataRow label="Submitted" value={new Date(row.created_at).toLocaleDateString()} />
                </div>
              </ListSection>

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
                  onClick={() => navigate(`/creator/campaigns/${row.campaigns!.id}`)}
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
