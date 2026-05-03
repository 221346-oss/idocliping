import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CreatorDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaignEarn, setCampaignEarn] = useState(0);
  const [referralEarn, setReferralEarn] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: earnings }, { data: subs }, { data: parts }] = await Promise.all([
        supabase.from("earnings").select("amount, type").eq("creator_id", user.id),
        supabase.from("submissions").select("id, status, post_url, manual_views, created_at, campaigns(title)").eq("creator_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("campaign_participants").select("id").eq("creator_id", user.id),
      ]);
      const c = (earnings ?? []).filter((e: any) => e.type === "campaign").reduce((a: number, b: any) => a + Number(b.amount), 0);
      const r = (earnings ?? []).filter((e: any) => e.type === "referral").reduce((a: number, b: any) => a + Number(b.amount), 0);
      setCampaignEarn(c);
      setReferralEarn(r);
      setSubmissions(subs ?? []);
      setActiveCampaigns(parts?.length ?? 0);
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppLayout>
      <PageHeader
        title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Track your campaigns, submissions, and earnings."
        actions={<Link to="/creator/wallet"><Button size="sm">Withdraw</Button></Link>}
      />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total earnings" value={`$${(campaignEarn + referralEarn).toFixed(2)}`} />
              <StatCard label="Campaign balance" value={`$${campaignEarn.toFixed(2)}`} />
              <StatCard label="Referral balance" value={`$${referralEarn.toFixed(2)}`} />
              <StatCard label="Active campaigns" value={activeCampaigns} />
            </div>

            <div className="border border-border rounded-md">
              <div className="flex items-center justify-between px-4 h-11 border-b border-border">
                <h2 className="text-[13px] font-medium text-foreground">Recent submissions</h2>
                <Link to="/creator/submissions" className="text-[12px] text-muted-foreground hover:text-foreground">View all</Link>
              </div>
              {submissions.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No submissions yet. <Link to="/creator/campaigns" className="text-foreground underline">Browse campaigns</Link>
                </div>
              ) : (
                <ul>
                  {submissions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 h-11 border-b border-border last:border-b-0 text-[13px]">
                      <span className="font-medium truncate flex-1">{s.campaigns?.title ?? "—"}</span>
                      <span className="text-muted-foreground hidden sm:inline">{Number(s.manual_views).toLocaleString()} views</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded uppercase tracking-wide ${
                        s.status === "approved" ? "bg-success/15 text-success" :
                        s.status === "rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-warning/15 text-warning"
                      }`}>{s.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
