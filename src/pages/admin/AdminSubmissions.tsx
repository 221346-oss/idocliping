import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Check, X, ExternalLink, RotateCcw, Ban, MessageSquareWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submissionStatusLabel } from "@/lib/submission-status";
import { cn } from "@/lib/utils";

type Appeal = {
  id: string;
  submission_id: string;
  creator_id: string;
  message: string;
  status: string;
  admin_note: string;
  created_at: string;
  submissions?: { post_url: string; platform: string; campaigns?: { title: string } };
};

export default function AdminSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [appealModal, setAppealModal] = useState<{ appeal: Appeal; mode: "reopen" | "dismiss" } | null>(null);
  const [appealAdminNote, setAppealAdminNote] = useState("");
  const [appealsUnsupported, setAppealsUnsupported] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("submissions")
      .select("*, campaigns(title, payout_per_1m_views, budget_remaining, id)")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.creator_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
    setRows((data ?? []).map((r: any) => ({ ...r, _creatorName: map.get(r.creator_id) })));

    const { data: appData, error: appErr } = await supabase
      .from("submission_appeals")
      .select("*, submissions(post_url, platform, campaigns(title))")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (appErr) {
      if (
        appErr.message?.includes("submission_appeals") ||
        appErr.message?.includes("Could not find") ||
        appErr.code === "PGRST205"
      ) {
        setAppealsUnsupported(true);
        setAppeals([]);
      }
    } else {
      setAppealsUnsupported(false);
      setAppeals((appData ?? []) as Appeal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (row: any) => {
    if (!user) return;
    const views = Number(editing[row.id] ?? row.manual_views ?? 0);
    const payout = Number(row.campaigns?.payout_per_1m_views ?? 0);
    const earned = (views / 1_000_000) * payout;

    const { error: e1 } = await supabase
      .from("submissions")
      .update({
        status: "approved",
        manual_views: views,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (e1) return toast({ title: "Failed", description: e1.message, variant: "destructive" });

    if (earned > 0) {
      await supabase.from("earnings").insert({
        creator_id: row.creator_id,
        submission_id: row.id,
        amount: earned,
        type: "campaign",
      });
      const remaining = Math.max(0, Number(row.campaigns?.budget_remaining ?? 0) - earned);
      await supabase.from("campaigns").update({ budget_remaining: remaining }).eq("id", row.campaigns.id);

      const { data: ref } = await supabase
        .from("referrals")
        .select("referrer_id, commission_rate")
        .eq("referred_user_id", row.creator_id)
        .maybeSingle();
      if (ref) {
        await supabase.from("earnings").insert({
          creator_id: ref.referrer_id,
          submission_id: row.id,
          amount: earned * Number(ref.commission_rate),
          type: "referral",
        });
      }
    }
    toast({ title: "Approved", description: `Earned $${earned.toFixed(2)}` });
    load();
  };

  const confirmReject = async () => {
    if (!user || !rejectTarget) return;
    const reason = rejectReason.trim() || "No reason provided";
    const { error } = await supabase
      .from("submissions")
      .update({
        status: "rejected",
        reject_reason: reason,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejectTarget.id);
    if (error) return toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    toast({ title: "Rejected" });
    setRejectTarget(null);
    setRejectReason("");
    load();
  };

  const reopenFromAppeal = async () => {
    if (!user || !appealModal || appealModal.mode !== "reopen") return;
    const a = appealModal.appeal;
    const note = appealAdminNote.trim() || "Submission returned to review queue.";
    const { error: e1 } = await supabase
      .from("submissions")
      .update({
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
        reject_reason: null,
      })
      .eq("id", a.submission_id);
    if (e1) return toast({ title: "Failed", description: e1.message, variant: "destructive" });

    const { error: e2 } = await supabase
      .from("submission_appeals")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        admin_note: note,
      })
      .eq("id", a.id);
    if (e2) return toast({ title: "Appeal update failed", description: e2.message, variant: "destructive" });

    toast({ title: "Submission back in queue" });
    setAppealModal(null);
    setAppealAdminNote("");
    load();
  };

  const dismissAppeal = async () => {
    if (!user || !appealModal || appealModal.mode !== "dismiss") return;
    const a = appealModal.appeal;
    const note = appealAdminNote.trim() || "Appeal reviewed; decision unchanged.";
    const { error } = await supabase
      .from("submission_appeals")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        admin_note: note,
      })
      .eq("id", a.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Appeal closed" });
    setAppealModal(null);
    setAppealAdminNote("");
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Submission review" description="Verify posts, approve payouts, and resolve appeals." />
      <div className="p-6 space-y-8">
        {!appealsUnsupported && appeals.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 h-10 flex items-center gap-2 border-b border-border bg-muted/20">
              <MessageSquareWarning className="h-4 w-4 text-warning" />
              <h2 className="text-[13px] font-medium">Appeals ({appeals.length})</h2>
            </div>
            <ul className="divide-y divide-border">
              {appeals.map((a) => (
                <li key={a.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-[13px]">
                    <div className="font-medium">{a.submissions?.campaigns?.title ?? "Campaign"}</div>
                    <a
                      href={a.submissions?.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground break-all"
                    >
                      <span className="capitalize">{a.submissions?.platform}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">{a.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[12px]"
                      onClick={() => {
                        setAppealModal({ appeal: a, mode: "reopen" });
                        setAppealAdminNote("");
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Return to queue
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-[12px]"
                      onClick={() => {
                        setAppealModal({ appeal: a, mode: "dismiss" });
                        setAppealAdminNote("");
                      }}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">No submissions yet.</div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Creator</th>
                  <th className="text-left p-3">Campaign</th>
                  <th className="text-left p-3">Post</th>
                  <th className="text-left p-3">Views</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{r._creatorName ?? "—"}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.campaigns?.title ?? "—"}</td>
                    <td className="p-3">
                      <a
                        href={r.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <span className="capitalize">{r.platform}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="p-3">
                      {r.status === "pending" ? (
                        <Input
                          type="number"
                          defaultValue={r.manual_views}
                          onChange={(e) => setEditing((p) => ({ ...p, [r.id]: e.target.value }))}
                          className="h-7 w-28 text-[12px]"
                        />
                      ) : (
                        Number(r.manual_views).toLocaleString()
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-medium",
                          r.status === "approved"
                            ? "bg-primary/15 text-primary border border-primary/25"
                            : r.status === "rejected"
                              ? "bg-destructive/15 text-destructive border border-destructive/25"
                              : "bg-warning/15 text-warning border border-warning/25",
                        )}
                      >
                        {submissionStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {r.status === "pending" && (
                        <div className="inline-flex gap-1 justify-end">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => approve(r)} title="Approve">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => {
                              setRejectTarget(r);
                              setRejectReason("");
                            }}
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[15px]">Reject submission</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-muted-foreground">
            The creator will see this as <strong>Ineligible</strong> with your reason.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason shown to creator…"
            className="min-h-[88px] text-[13px]"
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void confirmReject()}>
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!appealModal}
        onOpenChange={(o) => {
          if (!o) {
            setAppealModal(null);
            setAppealAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {appealModal?.mode === "dismiss" ? "Dismiss appeal" : "Return submission to queue"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-muted-foreground">
            {appealModal?.mode === "dismiss"
              ? "The submission stays rejected. Add a short note the creator can read."
              : "This moves the submission back to Processing so you can review it again."}
          </p>
          <Textarea
            value={appealAdminNote}
            onChange={(e) => setAppealAdminNote(e.target.value)}
            placeholder="Note for the creator (optional)…"
            className="min-h-[80px] text-[13px]"
          />
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAppealModal(null);
                setAppealAdminNote("");
              }}
            >
              Cancel
            </Button>
            {appealModal?.mode === "dismiss" ? (
              <Button type="button" size="sm" onClick={() => void dismissAppeal()}>
                Close appeal
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => void reopenFromAppeal()}>
                Confirm & re-queue
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
