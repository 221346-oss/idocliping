import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton } from "@/components/ui-kit/Skeletons";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { AtSign, Check, Copy, Loader2, Plus, ShieldCheck, Trash2, Clock, Users } from "lucide-react";
import { makeVerificationCode } from "@/lib/verification-code";

type Account = {
  id: string;
  platform: string;
  handle: string;
  profile_url: string | null;
  verified: boolean;
  verification_code: string | null;
  verification_status: string;
  follower_count: number | null;
};

const makeCode = makeVerificationCode;

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", x: "X",
};

function StatusPill({ account }: { account: Account }) {
  if (account.verified || account.verification_status === "verified") {
    return (
      <span className="status-pill inline-flex items-center gap-1 border-success/30 bg-success/[0.12] text-success">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (account.verification_status === "pending") {
    return (
      <span className="status-pill inline-flex items-center gap-1 border-warning/30 bg-warning/[0.12] text-warning">
        <Clock className="h-3.5 w-3.5" /> In review
      </span>
    );
  }
  return <span className="status-pill border-border bg-surface-raised text-muted-foreground">Unverified</span>;
}

/** Connected accounts — link by pasting a public profile URL, verify via bio code. */
export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [verifyFor, setVerifyFor] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [unlinkFor, setUnlinkFor] = useState<{ account: Account; live: number } | null>(null);

  const [url, setUrl] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, handle, profile_url, verified, verification_code, verification_status, follower_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAccounts((data as Account[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Paste a profile link → we detect the platform + handle + followers automatically. */
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const link = url.trim();
    if (!link) return toast({ title: "Paste your profile link", variant: "destructive" });

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("verify-social-bio", {
      body: { profile_url: link },
    });
    if (error || (data as any)?.error) {
      setSaving(false);
      return toast({
        title: "Couldn't read that link",
        description: (data as any)?.error ?? "Use a public TikTok, Instagram, YouTube or X profile link.",
        variant: "destructive",
      });
    }

    const detected = data as { platform: string; handle: string; follower_count: number | null };

    const { error: upErr } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: detected.platform as any,
        handle: detected.handle.slice(0, 100),
        profile_url: link.slice(0, 500),
        follower_count: detected.follower_count,
        verification_code: makeCode(),
        verification_status: "unverified",
        verified: false,
      },
      { onConflict: "user_id,platform" },
    );
    setSaving(false);

    if (upErr) {
      const dupe = upErr.message.includes("social_accounts_platform_handle_uidx");
      return toast({
        title: dupe ? "Account already linked" : "Couldn't save",
        description: dupe
          ? "This account is already linked to another creator. Contact support if that's a mistake."
          : upErr.message,
        variant: "destructive",
      });
    }

    toast({
      title: `${PLATFORM_LABEL[detected.platform] ?? detected.platform} account added`,
      description: `@${detected.handle} — verify it to submit content.`,
    });
    setUrl("");
    setAddOpen(false);
    void load();
  };

  /** Unlinking is blocked while posts are live; forcing dismisses them. */
  const remove = async (a: Account, force = false) => {
    const { data, error } = await supabase.rpc("creator_unlink_social_account", {
      p_account_id: a.id,
      p_force: force,
    });
    if (error) return toast({ title: "Couldn't unlink", description: error.message, variant: "destructive" });

    const res = data as { blocked?: boolean; live_submissions?: number; dismissed_submissions?: number } | null;
    if (res?.blocked) {
      setUnlinkFor({ account: a, live: res.live_submissions ?? 0 });
      return;
    }
    setUnlinkFor(null);
    toast({
      title: "Account unlinked",
      description: res?.dismissed_submissions
        ? `${res.dismissed_submissions} live submission(s) were made ineligible.`
        : undefined,
    });
    void load();
  };

  const requestManualReview = async (a: Account) => {
    await supabase
      .from("social_accounts")
      .update({
        verification_status: "pending",
        verification_requested_at: new Date().toISOString(),
        verification_note: "Creator requested manual verification.",
      })
      .eq("id", a.id);
    setVerifyFor(null);
    toast({ title: "Sent for review", description: "An admin will verify this account shortly." });
    void load();
  };

  const runAutoCheck = async (a: Account) => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("verify-social-bio", {
      body: { account_id: a.id },
    });
    setChecking(false);

    if (error) {
      return toast({
        title: "Check failed",
        description: "We couldn't reach the verifier. Send it for manual review instead.",
        variant: "destructive",
      });
    }

    const status = (data as { status?: string; message?: string } | null)?.status;
    const message = (data as { message?: string } | null)?.message;

    if (status === "verified") {
      toast({ title: "Account verified", description: message });
      setVerifyFor(null);
    } else {
      toast({
        title: status === "unreadable" ? "Couldn't read your profile" : "Code not found yet",
        description: message ?? "Save the code in your bio, then check again.",
        variant: "destructive",
      });
    }
    void load();
  };

  const openVerify = async (a: Account) => {
    if (!a.verification_code) {
      const code = makeCode();
      await supabase.from("social_accounts").update({ verification_code: code }).eq("id", a.id);
      setVerifyFor({ ...a, verification_code: code });
      void load();
      return;
    }
    setVerifyFor(a);
  };

  return (
    <CreatorShell>
      <PageContainer className="min-w-0">
        <DetailHeader
          title="Connected accounts"
          action={
            <button type="button" onClick={() => setAddOpen(true)} aria-label="Add account" className="icon-pill h-10 w-10">
              <Plus className="h-[18px] w-[18px]" />
            </button>
          }
        />

        {loading ? (
          <RowListSkeleton count={4} />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={AtSign}
            title="No accounts connected"
            description="Paste a profile link — we detect the platform and handle. Submissions are only accepted from verified accounts."
            actionLabel="Add account"
            onAction={() => setAddOpen(true)}
          />
        ) : (
          <div className="list-group mb-8">
            {accounts.map((a) => (
              <div key={a.id} className="list-row">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">@{a.handle}</span>
                    <StatusPill account={a} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] capitalize text-muted-foreground">
                    {PLATFORM_LABEL[a.platform] ?? a.platform}
                    {a.follower_count != null && (
                      <span className="inline-flex items-center gap-1 normal-case">
                        <Users className="h-3 w-3" /> {a.follower_count.toLocaleString()} followers
                      </span>
                    )}
                  </p>
                </div>
                {!a.verified && a.verification_status !== "verified" && (
                  <button
                    type="button"
                    onClick={() => void openVerify(a)}
                    className="rounded-full border border-primary/30 bg-primary/[0.12] px-3 py-1.5 text-[12px] font-semibold text-primary press-scale focus-ring"
                  >
                    Verify
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(a)}
                  aria-label={`Remove ${a.handle}`}
                  className="icon-pill h-9 w-9"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetContent side="bottom" className="rounded-t-[28px] border-border">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-[18px]">Add account</SheetTitle>
            </SheetHeader>
            <form onSubmit={add} className="mt-4 space-y-4 pb-6">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Paste the link to your public profile — we detect the platform, your handle and your follower count
                automatically.
              </p>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@yourhandle"
                inputMode="url"
                className="h-12 rounded-2xl"
              />
              <button type="submit" disabled={saving} className="btn-primary-pill w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add account"}
              </button>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={!!verifyFor} onOpenChange={(o) => !o && setVerifyFor(null)}>
          <SheetContent side="bottom" className="rounded-t-[28px] border-border">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-[18px]">Verify ownership</SheetTitle>
            </SheetHeader>
            <div className="mt-3 space-y-4 pb-6">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Add this code anywhere in your {verifyFor?.platform} bio, save it, then tap check — we read your public
                profile and verify instantly. You can remove the code once verified.
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(verifyFor?.verification_code ?? "");
                  toast({ title: "Code copied" });
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3.5 press-scale focus-ring"
              >
                <span className="font-mono text-[14px] font-semibold">{verifyFor?.verification_code}</span>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                disabled={checking}
                onClick={() => verifyFor && void runAutoCheck(verifyFor)}
                className="btn-primary-pill w-full"
              >
                {checking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking your bio…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Check my bio
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => verifyFor && void requestManualReview(verifyFor)}
                className="w-full rounded-full border border-border bg-surface-raised px-4 py-3 text-[13px] font-medium text-muted-foreground press-scale focus-ring"
              >
                Send for manual review instead
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog open={!!unlinkFor} onOpenChange={(o) => !o && setUnlinkFor(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Unlink @{unlinkFor?.account.handle}?</AlertDialogTitle>
              <AlertDialogDescription>
                This account has {unlinkFor?.live} live submission(s) on running campaigns. Unlinking makes them
                ineligible and removes their pending earnings. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep account</AlertDialogCancel>
              <AlertDialogAction onClick={() => unlinkFor && void remove(unlinkFor.account, true)}>
                Unlink anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </CreatorShell>
  );
}
