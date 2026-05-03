import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminBrands() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("brands").select("*, profiles!brands_owner_user_id_fkey(full_name)").order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    // Try to find owner by email via profiles (no auth.users access). Brand owner_user_id can be null until invited user signs up.
    let owner: string | null = null;
    if (ownerEmail.trim()) {
      // Best-effort lookup by full_name? Profiles don't store email. We just send invitation row.
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("invitations").insert({ email: ownerEmail.trim(), role: "brand", invited_by: user!.id });
    }
    const { error } = await supabase.from("brands").insert({ name: name.trim(), website: website.trim(), logo_url: logo.trim(), owner_user_id: owner });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Brand created", description: ownerEmail ? `Invitation sent to ${ownerEmail}.` : undefined });
    setName(""); setWebsite(""); setLogo(""); setOwnerEmail(""); setOpen(false); load();
  };

  return (
    <AppLayout>
      <PageHeader title="Brands" description="Create brands and invite their owners." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> New brand</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create brand</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
              <div className="space-y-1"><Label>Logo URL</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} /></div>
              <div className="space-y-1"><Label>Owner email (optional)</Label><Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="brand owner sign-up email" /></div>
              <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No brands yet.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Website</th><th className="text-left p-3">Owner</th><th className="text-left p-3">Created</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3"><a href={r.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">{r.website}</a></td>
                  <td className="p-3">{r.profiles?.full_name ?? <span className="text-muted-foreground">unassigned</span>}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </AppLayout>
  );
}
