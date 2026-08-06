import { LayoutDashboard, Plus, BarChart3, Settings, LogOut, Users, Megaphone, FileCheck, Wallet, Share2, Briefcase, Building2, Sparkles, ListChecks, Trophy, Medal, LifeBuoy, Ticket, Palette, Contact, FlaskConical, Gift } from "lucide-react";
import { StackedLogo } from "./StackedLogo";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type NavItem = { icon: any; label: string; path: string };

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Overview", path: "/admin" },
    { icon: Building2, label: "Brands", path: "/admin/brands" },
    { icon: Megaphone, label: "Campaigns", path: "/admin/campaigns" },
    { icon: FileCheck, label: "Submissions", path: "/admin/submissions" },
    { icon: FileCheck, label: "Rules Manager", path: "/admin/rules" },
    { icon: Medal, label: "Leaderboard badges", path: "/admin/badges" },
    { icon: Wallet, label: "Withdrawals", path: "/admin/withdrawals" },
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Contact, label: "Creator profiles", path: "/admin/creator-profiles" },
    { icon: Gift, label: "Rewards & verification", path: "/admin/rewards" },
    { icon: FlaskConical, label: "Automation Lab", path: "/admin/automation-lab" },
    { icon: Ticket, label: "Tickets", path: "/admin/tickets" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  brand: [
    { icon: LayoutDashboard, label: "Overview", path: "/brand" },
    { icon: Megaphone, label: "Campaigns", path: "/brand/campaigns" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  creator: [
    { icon: Sparkles, label: "Explore", path: "/discover" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
    { icon: ListChecks, label: "Submissions", path: "/activity" },
    { icon: LifeBuoy, label: "Support", path: "/support" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: Briefcase, label: "Socials", path: "/accounts" },
    { icon: Users, label: "My Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  user: [
    { icon: Sparkles, label: "Explore", path: "/discover" },
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
    { icon: LifeBuoy, label: "Support", path: "/support" },
    { icon: Users, label: "My Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
};

export function SidebarContent({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  const items = NAV_BY_ROLE[role ?? "creator"];

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <div className="flex items-center gap-2 px-3 h-11 border-b border-sidebar-border">
        <StackedLogo size={16} color="currentColor" />
        {!collapsed && (
          <span className="font-bold uppercase tracking-[0.08em] text-[14px] text-sidebar-accent-foreground">
            iClips
          </span>
        )}
      </div>

      <nav className="flex-1 py-1.5 px-1.5 space-y-px overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path + "/")) ||
            location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-[13px] transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2 px-1">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-[9px] leading-none">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[12px] text-sidebar-foreground truncate">
                {profile?.full_name || "User"}
              </span>
              {role && <span className="text-[10px] text-muted-foreground capitalize">{role}</span>}
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent h-6 w-6">
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 w-52">
      <div className="flex flex-col flex-1 overflow-hidden">
        <SidebarContent />
      </div>
    </aside>
  );
}

// Backward compat for existing imports (mirror creator nav)
export const navItems = NAV_BY_ROLE.creator;
