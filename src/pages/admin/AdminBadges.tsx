import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LeaderboardBadgeTier } from "@/lib/leaderboard-badges";
import { formatPerkLines } from "@/lib/leaderboard-badges";
import { Loader2, Save, Trash2 } from "lucide-react";

type TierRow = LeaderboardBadgeTier & { id: string };

type OverrideRow = {
  creator_id: string;
  tier_order: number;
  admin_note: string;
};

export default function AdminBadges() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newCreatorId, setNewCreatorId] = useState("");
  const [newTierOrder, setNewTierOrder] = useState<string>("10");
  const [newNote, setNewNote] = useState("");
  const [overrideBusy, setOverrideBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: tData, error: te } = await (supabase as any)
        .from("leaderboard_badge_tiers")
        .select("id, tier_order, slug, title, rank_from, rank_to, perks")
        .order("tier_order", { ascending: false });

      if (te) throw te;
      setTiers((tData ?? []) as TierRow[]);

      const { data: oData, error: oe } = await (supabase as any)
        .from("creator_badge_overrides")
        .select("creator_id, tier_order, admin_note")
        .order("updated_at", { ascending: false });

      if (oe) throw oe;
      setOverrides((oData ?? []) as OverrideRow[]);
    } catch (e: unknown) {
      toast({
        title: "Could not load badges",
        description: e instanceof Error ? e.message : "Run supabase/manual/005_leaderboard_badges.sql",
        variant: "destructive",
      });
      setTiers([]);
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveTier = async (row: TierRow, draft: { title: string; rank_from: string; rank_to: string; perksJson: string }) => {
    setSavingId(row.id);
    try {
      let perks: Record<string, unknown>;
      try {
        perks = JSON.parse(draft.perksJson || "{}") as Record<string, unknown>;
      } catch {
        toast({ title: "Perks must be valid JSON", variant: "destructive" });
        return;
      }
      const rf = Number(draft.rank_from);
      const rt = Number(draft.rank_to);
      if (!Number.isFinite(rf) || !Number.isFinite(rt) || rf < 1 || rt < rf) {
        toast({ title: "Invalid rank range", variant: "destructive" });
        return;
      }

      const { error } = await (supabase as any)
        .from("leaderboard_badge_tiers")
        .update({
          title: draft.title.trim(),
          rank_from: rf,
          rank_to: rt,
          perks,
        })
        .eq("id", row.id);

      if (error) throw error;
      toast({ title: "Tier saved" });
      await load();
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const upsertOverride = async () => {
    const id = newCreatorId.trim();
    if (!id) {
      toast({ title: "Creator user id required", variant: "destructive" });
      return;
    }
    setOverrideBusy(true);
    try {
      const { error } = await (supabase as any).from("creator_badge_overrides").upsert(
        {
          creator_id: id,
          tier_order: Number(newTierOrder),
          admin_note: newNote.trim(),
        },
        { onConflict: "creator_id" },
      );
      if (error) throw error;
      toast({ title: "Override saved" });
      setNewCreatorId("");
      setNewNote("");
      await load();
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setOverrideBusy(false);
    }
  };

  const deleteOverride = async (creatorId: string) => {
    const { error } = await (supabase as any).from("creator_badge_overrides").delete().eq("creator_id", creatorId);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Override removed" });
      await load();
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PageHeader title="Leaderboard badges" description="Ten placement tiers, perks JSON, and per-creator overrides." />

        <div className="flex-1 overflow-auto px-4 md:px-6 py-5 space-y-10 max-w-4xl">
          <section className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Ranks map to tiers by <span className="text-foreground font-medium">rank_from–rank_to</span>. Higher{" "}
              <span className="text-destructive font-medium">tier_order</span> is the premier tier (#1). Wallet billing can read{" "}
              <code className="text-[11px]">perks</code> later.
            </p>

            <div className="space-y-4">
              {tiers.map((row) => (
                <TierEditor key={row.id} row={row} saving={savingId === row.id} onSave={(d) => void saveTier(row, d)} />
              ))}
            </div>
          </section>

          <section className="border border-border rounded-lg p-4 space-y-4">
            <h2 className="text-[13px] font-semibold">Creator overrides</h2>
            <p className="text-[12px] text-muted-foreground">
              Forces display perks for a specific creator regardless of rank (use spare tier slots or promotional tiers).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[12px]">Creator profile user_id (uuid)</Label>
                <Input value={newCreatorId} onChange={(e) => setNewCreatorId(e.target.value)} placeholder="uuid…" className="h-8 text-[13px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[12px]">Tier order</Label>
                <Select value={newTierOrder} onValueChange={setNewTierOrder}>
                  <SelectTrigger className="h-8 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 10 ? "(best)" : n === 1 ? "(entry)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[12px]">Admin note</Label>
                <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Reason / campaign…" className="h-8 text-[13px]" />
              </div>
            </div>
            <Button size="sm" className="h-8 text-[12px]" disabled={overrideBusy} onClick={() => void upsertOverride()}>
              {overrideBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save override
            </Button>

            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Creator</th>
                    <th className="text-left p-2">Tier</th>
                    <th className="text-left p-2">Note</th>
                    <th className="text-right p-2 w-24"> </th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-muted-foreground text-center">
                        No overrides yet.
                      </td>
                    </tr>
                  ) : (
                    overrides.map((o) => (
                      <tr key={o.creator_id} className="border-t border-border">
                        <td className="p-2 font-mono text-[11px]">{o.creator_id.slice(0, 8)}…</td>
                        <td className="p-2">{o.tier_order}</td>
                        <td className="p-2 text-muted-foreground">{o.admin_note || "—"}</td>
                        <td className="p-2 text-right">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => void deleteOverride(o.creator_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function TierEditor({
  row,
  saving,
  onSave,
}: {
  row: TierRow;
  saving: boolean;
  onSave: (d: { title: string; rank_from: string; rank_to: string; perksJson: string }) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [rankFrom, setRankFrom] = useState(String(row.rank_from));
  const [rankTo, setRankTo] = useState(String(row.rank_to));
  const [perksJson, setPerksJson] = useState(JSON.stringify(row.perks ?? {}, null, 2));

  useEffect(() => {
    setTitle(row.title);
    setRankFrom(String(row.rank_from));
    setRankTo(String(row.rank_to));
    setPerksJson(JSON.stringify(row.perks ?? {}, null, 2));
  }, [row]);

  const previewLines = useMemo(() => {
    try {
      return formatPerkLines(JSON.parse(perksJson || "{}") as Record<string, unknown>);
    } catch {
      return ["Invalid JSON"];
    }
  }, [perksJson]);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-destructive tabular-nums">T{row.tier_order}</span>
          <span className="text-[12px] text-muted-foreground font-mono">{row.slug}</span>
        </div>
        <Button type="button" size="sm" variant="secondary" className="h-7 text-[12px]" disabled={saving} onClick={() => onSave({ title, rank_from: rankFrom, rank_to: rankTo, perksJson })}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Title</Label>
          <Input className="h-8 text-[13px]" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Rank from</Label>
          <Input className="h-8 text-[13px]" value={rankFrom} onChange={(e) => setRankFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Rank to</Label>
          <Input className="h-8 text-[13px]" value={rankTo} onChange={(e) => setRankTo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Perks (JSON)</Label>
        <Textarea value={perksJson} onChange={(e) => setPerksJson(e.target.value)} className="font-mono text-[12px] min-h-[100px]" />
      </div>
      <p className="text-[11px] text-muted-foreground">Preview: {previewLines.join(" · ") || "—"}</p>
    </div>
  );
}
