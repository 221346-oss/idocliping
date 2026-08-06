import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { EmptyState } from "@/components/EmptyState";
import { RowListSkeleton } from "@/components/ui-kit/Skeletons";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { AtSign, Check, Copy, Loader2, Plus, ShieldCheck, Trash2, Clock } from "lucide-react";
import { makeVerificationCode } from "@/lib/verification-code";


const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
] as const;

type Account = {
  id: string;
  platform: string;
  handle: string;
  profile_url: string | null;
  verified: boolean;
  verification_code: string | null;
  verification_status: string;
};

const makeCode = makeVerificationCode;

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

/** Connected accounts + bio-code ownership verification. */
export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [verifyFor, setVerifyFor] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<string>("tiktok");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, handle, profile_url, verified, verification_code, verification_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAccounts((data as Account[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const h = handle.trim().replace(/^@/, "");
    if (!h) return toast({ title: "Handle required", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: platform as any,
        handle: h.slice(0, 100),
        profile_url: url.trim().slice(0, 500),
        verification_code: makeCode(),
        verification_status: "unverified",
        verified: false,
      },
      { onConflict: "user_id,platform" },
    );
    setSaving(false);
    if (error) return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    toast({ title: "Account added", description: "Verify it to submit content from this platform." });
    setHandle("");
    setUrl("");
    setAddOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id);
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
        description: "We couldn't reach the verifier. Try again in a moment.",
        variant: "destructive",
      });
    }

    const status = (data as { status?: string; message?: string } | null)?.status;
    const message = (data as { message?: string } | null)?.message;

    if (status === "verified") {
      toast({ title: "Account verified", description: message });
      setVerifyFor(null);
    } else if (status === "pending") {
      toast({ title: "Sent for review", description: message });
      setVerifyFor(null);
    } else {
      toast({
        title: "Code not found yet",
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
            description="Connect the accounts you post from — submissions are only accepted from verified accounts."
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
                  <p className="mt-0.5 text-[12px] capitalize text-muted-foreground">{a.platform}</p>
                </div>
                {!a.verified && a.verification_status !== "verified" && a.verification_status !== "pending" && (
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
                  onClick={() => void remove(a.id)}
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
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={
                      platform === p.value
                        ? "rounded-full border border-primary/40 bg-primary/[0.14] px-4 py-2 text-[13px] font-semibold text-primary press-scale focus-ring"
                        : "rounded-full border border-border bg-surface-raised px-4 py-2 text-[13px] text-muted-foreground press-scale focus-ring"
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="h-12 rounded-2xl"
              />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Profile link (optional)"
                className="h-12 rounded-2xl"
              />
              <button type="submit" disabled={saving} className="btn-primary-pill w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save account"}
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
                Add this code anywhere in your {verifyFor?.platform} bio, then submit for review. You can remove it once
                you're verified.
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
                onClick={() => verifyFor && void requestVerify(verifyFor)}
                className="btn-primary-pill w-full"
              >
                <Check className="h-4 w-4" /> I've added it — review my account
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </PageContainer>
    </CreatorShell>
  );
}
