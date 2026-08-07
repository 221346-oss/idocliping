import { useNavigate } from "react-router-dom";
import { CreatorShell, PageContainer, DetailHeader } from "@/components/shell/CreatorShell";
import { BookOpen, Link2, ShieldCheck, Trophy, Wallet, Compass } from "lucide-react";

const RESOURCES = [
  {
    icon: Compass,
    title: "Getting started",
    body: "Verify a social account, pick a live campaign in Discover, and submit your first clip link.",
    to: "/discover",
  },
  {
    icon: Link2,
    title: "Connect your accounts",
    body: "Add the iclips code to your bio and we verify your profile automatically.",
    to: "/accounts",
  },
  {
    icon: ShieldCheck,
    title: "Content rules",
    body: "No bought engagement, no re-uploads of other creators' work, follow each campaign's parameters.",
    to: "/legal/terms",
  },
  {
    icon: Wallet,
    title: "Payouts explained",
    body: "Eligible earnings stay pending until the campaign is paid out, then they are withdrawable.",
    to: "/wallet",
  },
  {
    icon: Trophy,
    title: "Leaderboard & rewards",
    body: "Weekly rewards go to the top creators by views and earnings.",
    to: "/rewards",
  },
  {
    icon: BookOpen,
    title: "FAQ",
    body: "Answers to the questions creators ask us most.",
    to: "/faq",
  },
];

export default function ResourcesPage() {
  const navigate = useNavigate();
  return (
    <CreatorShell>
      <PageContainer>
        <DetailHeader title="Resources" onBack={() => navigate("/profile")} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RESOURCES.map((r) => (
            <button
              key={r.title}
              type="button"
              onClick={() => navigate(r.to)}
              className="surface-card press-scale focus-ring p-4 text-left"
            >
              <span className="list-row-icon">
                <r.icon className="h-[18px] w-[18px]" />
              </span>
              <h2 className="mt-3 text-[14.5px] font-semibold">{r.title}</h2>
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{r.body}</p>
            </button>
          ))}
        </div>
      </PageContainer>
    </CreatorShell>
  );
}
