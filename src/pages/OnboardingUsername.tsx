import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Loader2, Check, X } from "lucide-react";

const RULES = "3–20 characters · letters, numbers, underscores";

function normalize(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

export default function OnboardingUsername() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = /^[a-z0-9_]{3,20}$/.test(username);

  useEffect(() => {
    if (profile?.profile_slug) navigate("/", { replace: true });
  }, [profile?.profile_slug, navigate]);

  useEffect(() => {
    if (!valid) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("user_id").eq("profile_slug", username).maybeSingle();
      if (cancelled) return;
      setAvailable(!data || data.user_id === user?.id);
      setChecking(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setChecking(false);
    };
  }, [username, valid, user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !valid || available === false) return;
    setSaving(true);
    try {
      const { data: clash } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("profile_slug", username)
        .neq("user_id", user.id)
        .maybeSingle();
      if (clash) {
        setAvailable(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ profile_slug: username, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: `Welcome, @${username}` });
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: "Could not save username",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="surface-card w-full max-w-[420px] animate-fade-in p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size={30} />
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Choose your username</h1>
          <p className="text-[13px] text-muted-foreground">
            This is how creators and brands will find you. It can’t be changed later.
          </p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-7 space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">
              @
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(normalize(e.target.value))}
              placeholder="yourname"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              className="focus-ring w-full rounded-full border border-border/70 bg-surface-raised py-3.5 pl-9 pr-11 text-[15px] placeholder:text-muted-foreground"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : available === true ? (
                <Check className="h-4 w-4 text-primary" />
              ) : available === false ? (
                <X className="h-4 w-4 text-destructive" />
              ) : null}
            </span>
          </div>

          <p className="px-1 text-[12px] text-muted-foreground">
            {available === false ? (
              <span className="text-destructive">That username is taken.</span>
            ) : (
              RULES
            )}
          </p>

          <button type="submit" disabled={!valid || available !== true || saving} className="btn-primary-pill">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
