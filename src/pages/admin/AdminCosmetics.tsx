import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Enums, Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type CosmeticRow = Tables<"cosmetic_items">;

const CATEGORY_OPTIONS: { value: Enums<"campaign_category">; label: string }[] = [
  { value: "music", label: "Music" },
  { value: "gaming", label: "Gaming" },
  { value: "ugc", label: "UGC" },
  { value: "clipping", label: "Clipping" },
  { value: "anime", label: "Anime" },
  { value: "logo", label: "Logo" },
];

const PLATFORM_OPTIONS: { value: Enums<"social_platform">; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
];

export default function AdminCosmetics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CosmeticRow[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; title: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CosmeticRow | null>(null);
  const [tabType, setTabType] = useState<"avatar" | "banner">("avatar");

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [unlockType, setUnlockType] = useState<CosmeticRow["unlock_type"]>("default");
  const [rankScope, setRankScope] = useState<"platform" | "campaign" | "category">("platform");
  const [rankPeriod, setRankPeriod] = useState<"weekly" | "monthly">("weekly");
  const [rankPosition, setRankPosition] = useState<1 | 2 | 3>(1);
  const [rankPlatform, setRankPlatform] = useState<Enums<"social_platform">>("tiktok");
  const [rankCampaignId, setRankCampaignId] = useState("");
  const [rankCategory, setRankCategory] = useState<Enums<"campaign_category">>("music");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cosmetic_items").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setRows([]);
    } else setRows((data ?? []) as CosmeticRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("campaigns").select("id, title").order("created_at", { ascending: false }).limit(200);
      const opts = (data ?? []).map((c) => ({ id: c.id, title: c.title ?? "Campaign" }));
      setCampaignOptions(opts);
      setRankCampaignId((prev) => (prev && opts.some((o) => o.id === prev) ? prev : opts[0]?.id ?? ""));
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((r) => r.type === tabType), [rows, tabType]);

  const resetRankFields = () => {
    setRankScope("platform");
    setRankPeriod("weekly");
    setRankPosition(1);
    setRankPlatform("tiktok");
    setRankCategory("music");
    setRankCampaignId(campaignOptions[0]?.id ?? "");
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setImageUrl("");
    setUnlockType("default");
    resetRankFields();
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (row: CosmeticRow) => {
    setEditing(row);
    setName(row.name);
    setImageUrl(row.image_url);
    setUnlockType(row.unlock_type);
    const cond = row.rank_reward_condition as Record<string, unknown> | null;
    if (cond?.scope === "campaign" || cond?.scope === "category" || cond?.scope === "platform") {
      setRankScope(cond.scope as typeof rankScope);
    } else setRankScope("platform");
    if (cond?.period === "weekly" || cond?.period === "monthly") setRankPeriod(cond.period);
    else setRankPeriod("weekly");
    const p = Number(cond?.position);
    setRankPosition(p === 2 ? 2 : p === 3 ? 3 : 1);
    const plat = cond?.platform;
    if (plat === "tiktok" || plat === "instagram" || plat === "youtube" || plat === "x") setRankPlatform(plat);
    else setRankPlatform("tiktok");
    const cid = typeof cond?.campaign_id === "string" ? cond.campaign_id : "";
    setRankCampaignId(cid || campaignOptions[0]?.id || "");
    const cat = cond?.category;
    if (typeof cat === "string" && CATEGORY_OPTIONS.some((c) => c.value === cat)) {
      setRankCategory(cat as Enums<"campaign_category">);
    } else setRankCategory("music");
    setIsActive(row.is_active);
    setDialogOpen(true);
  };

  const rankPayload = (): Json | null => {
    if (unlockType !== "rank_reward") return null;
    const base: Record<string, unknown> = {
      scope: rankScope,
      period: rankPeriod,
      position: rankPosition,
    };
    if (rankScope === "platform") base.platform = rankPlatform;
    if (rankScope === "campaign") base.campaign_id = rankCampaignId;
    if (rankScope === "category") base.category = rankCategory;
    return base as Json;
  };

  const save = async () => {
    if (!name.trim() || !imageUrl.trim()) {
      toast({ title: "Name and image URL are required", variant: "destructive" });
      return;
    }
    if (unlockType === "rank_reward" && rankScope === "campaign" && !rankCampaignId) {
      toast({ title: "Select a campaign", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CosmeticRow> = {
        type: editing?.type ?? tabType,
        name: name.trim(),
        image_url: imageUrl.trim(),
        unlock_type: unlockType,
        rank_reward_condition: rankPayload(),
        is_active: isActive,
      };
      if (editing) {
        const { error } = await supabase.from("cosmetic_items").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Cosmetic updated" });
      } else {
        const insertRow = payload as TablesInsert<"cosmetic_items">;
        const { error } = await supabase.from("cosmetic_items").insert(insertRow);
        if (error) throw error;
        toast({ title: "Cosmetic created" });
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `items/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    try {
      const { error } = await supabase.storage.from("cosmetics").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("cosmetics").getPublicUrl(path);
      setImageUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast({ title: "Image uploaded" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatReward = (row: CosmeticRow) => {
    if (row.unlock_type !== "rank_reward" || !row.rank_reward_condition) return "—";
    const c = row.rank_reward_condition as Record<string, unknown>;
    const extra =
      c.scope === "platform"
        ? String(c.platform ?? "tiktok")
        : c.scope === "campaign"
          ? `campaign ${String((c.campaign_id as string)?.slice(0, 8) ?? "")}…`
          : String(c.category ?? "?");
    return `${String(c.scope ?? "?")} (${extra}) · ${String(c.period ?? "?")} · #${String(c.position ?? "?")}`;
  };

  const runRankGrants = async (period: "weekly" | "monthly") => {
    setResetBusy(true);
    try {
      const { data, error } = await supabase.rpc("grant_rank_reward_cosmetics", { p_period: period });
      if (error) throw error;
      const summary = typeof data === "object" && data !== null ? JSON.stringify(data) : String(data);
      toast({
        title: period === "weekly" ? "Weekly grants finished" : "Monthly grants finished",
        description: summary.slice(0, 400) + (summary.length > 400 ? "…" : ""),
      });
    } catch (e: unknown) {
      toast({
        title: "Grant failed",
        description:
          e instanceof Error
            ? `${e.message}. Run supabase/manual/007_grant_rank_reward_cosmetics.sql`
            : "Run migration 007",
        variant: "destructive",
      });
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Cosmetics Manager"
        description="Avatars and banners for leaderboard and profiles. Schedule Supabase Edge Function process-rank-rewards or use the buttons below."
      />
      <div className="flex flex-col gap-4 p-4 md:p-6 max-w-5xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="h-8 text-[12px]" onClick={() => openCreate()}>
            Add {tabType === "avatar" ? "avatar" : "banner"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1"
            disabled={resetBusy}
            onClick={() => void runRankGrants("weekly")}
          >
            {resetBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Process weekly grants
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1"
            disabled={resetBusy}
            onClick={() => void runRankGrants("monthly")}
          >
            {resetBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Process monthly grants
          </Button>
        </div>

        <Tabs value={tabType} onValueChange={(v) => setTabType(v as typeof tabType)}>
          <TabsList className="h-8 bg-muted/40">
            <TabsTrigger value="avatar" className="text-[12px] px-3">
              Avatars
            </TabsTrigger>
            <TabsTrigger value="banner" className="text-[12px] px-3">
              Banners
            </TabsTrigger>
          </TabsList>
          <div className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2 w-16" />
                      <th className="p-2">Name</th>
                      <th className="p-2">Unlock</th>
                      <th className="p-2 hidden sm:table-cell">Rank rule</th>
                      <th className="p-2">Active</th>
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className="border-b border-border/80 hover:bg-muted/20">
                        <td className="p-2">
                          <div
                            className={cn(
                              "overflow-hidden border border-border bg-muted/30",
                              row.type === "avatar" ? "h-10 w-10 rounded-full" : "h-[36px] w-24 rounded-md",
                            )}
                          >
                            <img src={row.image_url} alt="" className="h-full w-full object-cover" />
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{row.name}</span>
                            {row.unlock_type === "default" ? (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                Default
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground capitalize">{row.unlock_type.replace("_", " ")}</td>
                        <td className="p-2 text-muted-foreground hidden sm:table-cell">{formatReward(row)}</td>
                        <td className="p-2">{row.is_active ? "Yes" : "No"}</td>
                        <td className="p-2">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          No items yet for this tab.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[13px]">{editing ? "Edit cosmetic" : "New cosmetic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-[12px]">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-[13px]" placeholder="Neon frame" />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-8 text-[13px]" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-[12px] shrink-0">Upload</Label>
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="h-8 text-[12px]" disabled={uploading} onChange={(e) => void onFile(e)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Unlock type</Label>
              <Select value={unlockType} onValueChange={(v) => setUnlockType(v as CosmeticRow["unlock_type"])}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (free for all)</SelectItem>
                  <SelectItem value="rank_reward">Rank reward</SelectItem>
                  <SelectItem value="admin_grant">Admin grant only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {unlockType === "rank_reward" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Scope</Label>
                    <Select value={rankScope} onValueChange={(v) => setRankScope(v as typeof rankScope)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">Platform</SelectItem>
                        <SelectItem value="campaign">Campaign</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Period</Label>
                    <Select value={rankPeriod} onValueChange={(v) => setRankPeriod(v as typeof rankPeriod)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Place</Label>
                    <Select value={String(rankPosition)} onValueChange={(v) => setRankPosition(Number(v) as 1 | 2 | 3)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st</SelectItem>
                        <SelectItem value="2">2nd</SelectItem>
                        <SelectItem value="3">3rd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {rankScope === "platform" ? (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Platform</Label>
                    <Select value={rankPlatform} onValueChange={(v) => setRankPlatform(v as Enums<"social_platform">)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {rankScope === "campaign" ? (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Campaign</Label>
                    <Select value={rankCampaignId} onValueChange={setRankCampaignId}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {rankScope === "category" ? (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Category</Label>
                    <Select value={rankCategory} onValueChange={(v) => setRankCategory(v as Enums<"campaign_category">)}>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-[12px]">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-8 text-[12px]" disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
