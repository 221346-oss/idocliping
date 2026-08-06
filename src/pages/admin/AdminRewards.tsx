import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Trash2 } from "lucide-react";

type Reward = {
  id: string;
  week_start: string;
  title: string;
  description: string;
  prize_text: string;
  is_published: boolean;
};

type PendingAccount = {
  id: string;
  user_id: string;
  platform: string;
  handle: string;
  profile_url: string | null;
  verification_code: string | null;
  verification_status: string;
};

const monday = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};

/** Admin: weekly rewards announcements + social account verification queue. */
export default function AdminRewards() {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ week_start: monday(), title: "", description: "", prize_text: "" });

  const load = async () => {
    const [rw, pa] = await Promise.all([
      supabase.from("weekly_rewards").select("*").order("week_start", { ascending: false }).limit(30),
      supabase
        .from("social_accounts")
        .select("id, user_id, platform, handle, profile_url, verification_code, verification_status")
        .eq("verification_status", "pending")
        .order("verification_requested_at", { ascending: true }),
    ]);
    setRewards((rw.data as Reward[]) ?? []);
    setPending((pa.data as PendingAccount[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast({ title: "Title required", variant: "destructive" });
    const { error } = await supabase.from("weekly_rewards").insert({
      week_start: form.week_start,
      title: form.title.trim().slice(0, 200),
      description: form.description.trim().slice(0, 1000),
      prize_text: form.prize_text.trim().slice(0, 200),
      is_published: false,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setForm({ week_start: monday(), title: "", description: "", prize_text: "" });
    toast({ title: "Reward created" });
    void load();
  };

  const togglePublish = async (r: Reward) => {
    await supabase.from("weekly_rewards").update({ is_published: !r.is_published }).eq("id", r.id);
    void load();
  };

  const removeReward = async (id: string) => {
    await supabase.from("weekly_rewards").delete().eq("id", id);
    void load();
  };

  const review = async (a: PendingAccount, approve: boolean) => {
    const { error } = await supabase
      .from("social_accounts")
      .update({
        verified: approve,
        verification_status: approve ? "verified" : "rejected",
        verification_note: approve ? "Bio code confirmed" : "Bio code not found",
      })
      .eq("id", a.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: approve ? "Account verified" : "Verification rejected" });
    void load();
  };

  return (
    <AppLayout>
      <PageHeader title="Rewards & verification" description="Announce weekly rewards and review account ownership." />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-2">
        <div className="space-y-6">
          <form onSubmit={create} className="space-y-3 rounded-md border border-border p-4">
            <h3 className="text-[13px] font-medium">New weekly reward</h3>
            <div className="space-y-1">
              <Label className="text-[12px]">Week starting</Label>
              <Input
                type="date"
                value={form.week_start}
                onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-8 text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Prize</Label>
              <Input
                value={form.prize_text}
                onChange={(e) => setForm({ ...form, prize_text: e.target.value })}
                placeholder="$250 bonus pool"
                className="h-8 text-[13px]"
              />
            </div>
            <Button type="submit" className="w-full">Create</Button>
          </form>

          <div className="rounded-md border border-border">
            <div className="flex h-11 items-center border-b border-border px-4">
              <h3 className="text-[13px] font-medium">Rewards</h3>
            </div>
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
              </div>
            ) : rewards.length === 0 ? (
              <p className="p-4 text-[13px] text-muted-foreground">No rewards yet.</p>
            ) : (
              <ul>
                {rewards.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{r.title}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {r.week_start} · {r.prize_text || "No prize set"}
                      </p>
                    </div>
                    <Switch checked={r.is_published} onCheckedChange={() => void togglePublish(r)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void removeReward(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border">
          <div className="flex h-11 items-center border-b border-border px-4">
            <h3 className="text-[13px] font-medium">Verification queue</h3>
          </div>
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : pending.length === 0 ? (
            <p className="p-4 text-[13px] text-muted-foreground">Nothing waiting for review.</p>
          ) : (
            <ul>
              {pending.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">@{a.handle}</p>
                    <p className="truncate text-[12px] capitalize text-muted-foreground">
                      {a.platform} · code {a.verification_code}
                    </p>
                    {a.profile_url && (
                      <a
                        href={a.profile_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[12px] text-primary underline"
                      >
                        Open profile
                      </a>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void review(a, true)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void review(a, false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
