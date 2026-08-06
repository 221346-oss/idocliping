import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, ArrowLeft } from "lucide-react";

type Camp = Tables<"campaigns"> & { brands?: { name: string } | null };

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("campaigns")
      .select("*, brands(name)")
      .eq("id", id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      toast({ title: "Load failed", description: error?.message, variant: "destructive" });
      return;
    }
    setCamp(data as Camp);

    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id);
    setSubmissionCount(count ?? 0);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (fn: string, successTitle: string) => {
    if (!id) return;
    setBusy(true);
    const { error } = await supabase.rpc(fn as any, { p_campaign_id: id });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: successTitle });
    void load();
  };

  if (loading || !camp) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const spent = Math.max(0, Number(camp.budget_total ?? 0) - Number(camp.budget_remaining ?? 0));
  const pct = Number(camp.budget_total) > 0 ? Math.min(100, (spent / Number(camp.budget_total)) * 100) : 0;

  return (
    <AppLayout>
      <PageHeader
        title={camp.title}
        description={`${camp.brands?.name ?? "—"} · Category ${camp.category}`}
        actions={
          <Button variant="outline" size="sm" className="h-7 text-[12px]" asChild>
            <Link to="/admin/campaigns" className="gap-1">
              <ArrowLeft className="h-3 w-3" /> Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-3xl animate-fade-in space-y-4 p-6">
        <section className="space-y-2 rounded-md border border-border p-4 text-[13px]">
          <div>
            Budget used: ${spent.toLocaleString(undefined, { maximumFractionDigits: 2 })} / $
            {(Number(camp.budget_total) || 0).toLocaleString()} ({pct.toFixed(0)}%)
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <div>Payout / 1M views: ${Number(camp.payout_per_1m_views).toFixed(2)}</div>
          <div className="text-muted-foreground">Platforms: {(camp.platforms ?? []).join(", ") || "—"}</div>
          <div>Status: {camp.status}</div>
          <div>Submissions: {submissionCount}</div>
        </section>

        <section className="flex flex-wrap gap-2 rounded-md border border-border p-4">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run("admin_set_campaign_review", "Campaign moved to final review")}>
            Send to final review
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run("admin_reactivate_campaign", "Campaign is live again")}>
            Back to active
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void run("admin_payout_campaign", "All eligible posts paid out")}>
            Approve all & pay out
          </Button>
        </section>

        {camp.description ? (
          <section className="rounded-md border border-border p-4 text-[13px] whitespace-pre-wrap">
            {camp.description}
          </section>
        ) : null}
      </div>

    </AppLayout>
  );
}
