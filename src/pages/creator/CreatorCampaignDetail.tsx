import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, SearchX } from "lucide-react";
import { DetailPageSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const submitSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube", "x"]),
  post_url: z.string().trim().url("Must be a valid URL").max(500),
});

export default function CreatorCampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<string>("tiktok");
  const [postUrl, setPostUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id || !user) return;
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("campaigns").select("*, brands(name)").eq("id", id).single(),
      supabase.from("campaign_participants").select("id").eq("campaign_id", id).eq("creator_id", user.id).maybeSingle(),
    ]);
    setCampaign(c);
    setJoined(!!p);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    const parsed = submitSchema.safeParse({ platform, post_url: postUrl });
    if (!parsed.success) return toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
    setSubmitting(true);
    // Auto-join if not already
    if (!joined) {
      await supabase.from("campaign_participants").insert({ campaign_id: id, creator_id: user.id });
      setJoined(true);
    }
    const { error } = await supabase.from("submissions").insert({
      campaign_id: id, creator_id: user.id, platform: parsed.data.platform, post_url: parsed.data.post_url,
    });
    setSubmitting(false);
    if (error) return toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    toast({ title: "Submitted!", description: "Admin will verify your post shortly." });
    setPostUrl("");
  };

  if (loading) return <AppLayout><DetailPageSkeleton /></AppLayout>;
  if (!campaign) return (
    <AppLayout>
      <EmptyState icon={SearchX} title="Campaign not found" description="This campaign may have ended or been removed." actionLabel="Back to Explore" actionTo="/creator/campaigns" />
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageHeader
        title={campaign.title}
        description={campaign.brands?.name ? `By ${campaign.brands.name}` : undefined}
        actions={<Link to="/creator/campaigns"><Button variant="outline" size="sm"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button></Link>}
      />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {campaign.thumbnail_url && (
            <img src={campaign.thumbnail_url} alt={campaign.title} className="w-full aspect-video object-cover rounded-md border border-border" />
          )}
          <div className="border border-border rounded-md p-4">
            <h3 className="text-[13px] font-medium mb-2">Description</h3>
            <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{campaign.description || "—"}</p>
          </div>
          <div className="border border-border rounded-md p-4">
            <h3 className="text-[13px] font-medium mb-2">Instructions</h3>
            <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{campaign.instructions || "—"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-border rounded-md p-4 space-y-3">
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Payout</span><span className="font-medium">${Number(campaign.payout_per_1m_views).toFixed(2)} / 1M views</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Budget left</span><span className="font-medium">${Number(campaign.budget_remaining).toFixed(0)}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Category</span><span className="font-medium capitalize">{campaign.category}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Platforms</span><span className="font-medium">{(campaign.platforms ?? []).join(", ") || "—"}</span></div>
            {joined && <div className="text-[12px] text-success text-center">✓ Joined</div>}
          </div>

          <form onSubmit={handleSubmit} className="border border-border rounded-md p-4 space-y-3">
            <h3 className="text-[13px] font-medium">Submit a post</h3>
            <p className="text-[11px] text-muted-foreground">Submitting auto-joins this campaign.</p>
            <div className="space-y-1">
              <Label className="text-[12px]">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Post URL</Label>
              <Input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://..." className="h-8 text-[13px]" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Submit for review
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
