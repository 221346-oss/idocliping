import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  BarChart3, 
  Target, 
  Send, 
  Trophy, 
  Palette, 
  ShieldCheck, 
  Bookmark 
} from "lucide-react";

type PanelType = "overview" | "stats" | "campaigns" | "submissions" | "achievements" | "cosmetics" | "honor" | "saved";

interface ProfileLeftNavProps {
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;
  isOwnProfile: boolean;
}

const navItems: Array<{ id: PanelType; label: string; icon: any; ownProfileOnly?: boolean }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "campaigns", label: "Campaigns", icon: Target },
  { id: "submissions", label: "Submissions", icon: Send },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "cosmetics", label: "Cosmetics", icon: Palette, ownProfileOnly: true },
  { id: "honor", label: "Honor Score", icon: ShieldCheck },
  { id: "saved", label: "Saved", icon: Bookmark, ownProfileOnly: true },
];

export function ProfileLeftNav({ activePanel, setActivePanel, isOwnProfile }: ProfileLeftNavProps) {
  return (
    <div className="flex flex-col items-stretch w-full bg-transparent h-auto p-1.5 gap-px">
      {navItems.map((item) => {
        if (item.ownProfileOnly && !isOwnProfile) return null;
        const Icon = item.icon;
        const isActive = activePanel === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={cn(
              "flex items-center justify-start gap-1.5 text-[12px] h-7 px-2 w-full transition-colors rounded-sm",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
