import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, ArrowLeft, MoreHorizontal, ExternalLink } from "lucide-react";
import { StatusChip, normalizeStatus } from "@/components/ui-kit/StatusChip";
import { cn } from "@/lib/utils";

type Camp = Tables<"campaigns"> & { brands?: { name: string } | null };

type SubRow = {
  id: string;
  creator_id: string;
  platform: string;
  post_url: string;
  status: string;
  manual_views: number | null;
  total_views: number | null;
  created_at: string;
  earnings?: { amount: number; status: string }[];
  profiles?: { full_name: string | null; creator_public_id: string | null } | null;
};

type TabKey = "overview" | "submissions" | "analytics";

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const [viewsFor, setViewsFor] = useState<SubRow | null>(null);
  const [viewsDraft, setViewsDraft] = useState("");
  const [engagementDraft, setEngagementDraft] = useState("");
  const [rejectFor, setRejectFor] = useState<SubRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

    const { data: rows } = await supabase
      .from("submissions")
      .select("id, creator_id, platform, post_url, status, manual_views, total_views, created_at, earnings(amount, status)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    setSubs((rows as SubRow[]) ?? []);
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

  const saveViews = async () => {
    if (!viewsFor) return;
    const n = Math.max(0, Math.round(Number(viewsDraft.replace(/[^0-9]/g, "")) || 0));
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_submission_views", {
      p_submission_id: viewsFor.id,
      p_views: n,
    });
    setBusy(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Views updated" });
    setViewsFor(null);
    void load();
  };

  const approve = async (s: SubRow) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_approve_submission", { p_submission_id: s.id });
    setBusy(false);
    if (error) return toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    toast({ title: "Submission approved & paid" });
    void load();
  };

  const reject = async () => {
    if (!rejectFor) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_reject_submission", {
      p_submission_id: rejectFor.id,
      p_reason: rejectReason.trim(),
    });
    setBusy(false);
    if (error) return toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    toast({ title: "Submission rejected", description: "Views dismissed and budget restored." });
    setRejectFor(null);
    setRejectReason("");
    void load();
  };

  const analytics = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byPlatform = new Map<string, { count: number; views: number; earned: number }>();
    let views = 0;
    let earned = 0;
    let paid = 0;

    subs.forEach((s) => {
      const st = normalizeStatus(s.status);
      byStatus.set(st, (byStatus.get(st) ?? 0) + 1);
      const v = Number(s.total_views ?? s.manual_views ?? 0);
      const e = (s.earnings ?? []).reduce((a, x) => a + Number(x.amount), 0);
      const p = (s.earnings ?? []).filter((x) => x.status === "paid").reduce((a, x) => a + Number(x.amount), 0);
      views += v;
      earned += e;
      paid += p;
      const key = String(s.platform);
      const cur = byPlatform.get(key) ?? { count: 0, views: 0, earned: 0 };
      byPlatform.set(key, { count: cur.count + 1, views: cur.views + v, earned: cur.earned + e });
    });

    const creators = new Set(subs.map((s) => s.creator_id)).size;
    return { byStatus, byPlatform, views, earned, paid, creators };
  }, [subs]);

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

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "submissions", label: `Submissions (${subs.length})` },
    { key: "analytics", label: "Analytics" },
  ];

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

      <div className="max-w-5xl animate-fade-in space-y-4 p-6">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
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
              <div>Submissions: {subs.length}</div>
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
              <section className="whitespace-pre-wrap rounded-md border border-border p-4 text-[13px]">
                {camp.description}
              </section>
            ) : null}
          </>
        )}

        {tab === "submissions" && (
          <section className="overflow-hidden rounded-md border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Post</th>
                    <th className="p-3 text-left">Platform</th>
                    <th className="p-3 text-right">Views</th>
                    <th className="p-3 text-right">Earned</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="w-[60px] p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No submissions for this campaign yet.
                      </td>
                    </tr>
                  ) : (
                    subs.map((s) => {
                      const earned = (s.earnings ?? []).reduce((a, e) => a + Number(e.amount), 0);
                      return (
                        <tr key={s.id} className="border-t border-border hover:bg-muted/5">
                          <td className="max-w-[300px] p-3">
                            <a href={s.post_url} target="_blank" rel="noreferrer" className="block truncate underline">
                              {s.post_url}
                            </a>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(s.created_at).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 capitalize">{s.platform}</td>
                          <td className="p-3 text-right tabular-nums">
                            {Number(s.total_views ?? s.manual_views ?? 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right tabular-nums">${earned.toFixed(2)}</td>
                          <td className="p-3">
                            <StatusChip status={normalizeStatus(s.status)} size="sm" />
                          </td>
                          <td className="p-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setViewsFor(s);
                                    setViewsDraft(String(s.total_views ?? s.manual_views ?? 0));
                                  }}
                                >
                                  Update views
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => void approve(s)}>
                                  Approve &amp; pay
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => {
                                    setRejectFor(s);
                                    setRejectReason("");
                                  }}
                                >
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <a href={s.post_url} target="_blank" rel="noreferrer" className="gap-2">
                                    <ExternalLink className="h-3.5 w-3.5" /> Open post
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "analytics" && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Total views", value: analytics.views.toLocaleString() },
                { label: "Creators", value: String(analytics.creators) },
                { label: "Earnings accrued", value: `$${analytics.earned.toFixed(2)}` },
                { label: "Paid out", value: `$${analytics.paid.toFixed(2)}` },
              ].map((s) => (
                <div key={s.label} className="rounded-md border border-border p-4">
                  <div className="text-[20px] font-semibold tabular-nums">{s.value}</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <section className="rounded-md border border-border p-4">
              <h3 className="mb-3 text-[13px] font-semibold">By status</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(analytics.byStatus.entries()).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-2">
                    <StatusChip status={k} size="sm" />
                    <span className="text-[13px] tabular-nums text-muted-foreground">{v}</span>
                  </span>
                ))}
                {analytics.byStatus.size === 0 && (
                  <span className="text-[13px] text-muted-foreground">No data yet.</span>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Platform</th>
                    <th className="p-3 text-right">Posts</th>
                    <th className="p-3 text-right">Views</th>
                    <th className="p-3 text-right">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(analytics.byPlatform.entries()).map(([k, v]) => (
                    <tr key={k} className="border-t border-border">
                      <td className="p-3 capitalize">{k}</td>
                      <td className="p-3 text-right tabular-nums">{v.count}</td>
                      <td className="p-3 text-right tabular-nums">{v.views.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums">${v.earned.toFixed(2)}</td>
                    </tr>
                  ))}
                  {analytics.byPlatform.size === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>

      <Dialog open={!!viewsFor} onOpenChange={(o) => !o && setViewsFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Update views</DialogTitle>
          </DialogHeader>
          <Input
            value={viewsDraft}
            inputMode="numeric"
            onChange={(e) => setViewsDraft(e.target.value)}
            placeholder="Verified views — e.g. 24000"
          />
          <Input
            value={engagementDraft}
            inputMode="decimal"
            onChange={(e) => setEngagementDraft(e.target.value)}
            placeholder="Engagement rate % — e.g. 4.2"
          />
          <p className="text-[12px] text-muted-foreground">
            Earnings recalculate from the campaign rate and caps. If the engagement rate is below the campaign minimum,
            the post is marked ineligible and its earning is dropped.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setViewsFor(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void saveViews()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Reject submission</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason shown to the creator (e.g. view botting detected)…"
            className="min-h-[100px] text-[13px]"
          />
          <p className="text-[12px] text-muted-foreground">
            Views are dismissed and the campaign budget is restored.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void reject()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
