import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { slugifyDisplayName } from "@/lib/profile-slug";
import { ArrowLeft, Loader2 } from "lucide-react";
function CreatorProfileEditInner() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("full_name, bio, profile_slug").eq("user_id", user.id).maybeSingle();
      if (error) {
        toast({ title: "Could not load profile", description: error.message, variant: "destructive" });
      } else if (data) {
        setFullName(data.full_name ?? "");
        setBio((data as { bio?: string }).bio ?? "");
        setSlug((data as { profile_slug?: string | null }).profile_slug ?? "");
      }
      setLoading(false);
    })();
  }, [user, toast]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const name = fullName.trim() || "Creator";
      let nextSlug = slug.trim().toLowerCase() || slugifyDisplayName(name);
      const { data: clash } = await supabase.from("profiles").select("user_id").eq("profile_slug", nextSlug).neq("user_id", user.id).maybeSingle();
      if (clash) nextSlug = `${nextSlug}-${user.id.slice(0, 6)}`;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          bio: bio.slice(0, 500),
          profile_slug: nextSlug,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Profile saved" });
      navigate("/profile/me");
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full max-w-xl mx-auto w-full px-4 py-4">
        <Button variant="ghost" size="sm" className="h-8 w-fit mb-4 -ml-2" asChild>
          <Link to="/profile/me">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to profile
          </Link>
        </Button>
        <h1 className="text-[15px] font-semibold mb-1">Edit profile</h1>
        <p className="text-[12px] text-muted-foreground mb-6">
          Update how you appear on your public profile. Avatar and banner cosmetics are in{" "}
          <Link to="/settings?tab=appearance" className="text-primary underline">
            Settings → Appearance
          </Link>
          .
        </p>

        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[12px]">Display name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-[13px]" maxLength={80} required />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Profile URL slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-name"
              className="h-9 text-[13px] font-mono"
              maxLength={48}
            />
            <p className="text-[11px] text-muted-foreground">
              Others can open your public profile at /profile/[your-slug] (or from the leaderboard). Letters, numbers, dashes only.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} className="min-h-[140px] text-[13px]" placeholder="Tell visitors about your content" />
            <p className="text-[11px] text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2 text-[12px]">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Account</p>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-[11px] truncate max-w-[180px]">{user?.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving} className="h-9 text-[13px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
            <Button type="button" variant="outline" className="h-9 text-[13px]" asChild>
              <Link to="/settings?tab=appearance">Appearance</Link>
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default CreatorProfileEditInner;
