import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users } from "lucide-react";
import { REFERRAL_RATE_LABEL } from "@/lib/referral";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function StatCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[12px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          mono
            ? "mt-1.5 font-mono text-[24px] font-semibold tracking-[0.08em] text-primary"
            : "display-figure mt-1.5 text-[24px]"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function CreatorReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string>("");
  const [referred, setReferred] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: codeRow } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!codeRow) {
        const newCode = generateCode();
        const { data } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode })
          .select()
          .single();
        codeRow = data;
      }
      setCode(codeRow?.code ?? "");

      const [{ data: refs }, { data: earn }] = await Promise.all([
        supabase.from("referrals").select("*").eq("referrer_id", user.id),
        supabase.from("earnings").select("amount").eq("creator_id", user.id).eq("type", "referral"),
      ]);
      setReferred(refs ?? []);
      setEarnings((earn ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0));
      setLoading(false);
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;

  const copy = () => {
    void navigator.clipboard.writeText(link);
    toast({ title: "Referral link copied" });
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join me and start earning", url: link });
        return;
      } catch {
        /* user dismissed */
      }
    }
    copy();
  };

  return (
    <CreatorShell>
      <PageContainer className="max-w-[900px] pb-10">
        <PageTitle>Referrals</PageTitle>
        <p className="-mt-2 mb-5 text-[14px] text-muted-foreground">
          Invite creators and earn {REFERRAL_RATE_LABEL} commission on everything they make.
        </p>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="surface-card space-y-2 p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-32" />
                </div>
              ))}
            </div>
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Your code" value={code} mono />
              <StatCard label="Referred creators" value={String(referred.length)} />
              <StatCard label="Commission earned" value={`$${earnings.toFixed(2)}`} />
            </div>

            <div className="surface-card space-y-3 p-4">
              <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Share this link</p>
              <p className="break-all rounded-xl bg-surface-raised px-3.5 py-3 font-mono text-[13px]">{link}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={share} className="btn-primary-pill h-11 flex-1 gap-2">
                  <Share2 className="h-[18px] w-[18px]" />
                  Share link
                </button>
                <button type="button" onClick={copy} className="btn-outline-pill h-11 flex-1 gap-2">
                  <Copy className="h-[18px] w-[18px]" />
                  Copy
                </button>
              </div>
            </div>

            {referred.length === 0 && (
              <EmptyState
                icon={Users}
                title="No referrals yet"
                description={`Share your link with fellow creators. You'll earn ${REFERRAL_RATE_LABEL} on every dollar they make — for life.`}
                className="py-10"
              />
            )}
          </div>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
