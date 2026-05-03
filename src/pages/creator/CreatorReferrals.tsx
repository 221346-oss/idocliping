import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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
      let { data: codeRow } = await supabase.from("referral_codes").select("*").eq("user_id", user.id).maybeSingle();
      if (!codeRow) {
        const newCode = generateCode();
        const { data } = await supabase.from("referral_codes").insert({ user_id: user.id, code: newCode }).select().single();
        codeRow = data;
      }
      setCode(codeRow?.code ?? "");

      const [{ data: refs }, { data: earn }] = await Promise.all([
        supabase.from("referrals").select("*, profiles!referrals_referred_user_id_fkey(full_name)").eq("referrer_id", user.id),
        supabase.from("earnings").select("amount").eq("creator_id", user.id).eq("type", "referral"),
      ]);
      setReferred(refs ?? []);
      setEarnings((earn ?? []).reduce((a: number, b: any) => a + Number(b.amount), 0));
      setLoading(false);
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;

  return (
    <AppLayout>
      <PageHeader title="Referrals" description="Invite creators and earn 5% commission on their earnings." />
      <div className="p-6 space-y-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-border rounded-md p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Your code</div>
              <div className="text-[22px] font-mono mt-1">{code}</div>
            </div>
            <div className="border border-border rounded-md p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Referred users</div>
              <div className="text-[22px] font-semibold mt-1">{referred.length}</div>
            </div>
            <div className="border border-border rounded-md p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Commission earned</div>
              <div className="text-[22px] font-semibold mt-1">${earnings.toFixed(2)}</div>
            </div>
          </div>

          <div className="border border-border rounded-md p-4 space-y-2">
            <div className="text-[12px] text-muted-foreground">Share this link</div>
            <div className="flex gap-2">
              <Input readOnly value={link} className="h-8 text-[13px] font-mono" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Copied!" }); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>}
      </div>
    </AppLayout>
  );
}
