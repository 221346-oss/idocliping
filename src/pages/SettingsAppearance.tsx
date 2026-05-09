import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CosmeticsGridSkeleton, BannerGridSkeleton } from "@/components/leaderboard/LeaderboardSkeletons";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type CosmeticItem = Tables<"cosmetic_items">;

export function SettingsAppearanceTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CosmeticItem[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [equippedAvatar, setEquippedAvatar] = useState<string | null>(null);
  const [equippedBanner, setEquippedBanner] = useState<string | null>(null);
  const [draftAvatar, setDraftAvatar] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data: rows }, { data: cc }, { data: settings }] = await Promise.all([
          supabase.from("cosmetic_items").select("*").eq("is_active", true),
          supabase.from("creator_cosmetics").select("cosmetic_id").eq("user_id", user.id),
          supabase.from("creator_profile_settings").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        setItems((rows ?? []) as CosmeticItem[]);
        let unlockedSet = new Set((cc ?? []).map((x) => x.cosmetic_id));
        const av = settings?.equipped_avatar_id ?? null;
        const bn = settings?.equipped_banner_id ?? null;
        setEquippedAvatar(av);
        setEquippedBanner(bn);
        setDraftAvatar(av);
        setDraftBanner(bn);

        const defaults = ((rows ?? []) as CosmeticItem[]).filter((r) => r.unlock_type === "default");
        for (const d of defaults) {
          if (!unlockedSet.has(d.id)) {
            const row: TablesInsert<"creator_cosmetics"> = {
              user_id: user.id,
              cosmetic_id: d.id,
              unlocked_reason: "default",
            };
            const { error } = await supabase.from("creator_cosmetics").insert(row);
            if (!error) unlockedSet = new Set([...unlockedSet, d.id]);
          }
        }
        setUnlocked(unlockedSet);
      } catch {
        toast({
          title: "Appearance unavailable",
          description: "Run migration 006 and seed cosmetic_items.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, toast]);

  const owns = (id: string, unlock: CosmeticItem["unlock_type"]) => unlocked.has(id) || unlock === "default";

  const equipAvatar = async (id: string, item: CosmeticItem) => {
    if (!owns(id, item.unlock_type)) return;
    setDraftAvatar(id);
  };

  const equipBanner = async (id: string, item: CosmeticItem) => {
    if (!owns(id, item.unlock_type)) return;
    setDraftBanner(id);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("creator_profile_settings").upsert(
        {
          user_id: user.id,
          equipped_avatar_id: draftAvatar,
          equipped_banner_id: draftBanner,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setEquippedAvatar(draftAvatar);
      setEquippedBanner(draftBanner);
      toast({ title: "Appearance saved" });
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const avatars = items.filter((i) => i.type === "avatar");
  const banners = items.filter((i) => i.type === "banner");

  return (
    <TooltipProvider>
      <div className="px-4 md:px-6 py-4 space-y-8 max-w-3xl">
        <div>
          <p className="text-[12px] text-muted-foreground font-medium mb-3">Appearance</p>
          <p className="text-[12px] text-muted-foreground mb-4">
            Equip avatars and banners for leaderboard and profile. Unlock more via rank rewards (admin-configured).
          </p>
        </div>

        {loading ? (
          <>
            <CosmeticsGridSkeleton />
            <BannerGridSkeleton />
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Label className="text-[12px]">Avatar</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {avatars.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground col-span-full">No avatars configured yet.</p>
                ) : (
                  avatars.map((item) => {
                    const ok = owns(item.id, item.unlock_type);
                    const selected = draftAvatar === item.id;
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={!ok}
                            onClick={() => void equipAvatar(item.id, item)}
                            className={cn(
                              "relative rounded-full aspect-square overflow-hidden border-2 transition-colors",
                              selected ? "border-destructive ring-2 ring-destructive/30" : "border-border",
                              ok ? "cursor-pointer hover:opacity-95" : "opacity-60 cursor-not-allowed",
                            )}
                          >
                            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                            {!ok ? (
                              <span className="absolute inset-0 bg-black/55 flex items-center justify-center">
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              </span>
                            ) : null}
                            {selected ? (
                              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : null}
                          </button>
                        </TooltipTrigger>
                        {!ok ? (
                          <TooltipContent side="bottom" className="max-w-[220px] text-[11px]">
                            Finish Top 3 in a weekly leaderboard (when configured by admin) or ask support.
                          </TooltipContent>
                        ) : (
                          <TooltipContent side="bottom" className="text-[11px]">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[12px]">Banner</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {banners.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground col-span-full">No banners configured yet.</p>
                ) : (
                  banners.map((item) => {
                    const ok = owns(item.id, item.unlock_type);
                    const selected = draftBanner === item.id;
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={!ok}
                            onClick={() => void equipBanner(item.id, item)}
                            className={cn(
                              "relative h-[45px] w-full rounded-md overflow-hidden border-2 transition-colors",
                              selected ? "border-destructive ring-2 ring-destructive/25" : "border-border",
                              ok ? "cursor-pointer" : "opacity-60 cursor-not-allowed",
                            )}
                          >
                            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                            {!ok ? (
                              <span className="absolute inset-0 bg-black/55 flex items-center justify-center">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </span>
                            ) : null}
                            {selected ? (
                              <span className="absolute bottom-0.5 right-0.5">
                                <Check className="h-4 w-4 text-destructive" />
                              </span>
                            ) : null}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[11px]">{!ok ? "Locked — check rank rewards" : item.name}</TooltipContent>
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </div>

            <Button type="button" size="sm" disabled={saving} className="h-8 text-[12px]" onClick={() => void save()}>
              Save Appearance
            </Button>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
