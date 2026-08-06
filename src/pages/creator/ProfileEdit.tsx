import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera } from "lucide-react";

export default function CreatorProfileEdit() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const username = profile?.profile_slug ?? "";

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Could not load profile", description: error.message, variant: "destructive" });
      } else if (data) {
        setFullName(data.full_name ?? "");
        setBio((data as { bio?: string }).bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
      setLoading(false);
    })();
  }, [user, toast]);

  const onPickFile = async (file: File | undefined) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Pick an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Photo updated" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || "Creator",
          bio: bio.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Profile saved" });
      navigate("/profile");
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || username || "?").trim().charAt(0).toUpperCase();

  return (
    <CreatorShell>
      <PageContainer className="max-w-[560px]">
        <DetailHeader title="Edit profile" onBack={() => navigate("/profile")} />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={(e) => void save(e)} className="space-y-4 pb-8">
            <div className="surface-card flex flex-col items-center gap-3 p-6">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="press-scale focus-ring relative rounded-full"
                aria-label="Change profile photo"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-[32px] font-semibold text-primary-foreground">
                    {initial}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-surface-raised">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
              <p className="text-[13px] text-muted-foreground">Tap the photo to upload a new one</p>
            </div>

            <div className="surface-card space-y-4 p-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Username</label>
                <div className="flex h-12 items-center rounded-2xl border border-border/60 bg-surface-raised px-4 text-[15px] text-muted-foreground">
                  @{username || "—"}
                </div>
                <p className="text-[12px] text-muted-foreground">Usernames are permanent and can’t be changed.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Display name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  required
                  className="focus-ring h-12 w-full rounded-2xl border border-border/60 bg-surface-raised px-4 text-[15px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-muted-foreground">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="Tell visitors about your content"
                  className="focus-ring min-h-[132px] w-full rounded-2xl border border-border/60 bg-surface-raised px-4 py-3 text-[15px]"
                />
                <p className="text-right text-[12px] text-muted-foreground">{bio.length}/500</p>
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary-pill">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
            <Link to="/settings?tab=appearance" className="btn-outline-pill">
              Appearance &amp; cosmetics
            </Link>
          </form>
        )}
      </PageContainer>
    </CreatorShell>
  );
}
