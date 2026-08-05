import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
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
import { StackedLogo } from "@/components/StackedLogo";
import { cn } from "@/lib/utils";

const APP_VERSION = "0.2.49";

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
      <span className={cn("list-row-icon", tone === "danger" && "text-destructive")}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={cn("truncate", tone === "danger" && "text-destructive")}>{label}</span>
      {value ? <span className="list-row-value">{value}</span> : null}
      {href ? (
        <ArrowUpRight className={cn("h-[18px] w-[18px] shrink-0 text-muted-foreground", !value && "ml-auto")} />
      ) : (
        <ChevronRight className={cn("h-[18px] w-[18px] shrink-0 text-muted-foreground", !value && "ml-auto")} />
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
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

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

  const stats = [
    { label: "Money earned", value: formatCurrencySimple(profile.totalEarnings) },
    { label: "Total videos", value: String(profile.statistics.totalSubmissions) },
    { label: "Total views", value: formatViewCount(profile.statistics.totalViews) },
  ];

  return (
    <div className="w-full min-w-0 space-y-3 pb-6">
      {/* Identity card with overlapping avatar */}
      <div className="relative mt-10">
        <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-20 w-20 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-primary text-[28px] font-semibold text-primary-foreground">
              {initial}
            </div>
          )}
        </div>

        <div className="surface-card px-5 pb-5 pt-12 text-center">
          <Link
            to="/creator/profile/edit"
            aria-label="Edit profile"
            className="icon-pill absolute right-3 top-3 h-9 w-9"
          >
            <Pencil className="h-[15px] w-[15px]" />
          </Link>

          <h2 className="truncate font-display text-[22px] font-semibold tracking-tight">{profile.usernameLabel}</h2>
          <p className="mt-0.5 text-[14px] text-muted-foreground">Member since: {memberSince}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="display-figure truncate text-[17px]">{s.value}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="list-group">
        <Row icon={Link2} label="Connected accounts" to="/creator/social" highlight />
      </div>

      <div className="list-group">
        <Row icon={UserPlus} label="Referrals" value="Earn 10%" to="/creator/referrals" />
      </div>

      <div className="list-group">
        <Row icon={Languages} label="Language" value="English" to="/settings" />
        <Row icon={Moon} label="Theme" value={themeLabel} onClick={cycleTheme} />
        <Row icon={Bell} label="Notifications" to="/settings" />
      </div>

      <div className="list-group">
        <Row icon={HelpCircle} label="FAQ" to="/creator/support" />
        <Row icon={BookOpen} label="Resources" to="/creator/support" />
        <Row icon={LifeBuoy} label="Support" to="/creator/support/new" />
      </div>

      <div className="list-group">
        <Row icon={FileText} label="Creators Terms of Use" href="/" />
        <Row icon={ShieldCheck} label="Privacy Policy" href="/" />
        <Row icon={Ban} label="Do Not Sell My Data" href="/" />
      </div>

      <div className="list-group">
        <Row icon={KeyRound} label="Login methods" to="/settings" />
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

      <div className="list-group">
        <Row icon={UserX} label="Delete" tone="danger" to="/creator/support/new" />
      </div>

      <div className="flex flex-col items-center gap-1 pt-4">
        <StackedLogo size={22} />
        <p className="text-[14px] font-semibold">Clipper</p>
        <p className="text-[12px] text-muted-foreground">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}
