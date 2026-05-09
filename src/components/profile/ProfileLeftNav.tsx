import { cn } from "@/lib/utils";

type PanelType = "overview" | "stats" | "campaigns" | "submissions" | "achievements" | "cosmetics" | "honor" | "saved";

interface ProfileLeftNavProps {
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;
  isOwnProfile: boolean;
}

const navItems: Array<{ id: PanelType; label: string; ownProfileOnly?: boolean }> = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "campaigns", label: "Campaigns" },
  { id: "submissions", label: "Submissions" },
  { id: "achievements", label: "Achievements" },
  { id: "cosmetics", label: "Cosmetics", ownProfileOnly: true },
  { id: "honor", label: "Honor Score" },
  { id: "saved", label: "Saved" },
];

export function ProfileLeftNav({ activePanel, setActivePanel, isOwnProfile }: ProfileLeftNavProps) {
  return (
    <nav className="bg-slate-900/50 rounded-lg border border-slate-800 p-2 space-y-1 md:space-y-0 md:flex md:flex-wrap md:gap-1">
      {navItems.map((item) => {
        if (item.ownProfileOnly && !isOwnProfile) {
          return null;
        }
        return (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={cn(
              "w-full md:flex-1 md:min-w-fit text-left px-3 py-2 rounded text-sm font-medium transition-colors",
              activePanel === item.id
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
