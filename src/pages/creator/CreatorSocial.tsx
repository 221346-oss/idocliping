import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, AtSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;

export default function CreatorSocial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [platform, setPlatform] = useState<string>("tiktok");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("social_accounts").select("*").eq("user_id", user.id);
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!handle.trim()) return toast({ title: "Handle required", variant: "destructive" });
    const { error } = await supabase.from("social_accounts").upsert(
      { user_id: user.id, platform: platform as any, handle: handle.trim().slice(0, 100), profile_url: url.trim().slice(0, 500) },
      { onConflict: "user_id,platform" }
    );
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setHandle(""); setUrl(""); load();
  };

  const remove = async (id: string) => {
    await supabase.from("social_accounts").delete().eq("id", id);
    load();
  };

  return (
    <AppLayout>
      <PageHeader title="Social accounts" description="Add your handles so brands can verify ownership." />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={add} className="border border-border rounded-md p-4 space-y-3 h-fit">
          <h3 className="text-[13px] font-medium">Add account</h3>
          <div className="space-y-1"><Label className="text-[12px]">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[12px]">Handle</Label>
            <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="h-8 text-[13px]" />
          </div>
          <div className="space-y-1"><Label className="text-[12px]">Profile URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-8 text-[13px]" />
          </div>
          <Button type="submit" className="w-full">Save</Button>
        </form>

        <div className="border border-border rounded-md">
          <div className="px-4 h-11 flex items-center border-b border-border"><h3 className="text-[13px] font-medium">Your accounts</h3></div>
          {loading ? (
            <div className="p-2 space-y-1">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={AtSign}
              title="Add your first account"
              description="Connect your social handles so brands can verify your reach and credit your posts."
              className="py-8"
            />
          ) : (
          <ul className="animate-fade-in">
            {accounts.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-4 h-11 border-b border-border last:border-b-0 text-[13px] transition-colors hover:bg-muted/30">
                <span className="capitalize text-[11px] uppercase tracking-wide text-muted-foreground w-20">{a.platform}</span>
                <span className="flex-1 font-medium">{a.handle}</span>
                {a.verified && <span className="text-[10px] text-success">VERIFIED</span>}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>)}
        </div>
      </div>
    </AppLayout>
  );
}
