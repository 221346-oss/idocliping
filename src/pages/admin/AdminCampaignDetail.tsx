import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, ArrowLeft } from "lucide-react";

type Camp = Tables<"campaigns"> & { brands?: { name: string } | null };

function invokeEdge(fn: string, body: Record<string, unknown>, token: string) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error ?? r.statusText);
    return j;
  });
}

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [camp, setCamp] = useState<Camp | null>(null);

  const [overrideCat, setOverrideCat] = useState(false);
  const [manualCat, setManualCat] = useState("music");
  const [slider, setSlider] = useState(25);
  const [assignRows, setAssignRows] = useState<Tables<"campaign_test_assignments">[]>([]);

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

    const { data: asg } = await supabase.from("campaign_test_assignments").select("*").eq("campaign_id", id).order(
      "scheduled_submit_at",
      { ascending: false },
    ).limit(200);
    setAssignRows(asg ?? []);
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    if (!camp?.category) return;
    if (["music", "clipping", "logo", "ugc"].includes(camp.category) && !overrideCat) {
      setManualCat(camp.category);
    }
  }, [camp?.category, overrideCat]);

  const token = session?.access_token;

  async function assign() {
    if (!token || !id) return;
    try {
      const cats = ["music", "clipping", "logo", "ugc"] as const;

      await invokeEdge(
        "schedule-test-submissions",
        {
          campaign_id: id,
          count: slider,
          ...(overrideCat && cats.includes(manualCat as typeof cats[number])
            ? { category: manualCat }
            : {}),
        },
        token,
      );
      toast({ title: "Scheduled", description: "Synthetic creators queued for this campaign." });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Assign failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  if (loading || !camp) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const buckets = ["music", "clipping", "logo", "ugc"];

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

      <div className="p-6 space-y-4 max-w-3xl animate-fade-in">
        <Tabs defaultValue="automation">
          <TabsList>
            <TabsTrigger value="automation" className="text-[12px]">Automation</TabsTrigger>
            <TabsTrigger value="overview" className="text-[12px]">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="automation" className="space-y-4 mt-4">
            <section className="border border-border rounded-md p-4 space-y-3">
              <h3 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                Assign test creators to this campaign
              </h3>
              <p className="text-[12px] text-muted-foreground">
                Matches specialists to <strong className="text-foreground capitalize">{manualCat}</strong> creators.
                Overrides let you detach from campaign category when you need crossover.
              </p>

              <div className="flex items-center gap-2">
                <Switch checked={overrideCat} onCheckedChange={setOverrideCat} id="oc2" />
                <Label htmlFor="oc2" className="text-[12px]">Category override</Label>
              </div>

              {overrideCat ? (
                <Select value={manualCat} onValueChange={setManualCat}>
                  <SelectTrigger className="max-w-xs h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map((c) => (
                      <SelectItem key={c} value={c} className="text-[13px]">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>How many creators?</span>
                  <span>{slider}</span>
                </div>
                <Slider min={1} max={200} value={[slider]} onValueChange={(v) => setSlider(v[0] ?? 1)} />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Submissions will be spaced 6–72h out with daytime UTC bias — see cron workers in Automation Lab docs.
              </p>

              <Button size="sm" className="h-8 text-[12px]" onClick={() => assign()}>
                Assign & schedule
              </Button>
            </section>

            <section className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 text-[12px] font-medium">
                Current assignments ({assignRows.length} shown)
              </div>
              <table className="w-full text-[12px]">
                <thead className="text-muted-foreground text-[10px] uppercase">
                  <tr>
                    <th className="text-left p-2">Creator ID</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {assignRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        No simulated assignments yet.
                      </td>
                    </tr>
                  ) : (
                    assignRows.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-2 font-mono text-[10px] truncate max-w-[160px]" title={r.test_creator_id}>
                          {r.test_creator_id.slice(0, 8)}…
                        </td>
                        <td className="p-2 capitalize">{r.submission_status}</td>
                        <td className="p-2 text-muted-foreground">
                          {new Date(r.scheduled_submit_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </TabsContent>

          <TabsContent value="overview" className="border border-border rounded-md mt-4 p-4 space-y-2 text-[13px]">
            <div>
              Budget: $
              {(Number(camp.budget_remaining) || 0).toLocaleString()} / $
              {(Number(camp.budget_total) || 0).toLocaleString()}
            </div>
            <div>Payout / 1M views: ${Number(camp.payout_per_1m_views).toFixed(2)}</div>
            <div className="text-muted-foreground">Platforms: {(camp.platforms ?? []).join(", ") || "—"}</div>
            <div>Status: {camp.status}</div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
