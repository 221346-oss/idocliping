import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CreatorShell, PageContainer, PageTitle } from "@/components/shell/CreatorShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  User, Users, Settings as SettingsIcon,
  Mail, Trash2, Shield, Send, Loader2, Camera
} from "lucide-react";
import { isInternalNoSendEmail } from "@/lib/internal-email";


// ─── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Avatar must be under 5 MB.", variant: "destructive" });
      return;
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif"];
    const fileExt = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      toast({ title: "Invalid file extension", description: "Please upload a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) toast({ title: "Error", description: updateError.message, variant: "destructive" });
    else { toast({ title: "Avatar updated" }); await refreshProfile(); }
  };

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setJobTitle(profile.job_title || ""); }
  }, [profile]);

  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, job_title: jobTitle }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated" }); await refreshProfile(); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated" }); setNewPassword(""); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Profile Information</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative group">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || ""} className="object-contain" />
              <AvatarFallback className="text-[12px]">{initials || "?"}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Camera className="h-3.5 w-3.5 text-white" />}
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
          </div>
          <div>
            <p className="text-[13px] font-medium">{fullName || "Your Name"}</p>
            <p className="text-[12px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <div className="space-y-1">
            <Label className="text-[12px]">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="h-8 text-[13px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer" className="h-8 text-[13px]" />
          </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="h-7 text-[12px] mt-3">
          {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Save
        </Button>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Change Password</p>
        <div className="max-w-xs space-y-1">
          <Label className="text-[12px]">New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-8 text-[13px]" />
        </div>
        <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" size="sm" className="h-7 text-[12px] mt-3">
          {changingPassword && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Update Password
        </Button>
      </div>
    </div>
  );
}

// ─── Team Tab ───────────────────────────────────────────────────────────────────

function TeamTab() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    const [teamRes, invitationsRes] = await Promise.all([
      supabase.rpc("get_team_members"),
      supabase.from("invitations").select("*").eq("status", "pending"),
    ]);
    setMembers(teamRes.data || []);
    setInvitations(invitationsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async () => {
    if (!user || !inviteEmail) return;
    if (isInternalNoSendEmail(inviteEmail.trim())) {
      toast({
        title: "Cannot invite internal address",
        description: `${inviteEmail.trim()} is reserved for simulated creators.`,
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("invitations").insert({ email: inviteEmail, role: inviteRole as any, invited_by: user.id });
    setSending(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Invitation sent", description: `Invited ${inviteEmail}` }); setInviteEmail(""); fetchData(); }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("invitations").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Invitation revoked" }); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Invite Team Member</p>
        <div className="flex gap-2 max-w-lg">
          <Input placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-8 text-[13px] flex-1" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-[100px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="moderator">Moderator</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={sending || !inviteEmail} size="sm" className="h-8 text-[12px] gap-1">
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Invite
          </Button>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="px-4 md:px-6 py-4">
          <p className="text-[12px] text-muted-foreground font-medium mb-3">Pending Invitations</p>
          <div className="space-y-1">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[13px]">{inv.email}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">{inv.role}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.id)} className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Team Members · {members.length}</p>
        <div className="space-y-1">
          {members.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={m.avatar_url || ""} />
                  <AvatarFallback className="text-2xs">{(m.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-medium">{m.full_name || "Unnamed"}</span>
                <span className="text-[12px] text-muted-foreground">{m.job_title || ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
                  <Shield className="h-2.5 w-2.5" />{m.role}
                </Badge>
                {m.user_id === user?.id && <Badge variant="secondary" className="text-[10px] h-4 px-1">You</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── General Tab ────────────────────────────────────────────────────────────────

function GeneralTab() {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") return document.documentElement.classList.contains("dark") ? "dark" : "light";
    return "dark";
  });

  const toggleTheme = (value: string) => {
    setThemeState(value);
    if (value === "dark") { document.documentElement.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Appearance</p>
        <div className="flex items-center justify-between max-w-lg">
          <span className="text-[13px]">Theme</span>
          <Select value={theme} onValueChange={toggleTheme}>
            <SelectTrigger className="w-[100px] h-7 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-muted-foreground font-medium mb-3">Defaults</p>
        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <div className="space-y-1"><Label className="text-[12px]">Default Severity</Label>
            <Select defaultValue="medium"><SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[12px]">Default Environment</Label>
            <Select defaultValue="production"><SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="production">Production</SelectItem><SelectItem value="staging">Staging</SelectItem><SelectItem value="development">Development</SelectItem><SelectItem value="qa">QA</SelectItem></SelectContent></Select></div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <p className="text-[12px] text-destructive font-medium mb-3">Danger Zone</p>
        <div className="flex items-center justify-between max-w-lg border border-destructive/20 rounded-md p-3">
          <div>
            <p className="text-[13px] font-medium">Delete Account</p>
            <p className="text-[12px] text-muted-foreground">Permanently delete your account and all data.</p>
          </div>
          <Button variant="destructive" size="sm" disabled className="h-7 text-[12px]">Coming Soon</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ─────────────────────────────────────────────────────────

const SETTINGS_TABS = ["profile", "team", "general"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo((): SettingsTab => {
    const raw = searchParams.get("tab");
    if (raw && (SETTINGS_TABS as readonly string[]).includes(raw)) return raw as SettingsTab;
    return "profile";
  }, [searchParams]);

  const onTabChange = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === "profile") next.delete("tab");
          else next.set("tab", value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <CreatorShell>
      <PageContainer className="pb-12">
        <PageTitle>Settings</PageTitle>

        <div>
          <Tabs value={tab} onValueChange={onTabChange} className="flex flex-col gap-4 md:flex-row">
            <div className="-mx-4 shrink-0 overflow-x-auto px-4 md:mx-0 md:w-48 md:overflow-visible md:px-0">
              <TabsList className="flex w-max min-w-full items-stretch gap-1 bg-transparent p-0 md:w-full md:flex-col">
                <TabsTrigger value="profile" className="justify-start gap-2 rounded-full px-4 text-[13px] h-10 shrink-0 data-[state=active]:bg-primary/15 data-[state=active]:text-primary md:w-full">
                  <User className="h-3.5 w-3.5" /> Profile
                </TabsTrigger>
                <TabsTrigger value="team" className="justify-start gap-2 rounded-full px-4 text-[13px] h-10 shrink-0 data-[state=active]:bg-primary/15 data-[state=active]:text-primary md:w-full">
                  <Users className="h-3.5 w-3.5" /> Team
                </TabsTrigger>
                <TabsTrigger value="general" className="justify-start gap-2 rounded-full px-4 text-[13px] h-10 shrink-0 data-[state=active]:bg-primary/15 data-[state=active]:text-primary md:w-full">
                  <SettingsIcon className="h-3.5 w-3.5" /> General
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-w-0">
              <TabsContent value="profile" className="m-0"><ProfileTab /></TabsContent>
              <TabsContent value="team" className="m-0"><TeamTab /></TabsContent>
              <TabsContent value="general" className="m-0"><GeneralTab /></TabsContent>
            </div>
          </Tabs>
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
