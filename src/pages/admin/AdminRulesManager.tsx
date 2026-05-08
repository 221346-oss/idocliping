import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Pencil, Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PlatformRuleRow = {
  id: string;
  rule_text: string;
  order: number;
  is_active: boolean;
};

async function getAppSettingValue(key: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data) return null;
  return data.value === null || data.value === undefined ? null : String(data.value);
}

async function upsertAppSettingValue(key: string, value: string) {
  await (supabase as any).from("app_settings").upsert({ key, value }, { onConflict: "key" });
}

export default function AdminRulesManager() {
  const { toast } = useToast();

  const [rules, setRules] = useState<PlatformRuleRow[]>([]);
  const [communityLink, setCommunityLink] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PlatformRuleRow | null>(null);
  const [ruleText, setRuleText] = useState("");
  const [ruleActive, setRuleActive] = useState(true);

  const dragIdRef = useRef<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: rulesData }, community] = await Promise.all([
        (supabase as any)
          .from("platform_rules")
          .select("id, rule_text, order, is_active")
          .eq("is_active", true)
          .order("order", { ascending: true }),
        (async () => getAppSettingValue("community_link"))(),
      ]);

      setRules((rulesData ?? []) as PlatformRuleRow[]);
      setCommunityLink(community ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setEditingRule(null);
    setRuleText("");
    setRuleActive(true);
    setAddEditOpen(true);
  };

  const openEdit = (r: PlatformRuleRow) => {
    setEditingRule(r);
    setRuleText(r.rule_text ?? "");
    setRuleActive(r.is_active ?? true);
    setAddEditOpen(true);
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!ruleText.trim()) {
        toast({ title: "Rule text required", variant: "destructive" });
        return;
      }

      const nextOrderBase = (rules ?? []).length ? Math.max(...rules.map((r) => Number(r.order ?? 0))) : 0;

      if (editingRule) {
        await (supabase as any)
          .from("platform_rules")
          .update({
            rule_text: ruleText.trim(),
            is_active: ruleActive,
          })
          .eq("id", editingRule.id);
      } else {
        await (supabase as any).from("platform_rules").insert({
          rule_text: ruleText.trim(),
          is_active: true,
          order: nextOrderBase + 1,
        });
      }

      toast({ title: editingRule ? "Rule updated" : "Rule added" });
      setAddEditOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not save rule", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const deleteRule = async (id: string) => {
    setBusy(true);
    try {
      await (supabase as any).from("platform_rules").delete().eq("id", id);
      toast({ title: "Rule deleted" });
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not delete rule", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const persistOrder = async (nextRules: PlatformRuleRow[]) => {
    // Persist order immediately so creators/admin see consistent ordering.
    await Promise.all(
      nextRules.map((r, idx) =>
        (supabase as any)
          .from("platform_rules")
          .update({ order: idx + 1 })
          .eq("id", r.id),
      ),
    );
  };

  const onDropReorder = async (dropId: string) => {
    const dragId = dragIdRef.current;
    if (!dragId || dragId === dropId) return;

    const from = rules.findIndex((r) => r.id === dragId);
    const to = rules.findIndex((r) => r.id === dropId);
    if (from < 0 || to < 0) return;

    const next = [...rules];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setRules(next);
    try {
      await persistOrder(next);
    } catch (err: any) {
      toast({ title: "Could not persist order", description: err?.message ?? "Try again", variant: "destructive" });
      await load();
    }
  };

  const publishUpdate = async () => {
    setBusy(true);
    try {
      const currentRaw = await getAppSettingValue("rules_version");
      const current = currentRaw ? Number(currentRaw) : 0;
      const next = current + 1;

      await upsertAppSettingValue("rules_version", String(next));
      toast({
        title: "Rules published",
        description: "Creators will see the rules popup again on their next login.",
      });
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not publish update", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveCommunityLink = async () => {
    setBusy(true);
    try {
      await upsertAppSettingValue("community_link", communityLink.trim());
      toast({ title: "Community link saved" });
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not save community link", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const title = useMemo(() => (loading ? "Loading..." : "Rules Manager"), [loading]);

  return (
    <AppLayout>
      <PageHeader
        title={title}
        description="Manage platform general rules and the version used for the creator popup."
        actions={
          <Button variant="destructive" onClick={publishUpdate} disabled={busy || loading}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Update"}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-[12px] text-muted-foreground font-medium">Discord/community link</p>
            <div className="flex gap-3">
              <Input
                value={communityLink}
                onChange={(e) => setCommunityLink(e.target.value)}
                placeholder="https://discord.gg/..."
                className="flex-1"
              />
              <Button variant="outline" onClick={saveCommunityLink} disabled={busy || loading}>
                Save
              </Button>
            </div>
          </div>
          <div className="shrink-0">
            <Button onClick={openAdd} disabled={busy || loading}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Rule
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-12">No active rules yet.</div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3 w-10">Drag</th>
                  <th className="text-left p-3">Rule</th>
                  <th className="text-left p-3 w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((r) => (
                  <tr
                    key={r.id}
                    className="align-top"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropReorder(r.id)}
                  >
                    <td className="p-3">
                      <div
                        className="flex items-center gap-2 text-muted-foreground cursor-grab"
                        draggable
                        onDragStart={(e) => {
                          dragIdRef.current = r.id;
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", r.id);
                        }}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-muted-foreground whitespace-pre-wrap">{r.rule_text}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)} disabled={busy}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteRule(r.id)} disabled={busy}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={addEditOpen} onOpenChange={setAddEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveRule} className="space-y-3">
            <div className="space-y-1">
              <Label>Rule text</Label>
              <Textarea
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                required
                rows={6}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-[12px] text-muted-foreground">Inactive rules won’t show up in the creator popup.</p>
              </div>
              <Checkbox checked={ruleActive} onCheckedChange={(v: any) => setRuleActive(!!v)} />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingRule ? "Save Changes" : "Add Rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

