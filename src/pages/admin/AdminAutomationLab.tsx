import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Trash2, Play, FlaskConical } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { formatCurrencySimple } from "@/lib/format-currency";

type BatchRow = Tables<"test_creator_batches">;

const DEFAULT_DIST = { clipping: 200, ugc: 100, logo: 300, music: 400 };
type Bucket = keyof typeof DEFAULT_DIST;

const BUCKETS: Bucket[] = ["clipping", "ugc", "logo", "music"];

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

function StatTile({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="border border-border rounded-md p-4 bg-muted/20">
      <div className="flex items-start gap-2">
        <div className="text-muted-foreground mt-0.5">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
          <div className="text-[20px] font-semibold mt-1 tabular-nums">{value}</div>
          {subtitle ? <div className="text-[11px] text-muted-foreground mt-1">{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminAutomationLab() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    creators: 0,
    submissions: 0,
    simEarn: 0,
    campaignsActive: 0,
    pendingAssign: 0,
    avgViews: 0,
  });
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [logs, setLogs] = useState<Tables<"automation_logs">[]>([]);
  const [batchNameInput, setBatchNameInput] = useState("");
  const [customDist, setCustomDist] = useState(false);
  const [distSliders, setDistSliders] = useState<Record<Bucket, number>>({ ...DEFAULT_DIST });
  const [generatingJob, setGeneratingJob] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [campaigns, setCampaigns] = useState<Array<{ id: string; title: string; category: string }>>([]);
  const [campId, setCampId] = useState("");
  const [overrideCat, setOverrideCat] = useState<boolean>(false);
  const [manualCat, setManualCat] = useState<string>("music");
  const [assignSlider, setAssignSlider] = useState(40);

  const [manualGrowResult, setManualGrowResult] = useState<string>("");
  const [manualSubResult, setManualSubResult] = useState<string>("");

  const [creatorModalBatch, setCreatorModalBatch] = useState<BatchRow | null>(null);
  const [recN, setRecN] = useState(0);
  const [creatorsModalRows, setCreatorsModalRows] = useState<
    Array<{ user_id: string; full_name: string | null; profile_slug: string | null }>
  >([]);

  const [nuclearTyping, setNuclearTyping] = useState("");
  const distSum = useMemo(() => BUCKETS.reduce((a, k) => a + Math.round(distSliders[k]), 0), [distSliders]);

  const reload = useCallback(async () => {
    const [{ count: creators }, { count: submissions }, { count: camps }, { count: pend }, avgRes] =
      await Promise.all([
        supabase.from("internal_creator_flags").select("*", { count: "exact", head: true }).eq(
          "is_test_creator",
          true,
        ),
        supabase.from("submissions").select("*", { count: "exact", head: true }).eq(
          "is_test_submission",
          true,
        ),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("campaign_test_assignments").select("*", { count: "exact", head: true }).eq(
          "submission_status",
          "pending",
        ),
        supabase
          .from("submissions")
          .select("manual_views")
          .eq("is_test_submission", true)
          .eq("status", "approved")
          .limit(50000),
      ]);

    /** Simulated earnings: sum submission-linked campaign earnings flagged as test (batched IDs). */
    const { data: testSubs } = await supabase.from("submissions").select("id").eq(
      "is_test_submission",
      true,
    );
    const ids = (testSubs ?? []).map((x) => x.id);
    let simEarn = 0;
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      if (!slice.length) continue;
      const { data: earnSlice } = await supabase.from("earnings").select("amount").in("submission_id", slice).eq(
        "type",
        "campaign",
      );
      earnSlice?.forEach((e) => (simEarn += Number((e as { amount: number }).amount)));
    }

    let avgViews = 0;
    const vrows = avgRes.data ?? [];
    if (vrows.length) {
      const s = vrows.reduce((a, r: { manual_views: number }) => a + Number(r.manual_views ?? 0), 0);
      avgViews = Math.round(s / vrows.length);
    }

    setStats({
      creators: creators ?? 0,
      submissions: submissions ?? 0,
      simEarn,
      campaignsActive: camps ?? 0,
      pendingAssign: pend ?? 0,
      avgViews,
    });

    const [{ data: b }, { data: lg }, { data: cmap }] = await Promise.all([
      supabase.from("test_creator_batches").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("automation_logs").select("*").order("run_at", { ascending: false }).limit(20),
      supabase.from("campaigns").select("id,title,category").eq("status", "active").order("created_at", {
        ascending: false,
      }).limit(200),
    ]);
    setBatches(b ?? []);
    setLogs(lg ?? []);
    setCampaigns((cmap ?? []) as Array<{ id: string; title: string; category: string }>);
    setCampId((pid) => pid || cmap?.[0]?.id || "");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const c = campaigns.find((x) => x.id === campId);
    if (c?.category && ["music", "clipping", "logo", "ugc"].includes(c.category) && !overrideCat) {
      setManualCat(c.category);
    }
  }, [campId, campaigns, overrideCat]);

  const token = session?.access_token;

  /** Realtime generation progress */
  useEffect(() => {
    if (!generatingJob) return;
    const ch = supabase
      .channel(`automation_gen_${generatingJob}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "automation_generation_jobs",
          filter: `id=eq.${generatingJob}`,
        },
        async () => {
          const { data } = await supabase
            .from("automation_generation_jobs")
            .select("progress_pct,status")
            .eq("id", generatingJob)
            .maybeSingle();

          const row = data as { progress_pct: number; status: string } | null;
          if (row?.progress_pct != null) setProgress(row.progress_pct);
          if (row?.status === "completed") {
            toast({ title: "Generation complete", description: "Test creators ready." });
            setGeneratingJob(null);
            await reload();
          }
          if (row?.status === "failed") {
            toast({
              title: "Generation failed",
              description: "See job row or Supabase logs.",
              variant: "destructive",
            });
            setGeneratingJob(null);
            await reload();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [generatingJob, reload, toast]);

  async function generate() {
    if (!token) return;
    try {
      if (customDist && distSum !== 1000) {
        toast({
          title: "Distribution invalid",
          description: `Totals must equal 1000 (currently ${distSum}).`,
          variant: "destructive",
        });
        return;
      }
      const d = customDist ? distSliders : DEFAULT_DIST;

      const res = await invokeEdge(
        "generate-test-creators",
        {
          batch_name: batchNameInput.trim() || undefined,
          distribution: {
            clipping: Math.round(d.clipping),
            ugc: Math.round(d.ugc),
            logo: Math.round(d.logo),
            music: Math.round(d.music),
          },
        },
        token,
      ) as { job_id?: string };
      toast({ title: "Generation started", description: "Monitoring progress via Realtime…" });

      const jid = res.job_id;
      setGeneratingJob(jid ?? null);
      setProgress(0);
      await reload();
    } catch (e: unknown) {
      toast({
        title: "Generate failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  async function assignSchedule() {
    if (!token || !campId) return;

    try {
      const bucketCats = ["music", "clipping", "logo", "ugc"] as const;

      await invokeEdge(
        "schedule-test-submissions",
        {
          campaign_id: campId,
          count: assignSlider,
          ...(overrideCat && bucketCats.includes(manualCat as (typeof bucketCats)[number])
            ? { category: manualCat }
            : {}),
        },
        token,
      );
      toast({ title: "Creators assigned", description: "Submissions queued over the next hours." });
      await reload();
    } catch (e: unknown) {
      toast({
        title: "Assignment failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  async function runSubsRpc() {
    setManualSubResult("");
    const { data, error } = await supabase.rpc("automation_run_submissions_manual");
    if (error) {
      setManualSubResult(error.message);
      toast({ title: "Submission worker failed", description: error.message, variant: "destructive" });
    } else {
      setManualSubResult(JSON.stringify(data));
      toast({ title: "Submission worker finished" });
    }
    await reload();
  }

  async function runGrowRpc() {
    setManualGrowResult("");
    const { data, error } = await supabase.rpc("automation_run_grow_manual");
    if (error) {
      setManualGrowResult(error.message);
      toast({ title: "Views worker failed", description: error.message, variant: "destructive" });
    } else {
      setManualGrowResult(JSON.stringify(data));
      toast({ title: "Views growth worker finished" });
    }
    await reload();
  }

  async function openCreators(batch: BatchRow) {
    const { data: flags } = await supabase
      .from("internal_creator_flags")
      .select("user_id")
      .eq("test_batch_id", batch.id);

    const uids = (flags ?? []).map((f) => f.user_id).filter(Boolean);
    if (!uids.length) {
      setCreatorsModalRows([]);
      setCreatorModalBatch(batch);
      return;
    }

    const { data: ps } = await supabase.from("profiles").select("user_id, full_name, profile_slug").in(
      "user_id",
      uids,
    );

    setCreatorsModalRows(
      (ps ?? []) as typeof creatorsModalRows,
    );
    setCreatorModalBatch(batch);
  }

  async function destroyBatch(batchId: string) {
    if (!token) return;
    try {
      await invokeEdge("destroy-test-batch", { batch_id: batchId }, token);
      toast({ title: "Batch destroyed" });
      await reload();
    } catch (e: unknown) {
      toast({
        title: "Destroy failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  async function destroyAll() {
    if (!token) return;
    try {
      await invokeEdge("destroy-all-test-creators", {}, token);
      toast({ title: "All test creators removed" });
      setNuclearTyping("");
      await reload();
    } catch (e: unknown) {
      toast({
        title: "Destroy all failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  async function resetRegenerate() {
    if (!token) return;
    try {
      await invokeEdge("destroy-all-test-creators", {}, token);
      setBatchNameInput(`Regenerated ${new Date().toISOString().slice(0, 10)}`);
      const res = await invokeEdge(
        "generate-test-creators",
        { distribution: DEFAULT_DIST },
        token,
      ) as { job_id?: string };
      toast({ title: "Reset queued", description: "Fresh batch is generating." });
      setGeneratingJob(res.job_id ?? null);
      setProgress(0);
      await reload();
    } catch (e: unknown) {
      toast({
        title: "Reset failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === campId);
  const canBucket = selectedCampaign?.category &&
    ["music", "clipping", "logo", "ugc"].includes(selectedCampaign.category);

  useEffect(() => {
    if (!campId) {
      setRecN(0);
      return;
    }
    (async () => {
      const cat = overrideCat
        ? manualCat
        : selectedCampaign?.category && ["music", "clipping", "logo", "ugc"].includes(selectedCampaign.category)
        ? selectedCampaign.category
        : null;
      if (!cat) {
        setRecN(0);
        return;
      }

      const { data: pf } = await supabase.from("profiles").select("user_id").eq(
        "category_specialty",
        cat as never,
      );
      const uids = (pf ?? []).map((p: { user_id: string }) => p.user_id);
      if (!uids.length) {
        setRecN(0);
        return;
      }
      const { data: tg } = await supabase.from("internal_creator_flags").select("user_id").eq(
        "is_test_creator",
        true,
      ).in("user_id", uids.slice(0, 2500));

      let pool = (tg ?? []).map((x) => x.user_id);
      if (!pool.length && uids.length) {
        pool = [...uids];
      }
      const { data: taken } = await supabase
        .from("campaign_test_assignments")
        .select("test_creator_id")
        .eq("campaign_id", campId);
      const tset = new Set((taken ?? []).map((t: { test_creator_id: string }) => t.test_creator_id));
      setRecN(pool.filter((u) => !tset.has(u)).length);
    })();
  }, [campId, manualCat, overrideCat, selectedCampaign?.category]);

  return (
    <AppLayout>
      <PageHeader
        title="Automation Lab"
        description="Synthetic creators, scheduled submissions, and growth workers driven by pg_cron (see manual SQL)."
        actions={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
      />

      <div className="p-6 space-y-8 animate-fade-in max-w-[1200px]">
        {/* Overview */}
        <div className="grid md:grid-cols-3 gap-3">
          <StatTile icon={<Bot className="h-4 w-4" />} title="🤖 Test Creators" value={stats.creators} subtitle="internal flags" />
          <StatTile
            icon={<span className="text-[13px]">📤</span>}
            title="Submissions"
            value={stats.submissions}
            subtitle="Synthetic posts"
          />
          <StatTile
            icon={<span className="text-[13px]">💰</span>}
            title="Fake earnings"
            value={formatCurrencySimple(stats.simEarn)}
            subtitle="sum of sim campaign rows"
          />
          <StatTile
            icon={<span className="text-[13px]">🎯</span>}
            title="Active campaigns"
            value={stats.campaignsActive}
            subtitle=""
          />
          <StatTile
            icon={<span className="text-[13px]">⏳</span>}
            title="Pending scheduled"
            value={stats.pendingAssign}
            subtitle="assignment rows"
          />
          <StatTile
            icon={<span className="text-[13px]">📊</span>}
            title="Avg views"
            value={stats.avgViews.toLocaleString()}
            subtitle="approved test subs (≤50k sampled)"
          />
        </div>

        {/* Batch manager */}
        <section className="border border-border rounded-md overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 text-[12px] font-medium">Batch manager</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/20 text-muted-foreground text-[11px] uppercase">
                <tr>
                  <th className="text-left p-3">Batch</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-right p-3">Creators</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-muted-foreground text-center">
                      No batches yet — generate creators below.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-3 font-medium">{b.batch_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums">{b.creator_count}</td>
                      <td className="p-3 capitalize">{b.status}</td>
                      <td className="p-3 text-right space-x-2">
                        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => openCreators(b)}>
                          View creators
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="h-7 text-[11px]">
                              Destroy
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Destroy batch?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-8 text-[12px]">Cancel</AlertDialogCancel>
                              <Button
                                variant="destructive"
                                className="h-8 text-[12px]"
                                onClick={() => destroyBatch(b.id)}
                              >
                                Destroy batch
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Generator */}
        <section className="border border-border rounded-md p-4 space-y-4">
          <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Generator panel
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-[12px]">Batch name (optional)</Label>
              <Input value={batchNameInput} onChange={(e) => setBatchNameInput(e.target.value)} placeholder="Batch #…" />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="cust" checked={customDist} onCheckedChange={setCustomDist} />
              <Label htmlFor="cust" className="text-[12px]">Custom distribution (must total 1000)</Label>
            </div>

            {!customDist ? (
              <div className="text-[12px] text-muted-foreground">
                Locked distribution: clipping 200 · UGC 100 · Logo 300 · Music 400
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 flex-1 w-full">
                {BUCKETS.map((bk) => (
                  <div key={bk}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="uppercase">{bk}</span>
                      <span className="tabular-nums">{Math.round(distSliders[bk])}</span>
                    </div>
                    <Slider
                      value={[distSliders[bk]]}
                      max={900}
                      min={0}
                      step={10}
                      onValueChange={(v) => setDistSliders((d) => ({ ...d, [bk]: v[0] ?? 0 }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {customDist ? (
            <div className={cn("text-[12px]", distSum !== 1000 ? "text-destructive" : "text-muted-foreground")}>
              Running total: {distSum}
            </div>
          ) : null}

          {generatingJob ? (
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Realtime job {generatingJob}</div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : null}

          <Button className="h-10 px-8 text-[14px]" onClick={() => generate()}>
            🚀 Generate creators
          </Button>
        </section>

        {/* Campaign assignment */}
        <section className="border border-border rounded-md p-4 space-y-4">
          <div className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Campaign assignments
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[12px]">Campaign</Label>
              <Select value={campId} onValueChange={setCampId}>
                <SelectTrigger><SelectValue placeholder="Pick campaign" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-[12px] text-muted-foreground space-y-1">
              <div>
                Category: <span className="text-foreground capitalize">{selectedCampaign?.category ?? "—"}</span>
              </div>
              <div>
                Budget / rate from campaign record —{" "}
                <Link className="text-primary underline" to={`/admin/campaigns/${campId}`}>
                  open detail → Automation tab
                </Link>
              </div>
              <div className="text-muted-foreground">
                {!canBucket && !overrideCat
                  ? "This campaign category is not in the specialization pool — enable manual category."
                  : `Recommended creators available: ~${Math.min(recN, 200)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="oc" checked={overrideCat} onCheckedChange={setOverrideCat} />
            <Label htmlFor="oc" className="text-[12px]">Manual specialty override</Label>
          </div>

          {overrideCat ? (
            <Select value={manualCat} onValueChange={setManualCat}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["music", "clipping", "logo", "ugc"] as const).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">How many to assign?</span>
              <span>{assignSlider}</span>
            </div>
            <Slider value={[assignSlider]} min={1} max={200} onValueChange={(v) => setAssignSlider(v[0] ?? 1)} />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Submissions spread pseudo-randomly over the next 6–72h with ≥4h gaps per creator, biased to 09:00–23:59 UTC hours.
          </p>

          <Button size="sm" className="h-8 text-[12px]" onClick={() => assignSchedule()}>
            Assign & schedule
          </Button>
        </section>

        {/* Cron monitor */}
        <section className="border border-border rounded-md overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-medium uppercase tracking-wide">Cron monitor</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => runSubsRpc()}>
                <Play className="h-3 w-3" /> Run submission worker
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => runGrowRpc()}>
                <Play className="h-3 w-3" /> Run views worker
              </Button>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2 text-[11px] text-muted-foreground">
            <div>{manualSubResult ? `Submission JSON: ${manualSubResult}` : null}</div>
            <div>{manualGrowResult ? `Grow JSON: ${manualGrowResult}` : null}</div>
          </div>
          <table className="w-full text-[13px]">
            <thead className="bg-muted/20 text-muted-foreground text-[11px] uppercase">
              <tr>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Job</th>
                <th className="text-right p-3">Processed</th>
                <th className="text-right p-3">Errors</th>
                <th className="text-right p-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3">{new Date(l.run_at).toLocaleString()}</td>
                  <td className="p-3">{l.job_name}</td>
                  <td className="p-3 text-right tabular-nums">{l.items_processed}</td>
                  <td className="p-3 text-right tabular-nums">{l.errors_count}</td>
                  <td className="p-3 text-right tabular-nums">{l.duration_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Danger */}
        <section className="border border-destructive/50 rounded-md p-4 space-y-3 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive font-medium text-[13px]">
            <Trash2 className="h-4 w-4" /> Nuclear options
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[12px] text-muted-foreground">
                Deletes every flagged test account, clears related rows (submissions that still exist via auth delete may need manual cleanup — service destroy handles earnings & subs first).
              </p>
              <div className="flex gap-2 items-end flex-wrap">
                <Input
                  value={nuclearTyping}
                  onChange={(e) => setNuclearTyping(e.target.value)}
                  placeholder="Type DESTROY to enable"
                  className="max-w-[200px] h-8 text-[12px]"
                />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-[12px]"
                      disabled={nuclearTyping.trim() !== "DESTROY"}
                    >
                      💣 DESTROY ALL TEST CREATORS
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Destroy all simulated creators?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="h-8 text-[12px]">Cancel</AlertDialogCancel>
                      <Button variant="destructive" className="h-8 text-[12px]" onClick={() => destroyAll()}>
                        Confirm destroy
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-10 border-destructive text-destructive">
                    🔄 RESET & regenerate (1000)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rotate the entire simulated population?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 text-[12px]">Cancel</AlertDialogCancel>
                    <Button className="h-8 text-[12px]" onClick={() => resetRegenerate()}>Proceed</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!creatorModalBatch} onOpenChange={() => setCreatorModalBatch(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[14px]">{creatorModalBatch?.batch_name ?? "Batch"} creators</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-[13px] max-h-[50vh] overflow-y-auto divide-y divide-border">
            {creatorsModalRows.length === 0 ? (
              <p className="text-muted-foreground text-[12px]">None found (possibly destroyed).</p>
            ) : (
              creatorsModalRows.map((r) => (
                <div key={r.user_id} className="py-1.5">
                  <span className="font-medium">{r.full_name ?? "—"}</span>
                  <span className="text-muted-foreground text-[11px] ml-2">
                    @{r.profile_slug ?? r.user_id.slice(0, 8)}
                  </span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreatorModalBatch(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
