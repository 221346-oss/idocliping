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

  useEffect(() => {
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
    void load();
  }, [id, toast]);

  if (loading || !camp) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

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
            Budget: ${(Number(camp.budget_remaining) || 0).toLocaleString()} / $
            {(Number(camp.budget_total) || 0).toLocaleString()}
          </div>
          <div>Payout / 1M views: ${Number(camp.payout_per_1m_views).toFixed(2)}</div>
          <div className="text-muted-foreground">Platforms: {(camp.platforms ?? []).join(", ") || "—"}</div>
          <div>Status: {camp.status}</div>
          <div>Submissions: {submissionCount}</div>
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
