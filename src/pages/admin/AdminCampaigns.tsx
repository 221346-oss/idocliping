import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["music", "clipping", "gaming", "logo", "ugc", "other"];
const STATUSES = ["draft", "active", "paused", "ended"];
const PLATFORMS = ["tiktok", "instagram", "youtube", "x"];

export default function AdminCampaigns() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    brand_id: "", title: "", description: "", instructions: "", thumbnail_url: "",
    category: "ugc", payout_per_1m_views: "1000", budget_total: "1000", status: "active",
    platforms: ["tiktok"] as string[],
  });

  const load = async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from("campaigns").select("*, brands(name)").order("created_at", { ascending: false }),
      supabase.from("brands").select("id, name").order("name"),
    ]);
    setRows(c ?? []); setBrands(b ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const total = Number(form.budget_total) || 0;
    const { error } = await supabase.from("campaigns").insert({
      brand_id: form.brand_id || null,
      title: form.title, description: form.description, instructions: form.instructions, thumbnail_url: form.thumbnail_url,
      category: form.category as any, status: form.status as any, platforms: form.platforms,
      payout_per_1m_views: Number(form.payout_per_1m_views) || 0,
      budget_total: total, budget_remaining: total,
    });
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Campaign created" });
    setOpen(false); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("campaigns").update({ status: status as any }).eq("id", id);
    load();
  };

  const togglePlatform = (p: string) => setForm(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p] }));

  return (
    <AppLayout>
      <PageHeader title="Campaigns" description="Create and manage campaigns on behalf of brands." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> New campaign</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create campaign</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1"><Label>Brand</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm(f => ({ ...f, brand_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choose brand" /></SelectTrigger>
                  <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Instructions for creators</Label><Textarea value={form.instructions} onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Payout per 1M views ($)</Label><Input type="number" step="0.01" value={form.payout_per_1m_views} onChange={(e) => setForm(f => ({ ...f, payout_per_1m_views: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Total budget ($)</Label><Input type="number" step="0.01" value={form.budget_total} onChange={(e) => setForm(f => ({ ...f, budget_total: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button type="button" key={p} onClick={() => togglePlatform(p)} className={`text-[12px] px-2 py-1 border rounded uppercase tracking-wide ${form.platforms.includes(p) ? "bg-foreground text-background border-foreground" : "border-border"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="p-6">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> :
        rows.length === 0 ? <div className="text-center text-[13px] text-muted-foreground py-12">No campaigns yet.</div> :
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Brand</th><th className="text-left p-3">Category</th><th className="text-right p-3">Budget</th><th className="text-left p-3">Status</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    <Link to={`/admin/campaigns/${r.id}`} className="hover:underline text-primary">{r.title}</Link>
                  </td>
                  <td className="p-3">{r.brands?.name ?? "—"}</td>
                  <td className="p-3 capitalize">{r.category}</td>
                  <td className="p-3 text-right">${Number(r.budget_remaining).toFixed(0)} / ${Number(r.budget_total).toFixed(0)}</td>
                  <td className="p-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="h-7 text-[12px] w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </AppLayout>
  );
}
