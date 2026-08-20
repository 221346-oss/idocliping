import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Pencil,
  ChevronRight,
  ArrowUpRight,
  Link2,
  UserPlus,
  Languages,
  Moon,
  Bell,
  HelpCircle,
  BookOpen,
  LifeBuoy,
  FileText,
  ShieldCheck,
  Ban,
  KeyRound,
  LogOut,
  UserX,
} from "lucide-react";
import type { ProfileViewModel } from "@/hooks/usePublicProfile";
import { useAuth } from "@/contexts/AuthContext";
import { formatViewCount } from "@/lib/format-views";
import { formatCurrencySimple } from "@/lib/format-currency";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { APP_NAME, APP_VERSION } from "@/lib/brand";
import { REFERRAL_RATE_LABEL } from "@/lib/referral";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function Row({
  icon: Icon,
  label,
  value,
  to,
  href,
  onClick,
  tone = "default",
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  highlight?: boolean;
}) {
  const inner = (
    <>
      <span className={cn("list-row-icon", tone === "danger" ? "text-destructive" : "text-[#9a9a9a]")}> 
        <Icon className="h-[18px] w-[18px] stroke-[1.6]" />
      </span>
      <span className={cn("truncate text-[14.5px] font-normal", tone === "danger" ? "text-destructive" : "text-white")}>{label}</span>
      {value ? <span className="list-row-value">{value}</span> : null}
      {href ? (
        <ArrowUpRight className={cn("h-[17px] w-[17px] shrink-0 text-[#828282]", !value && "ml-auto")} />
      ) : (
        <ChevronRight className={cn("h-[19px] w-[19px] shrink-0 text-[#828282] stroke-[1.6]", !value && "ml-auto")} />
      )}
    </>
  );

  const cls = cn("list-row", highlight && "bg-foreground text-background hover:bg-foreground/90");

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function AccountProfileView({ profile }: { profile: ProfileViewModel }) {
  const { user, signOut, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);

  const initial = (profile.displayName || profile.usernameLabel.replace("@", "") || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const memberSince = profile.joinedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const cycleTheme = () => setTheme(theme === "system" ? "dark" : theme === "dark" ? "light" : "system");

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      setAvatarUrl(data.publicUrl);
      toast({ title: "Profile picture updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Try again";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const stats = [
    { label: "Money earned", value: formatCurrencySimple(profile.totalEarnings) },
    { label: "Total videos", value: String(profile.statistics.totalSubmissions) },
    { label: "Total views", value: formatViewCount(profile.statistics.totalViews) },
  ];

  return (
    <div className="w-full min-w-0 space-y-2.5 pb-6">
      <div className="relative mt-11">
        <div className="absolute -top-11 left-1/2 z-10 -translate-x-1/2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-[82px] w-[82px] rounded-full border-[3px] border-background object-cover shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
            />
          ) : (
            <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full border-[3px] border-background bg-primary text-[30px] font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
              {initial}
            </div>
          )}
        </div>

        <div className="surface-card relative overflow-hidden px-4 pb-4 pt-12 text-center md:px-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
            className="icon-pill absolute right-3 top-3 h-8 w-8 border-white/[0.07] bg-white/[0.06]"
          >
            {uploading ? (
              <Loader2 className="h-[14px] w-[14px] animate-spin" />
            ) : (
              <Pencil className="h-[14px] w-[14px]" />
            )}
          </button>

          <h2 className="truncate font-display text-[19px] font-medium tracking-tight">{profile.usernameLabel}</h2>
          <p className="mt-0.5 text-[12.5px] text-[#828282]">Member since: {memberSince}</p>

          <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3.5">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="display-figure truncate text-[16px] font-medium">{s.value}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-[#828282]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="list-group">
        <Row icon={Link2} label="Connected accounts" to="/accounts" highlight />
      </div>

      <div className="list-group">
        <Row icon={UserPlus} label="Referrals" value={`Earn ${REFERRAL_RATE_LABEL}`} to="/referrals" />
      </div>

      <div className="list-group">
        <Row icon={Languages} label="Language" value="English" to="/settings/language" />
        <Row icon={Moon} label="Theme" value={themeLabel} onClick={cycleTheme} />
        <Row icon={Bell} label="Notifications" to="/settings/notifications" />
      </div>

      <div className="list-group">
        <Row icon={HelpCircle} label="FAQ" to="/faq" />
        <Row icon={BookOpen} label="Resources" to="/resources" />
        <Row icon={LifeBuoy} label="Support" to="/support/new" />
      </div>

      <div className="list-group">
        <Row icon={FileText} label="Creators Terms of Use" to="/legal/terms" />
        <Row icon={ShieldCheck} label="Privacy Policy" to="/legal/privacy" />
        <Row icon={Ban} label="Do Not Sell My Data" to="/legal/do-not-sell" />
      </div>

      <div className="list-group">
        <Row icon={KeyRound} label="Login methods" to="/settings/login-methods" />
      </div>

      <div className="list-group">
        <Row
          icon={LogOut}
          label="Logout"
          onClick={() => {
            void signOut().then(() => navigate("/auth", { replace: true }));
          }}
        />
      </div>

      {role !== "admin" && (
        <div className="list-group">
          <Row icon={UserX} label="Delete account" tone="danger" onClick={() => setDeleteOpen(true)} />
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your profile, linked accounts and submission history. You can't do this while you
              have pending earnings or a withdrawal in progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep account</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                setDeleting(true);
                const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
                setDeleting(false);
                const err = error?.message ?? (data as { error?: string } | null)?.error;
                if (err) {
                  return toast({ title: "Couldn't delete account", description: err, variant: "destructive" });
                }
                await signOut();
                navigate("/auth", { replace: true });
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col items-center gap-1 pt-4">
        <BrandLogo size={28} />
        <p className="text-[14px] font-semibold">{APP_NAME}</p>
        <p className="text-[12px] text-muted-foreground">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}
