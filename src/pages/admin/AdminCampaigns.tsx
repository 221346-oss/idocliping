import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CampaignForm,
  campaignToForm,
  emptyCampaignForm,
  formToCampaignPayload,
  STATUSES,
  type CampaignFormValues,
} from "@/components/admin/CampaignForm";

export default function AdminCampaigns() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CampaignFormValues>(emptyCampaignForm);

  const load = async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from("campaigns").select("*, brands(name)").order("created_at", { ascending: false }),
      supabase.from("brands").select("id, name").order("name"),
    ]);
    setRows(c ?? []);
    setBrands((b ?? []) as any);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCampaignForm);
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row.id);
    setForm(campaignToForm(row));
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    const payload = formToCampaignPayload(form, { isNew: !editingId });
    const { error } = editingId
      ? await supabase.from("campaigns").update(payload as any).eq("id", editingId)
      : await supabase.from("campaigns").insert(payload as any);
    setBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: editingId ? "Campaign updated" : "Campaign created" });
    setOpen(false);
    void load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("campaigns").update({ status } as any).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    void load();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Campaigns"
        description="Create, edit, pause and publish campaigns."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New campaign
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit campaign" : "Create campaign"}</DialogTitle>
          </DialogHeader>
          <CampaignForm
            value={form}
            onChange={setForm}
            onSubmit={() => void save()}
            busy={busy}
            brands={brands}
            submitLabel={editingId ? "Save changes" : "Create campaign"}
          />
        </DialogContent>
      </Dialog>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground">No campaigns yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Brand</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-right">Budget left</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/campaigns/${r.id}`} className="text-primary hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="p-3">{r.brands?.name ?? "—"}</td>
                    <td className="p-3 capitalize">{r.category}</td>
                    <td className="p-3 text-right">
                      ${Number(r.budget_remaining).toFixed(0)} / ${Number(r.budget_total).toFixed(0)}
                    </td>
                    <td className="p-3">
                      <Select value={r.status} onValueChange={(v) => void updateStatus(r.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => openEdit(r)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        {r.status === "active" ? (
                          <Button size="sm" variant="secondary" className="h-7 text-[12px]" onClick={() => void updateStatus(r.id, "paused")}>
                            <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-7 text-[12px]" onClick={() => void updateStatus(r.id, "active")}>
                            <Play className="mr-1 h-3.5 w-3.5" /> Go live
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
