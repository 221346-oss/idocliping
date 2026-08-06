import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StackedLogo } from "@/components/StackedLogo";

type PlatformRuleRow = {
  id: string;
  rule_text: string;
  order?: number | null;
  is_active?: boolean | null;
};

const LS_SEEN_KEY_PREFIX = "iclip_rules_seen_v";

async function getAppSettingValue(key: string): Promise<string | null> {
  // Tables might not exist in generated TS types yet, so we intentionally treat as `any`.
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data) return null;
  const value = data.value;
  return value === null || value === undefined ? null : String(value);
}

export function GeneralRulesGate() {
  const { user, role, loading } = useAuth();

  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [rules, setRules] = useState<PlatformRuleRow[]>([]);
  const [communityLink, setCommunityLink] = useState<string | null>(null);

  const canShowForRole = role === "creator" || role === "user";

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!canShowForRole) return;

    let cancelled = false;
    setChecking(true);

    (async () => {
      try {
        const versionRaw = await getAppSettingValue("rules_version");
        const version = versionRaw ? Number(versionRaw) : 1;

        const [community, rulesData] = await Promise.all([
          // Prefer the explicit key; keep a couple fallbacks so admin can rename safely.
          (async () => {
            const candidates = ["community_link", "discord_link", "discord_url", "community_url"];
            for (const k of candidates) {
              const v = await getAppSettingValue(k);
              if (v) return v;
            }
            return null;
          })(),
          (async () => {
            const { data } = await (supabase as any)
              .from("platform_rules")
              .select("id, rule_text, order, is_active")
              .eq("is_active", true)
              .order("order", { ascending: true });
            return (data ?? []) as PlatformRuleRow[];
          })(),
        ]);

        if (cancelled) return;

        setLatestVersion(version);
        setCommunityLink(community);
        setRules(rulesData ?? []);

        let alreadySeen = false;
        try {
          const key = `${LS_SEEN_KEY_PREFIX}${version}`;
          alreadySeen = localStorage.getItem(key) !== null;
        } catch {
          // If storage is not available, fall back to showing the modal (safer).
          alreadySeen = false;
        }

        setOpen(!alreadySeen);
      } catch (e) {
        // If settings/tables are not ready, we fail closed (do not block creators).
        console.error("GeneralRulesGate failed to load", e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, canShowForRole, loading]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent any escape hatch besides the CTA.
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true } as any);
  }, [open]);

  const acknowledge = () => {
    if (!latestVersion) return;
    try {
      localStorage.setItem(`${LS_SEEN_KEY_PREFIX}${latestVersion}`, "seen");
    } catch {
      // Ignore storage errors; the modal will still close for UX.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg surface-card p-6"
        // Prevent overlay interactions from doing anything unexpected.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="text-destructive">
            <StackedLogo size={22} />
          </div>
          <h2 className="mt-3 text-[18px] font-semibold text-foreground">iClip General Rules</h2>
          {communityLink && (
            <p className="mt-1 text-[12px] text-muted-foreground">Please review before submitting</p>
          )}
        </div>

        <div className="mt-5">
          {checking ? (
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-full" />
              </li>
              <li className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-full" />
              </li>
              <li className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-4/5" />
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 pl-4 list-disc">
              {(rules ?? []).map((r, idx) => (
                <li key={r.id ?? String(idx)} className="text-[13px] text-muted-foreground">
                  {r.rule_text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5">
          {communityLink ? (
            <a
              href={communityLink}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-primary underline underline-offset-4 hover:opacity-90"
            >
              Join our community on Discord
            </a>
          ) : (
            <div className="text-[12px] text-muted-foreground">Community link will be added soon.</div>
          )}
        </div>

        <div className="mt-6">
          <Button className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary hover:opacity-90 press-scale" onClick={acknowledge}>
            Ok, I got it
          </Button>
        </div>
      </div>
    </div>
  );
}

